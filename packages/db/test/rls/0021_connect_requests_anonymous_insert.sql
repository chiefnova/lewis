-- 0021_connect_requests_anonymous_insert.sql
--
-- Asserts the connect_requests security posture from migration 0021:
--
--   1. directory_anonymous has NO direct SELECT/INSERT path on
--      connect_requests — attempts return zero rows / raise permission
--      denied. PII (patient name/email/phone) is admin-only.
--   2. The three SECURITY DEFINER helpers exist with the right grants:
--      - directory_connect_request_create   → app_api
--      - directory_connect_request_for_send → app_worker (NOT app_api)
--      - directory_connect_request_mark_sent → app_worker (NOT app_api)
--      All revoked from PUBLIC.
--   3. Create resolves a published program → offering ETC and inserts
--      a pending row. Optional eligibility token attaches when present.
--   4. Create rejects malformed email / empty name / unknown program /
--      program without an active PPA → offering ETC.
--   5. mark_sent stamps sent_at + status='sent' exactly once on pending
--      rows. Workers can read the row via for_send before stamping.
--   6. The fallback intake_email logic: if etcs.intake_email is null,
--      for_send still returns the row with the medical-director email
--      in fallback_email (the worker chooses between the two).
--   7. Stale tenant context does not break the anonymous-empty
--      assertion.

begin;

select plan(21);

-- ---------------------------------------------------------------------------
-- 1. Helper existence + grant posture.
-- ---------------------------------------------------------------------------

select ok(
  to_regprocedure('app.directory_connect_request_create(text,uuid,text,text,text,text,text,inet,text)') is not null,
  'directory_connect_request_create helper exists'
);

select ok(
  to_regprocedure('app.directory_connect_request_for_send(uuid)') is not null,
  'directory_connect_request_for_send helper exists'
);

select ok(
  to_regprocedure('app.directory_connect_request_mark_sent(uuid,text)') is not null,
  'directory_connect_request_mark_sent helper exists'
);

select ok(
  has_function_privilege(
    'app_api',
    'app.directory_connect_request_create(text,uuid,text,text,text,text,text,inet,text)',
    'EXECUTE'
  ),
  'app_api can execute directory_connect_request_create'
);

-- for_send + mark_sent are workers-only — app_api should NOT have execute.
select ok(
  has_function_privilege('app_worker', 'app.directory_connect_request_for_send(uuid)', 'EXECUTE'),
  'app_worker can execute directory_connect_request_for_send'
);

select ok(
  not has_function_privilege('app_api', 'app.directory_connect_request_for_send(uuid)', 'EXECUTE'),
  'app_api CANNOT execute directory_connect_request_for_send (workers-only)'
);

select ok(
  has_function_privilege('app_worker', 'app.directory_connect_request_mark_sent(uuid,text)', 'EXECUTE'),
  'app_worker can execute directory_connect_request_mark_sent'
);

select ok(
  not has_function_privilege('app_api', 'app.directory_connect_request_mark_sent(uuid,text)', 'EXECUTE'),
  'app_api CANNOT execute directory_connect_request_mark_sent (workers-only)'
);

select is_empty(
  $$ select 1
       from information_schema.routine_privileges
      where routine_schema = 'app'
        and routine_name in (
          'directory_connect_request_create',
          'directory_connect_request_for_send',
          'directory_connect_request_mark_sent'
        )
        and grantee = 'PUBLIC'
        and privilege_type = 'EXECUTE' $$,
  'no connect_requests helper is granted through PUBLIC'
);

-- ---------------------------------------------------------------------------
-- 2. Direct anonymous SELECT/INSERT path is closed.
-- ---------------------------------------------------------------------------

set local role app_api;
select set_config('app.role', 'directory_anonymous', true);

select is_empty(
  $$ select 1 from connect_requests $$,
  'anonymous: cannot SELECT connect_requests (admin-only)'
);

prepare cr_anon_direct_insert as
  insert into connect_requests (
    program_id, etc_id, patient_name, patient_email
  ) values (
    'b0000000-0000-0000-0000-000000000001'::uuid,
    'c0000000-0000-0000-0000-000000000001'::uuid,
    'Direct Insert', 'direct@example.com'
  );

select throws_ok(
  'execute cr_anon_direct_insert',
  '42501',  -- insufficient_privilege
  null,
  'anonymous: direct INSERT on connect_requests is permission-denied'
);

-- ---------------------------------------------------------------------------
-- 3. Create via SECURITY DEFINER works against the wst-057 + big-sky PPA.
-- ---------------------------------------------------------------------------

do $do$
declare
  v_id uuid;
begin
  v_id := app.directory_connect_request_create(
    'wst-057',
    null,                          -- no eligibility token
    'Test Patient',
    'patient@example.com',
    '+1 (406) 555-1212',
    'evenings preferred',
    'Asking about availability.',
    '127.0.0.1'::inet,
    'tap-test'
  );
  perform set_config('app.test_request_id', v_id::text, true);
end;
$do$;

select ok(
  current_setting('app.test_request_id', true) is not null
    and length(current_setting('app.test_request_id', true)) > 0,
  'anonymous: create returns an id for the wst-057 + big-sky offering'
);

-- ---------------------------------------------------------------------------
-- 4. Validation rejects bad input.
-- ---------------------------------------------------------------------------

prepare cr_bad_email as
  select app.directory_connect_request_create(
    'wst-057', null, 'OK Name', 'not-an-email',
    null, null, null, '127.0.0.1'::inet, 'tap-test'
  );

select throws_ok(
  'execute cr_bad_email',
  'P0001',
  'invalid_email',
  'anonymous: invalid email raises invalid_email'
);

prepare cr_bad_name as
  select app.directory_connect_request_create(
    'wst-057', null, '   ', 'ok@example.com',
    null, null, null, '127.0.0.1'::inet, 'tap-test'
  );

select throws_ok(
  'execute cr_bad_name',
  'P0001',
  'invalid_name',
  'anonymous: blank patient_name raises invalid_name'
);

prepare cr_unknown_program as
  select app.directory_connect_request_create(
    'never-published', null, 'OK Name', 'ok@example.com',
    null, null, null, '127.0.0.1'::inet, 'tap-test'
  );

select throws_ok(
  'execute cr_unknown_program',
  'P0001',
  'unknown_program',
  'anonymous: unknown / unpublished program raises unknown_program'
);

-- ---------------------------------------------------------------------------
-- 5. Optional eligibility_token attachment.
-- ---------------------------------------------------------------------------

-- Mint an eligibility token for wst-057 + use it on a second create.
do $do$
declare
  v_token uuid;
  v_request_id uuid;
begin
  select token into v_token
  from app.directory_eligibility_start(
    'wst-057', '127.0.0.1'::inet, 'tap-test'
  );

  v_request_id := app.directory_connect_request_create(
    'wst-057', v_token,
    'Eligible Patient',
    'eligible@example.com',
    null, null, null,
    '127.0.0.1'::inet, 'tap-test'
  );

  perform set_config('app.test_eligible_request_id', v_request_id::text, true);
end;
$do$;

-- Worker path: read the row through for_send. Switch from app_api/anonymous
-- to app_worker; the EXECUTE-denial for app_api is already proved by the
-- has_function_privilege assertion above.
reset role;
set local role app_worker;
select set_config('app.role', 'lewis_worker', true);

select is(
  (select intake_email
   from app.directory_connect_request_for_send(
     current_setting('app.test_eligible_request_id')::uuid
   )),
  'intake@bigskyetc.com',
  'worker: for_send returns the intake_email from migration 0021 backfill'
);

select is(
  (select eligibility_status
   from app.directory_connect_request_for_send(
     current_setting('app.test_eligible_request_id')::uuid
   )),
  'in_progress',
  'worker: for_send surfaces the linked eligibility session status'
);

-- ---------------------------------------------------------------------------
-- 6. mark_sent stamps once + is idempotent.
-- ---------------------------------------------------------------------------

select is(
  app.directory_connect_request_mark_sent(
    current_setting('app.test_request_id')::uuid,
    'resend-msg-12345'
  ),
  true,
  'worker: mark_sent on pending row returns true'
);

select is(
  app.directory_connect_request_mark_sent(
    current_setting('app.test_request_id')::uuid,
    'resend-msg-67890'
  ),
  false,
  'worker: second mark_sent on the same row is a no-op'
);

-- After mark_sent, for_send no longer returns the row (status filter is
-- 'pending'). Workers should only see un-sent rows.
select is_empty(
  $$ select 1 from app.directory_connect_request_for_send(
       current_setting('app.test_request_id')::uuid
     ) $$,
  'worker: for_send no longer returns rows that have been marked sent'
);

-- ---------------------------------------------------------------------------
-- 7. Fallback intake_email — temporarily null intake_email on big-sky and
--    confirm for_send still returns fallback_email so the worker has a
--    deliverable address.
-- ---------------------------------------------------------------------------

reset role;
update etcs set intake_email = null where directory_slug = 'big-sky';

-- Create a fresh pending request to verify the fallback path.
set local role app_api;
select set_config('app.role', 'directory_anonymous', true);

do $do$
declare
  v_id uuid;
begin
  v_id := app.directory_connect_request_create(
    'wst-057', null, 'Fallback Tester', 'fallback@example.com',
    null, null, null, '127.0.0.1'::inet, 'tap-test'
  );
  perform set_config('app.test_fallback_request_id', v_id::text, true);
end;
$do$;

reset role;
set local role app_worker;
select set_config('app.role', 'lewis_worker', true);

select is(
  (select intake_email
   from app.directory_connect_request_for_send(
     current_setting('app.test_fallback_request_id')::uuid
   )),
  null,
  'worker: for_send returns null intake_email when not set'
);

select is(
  (select fallback_email
   from app.directory_connect_request_for_send(
     current_setting('app.test_fallback_request_id')::uuid
   )),
  'medical.director@bigskyetc.com',
  'worker: for_send surfaces the medical-director clinical email as fallback'
);

-- ---------------------------------------------------------------------------
-- 8. Stale tenant context defense.
-- ---------------------------------------------------------------------------

reset role;
set local role app_api;
select set_config('app.role', 'directory_anonymous', true);
select set_config('app.active_tenant_id', 'a0000000-0000-0000-0000-000000000001', true);
select set_config('app.user_id', '10000000-0000-0000-0000-000000000099', true);

select is_empty(
  $$ select 1 from connect_requests $$,
  'stale-tenant: anonymous role still cannot SELECT connect_requests'
);

-- ---------------------------------------------------------------------------
-- 9. Worker read-path narrowing: app_worker has a table-level SELECT grant
--    (0011) but no SELECT policy, so a direct read returns zero rows under
--    FORCE RLS. The worker's ONLY path to the PII is the narrow for_send
--    helper; a future policy granting worker SELECT would fail this.
-- ---------------------------------------------------------------------------

reset role;
set local role app_worker;
select set_config('app.role', 'lewis_worker', true);

select is_empty(
  $$ select 1 from connect_requests $$,
  'worker: no direct SELECT on connect_requests (helper-only read path)'
);

-- ---------------------------------------------------------------------------
-- 10. Attach-guard negative branch: an EXPIRED eligibility token is silently
--     NOT attached (create still succeeds, eligibility_session_id stays
--     null). The same `expires_at > now()` + `program_id = v_program_id`
--     guard in directory_connect_request_create also blocks a token minted
--     for a different program; this exercises the lifecycle half without a
--     second published program in the fixture.
-- ---------------------------------------------------------------------------

reset role;
set local role app_api;
select set_config('app.role', 'directory_anonymous', true);

do $do$
declare
  v_token uuid;
begin
  select token into v_token
  from app.directory_eligibility_start('wst-057', '127.0.0.1'::inet, 'tap-test');
  perform set_config('app.test_expired_elig_token', v_token::text, true);
end;
$do$;

reset role;
update eligibility_sessions
set created_at = now() - interval '60 days',
    expires_at = now() - interval '1 day'
where token = current_setting('app.test_expired_elig_token')::uuid;

set local role app_api;
select set_config('app.role', 'directory_anonymous', true);

do $do$
declare
  v_id uuid;
begin
  v_id := app.directory_connect_request_create(
    'wst-057',
    current_setting('app.test_expired_elig_token')::uuid,
    'Stale Token Patient', 'stale@example.com',
    null, null, null, '127.0.0.1'::inet, 'tap-test'
  );
  perform set_config('app.test_stale_request_id', v_id::text, true);
end;
$do$;

reset role;
set local role app_worker;
select set_config('app.role', 'lewis_worker', true);

select is(
  (select eligibility_status
   from app.directory_connect_request_for_send(
     current_setting('app.test_stale_request_id')::uuid
   )),
  null,
  'create does NOT attach an expired eligibility token (eligibility_status null)'
);

select * from finish();

rollback;
