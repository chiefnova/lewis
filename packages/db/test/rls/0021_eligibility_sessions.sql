-- 0021_eligibility_sessions.sql
--
-- Asserts the eligibility_sessions security posture from migration 0021:
--
--   1. directory_anonymous has NO direct SELECT/INSERT path on
--      eligibility_sessions — attempts return zero rows / raise
--      permission denied.
--   2. The four SECURITY DEFINER helpers exist with the right grants:
--      - directory_eligibility_start         → app_api
--      - directory_eligibility_append_answer → app_api
--      - directory_eligibility_complete      → app_api
--      - directory_eligibility_resume        → app_api
--      All revoked from PUBLIC.
--   3. Start mints a session for a published program; returns 0 rows for
--      unknown / unpublished programs (closing the discovery oracle).
--   4. Append-answer merges into the answers JSONB and only operates on
--      in_progress sessions.
--   5. Complete records pass/fail + the failed_criterion text used by
--      the § 17.4 fail-branch UI; subsequent calls return false
--      (idempotent).
--   6. Complete enforces the CHECK invariant in the function body:
--      passed=true with a failed_criterion raises P0001; passed=false
--      without a failed_criterion raises P0001.
--   7. Resume returns the session state for non-expired sessions; an
--      expired or unknown token resolves to 0 rows.
--   8. Stale tenant context does not break the anonymous-empty
--      assertion.

begin;

select plan(24);

-- ---------------------------------------------------------------------------
-- 1. Helper existence + grant posture.
-- ---------------------------------------------------------------------------

select ok(
  to_regprocedure('app.directory_eligibility_start(text,inet,text)') is not null,
  'directory_eligibility_start helper exists'
);

select ok(
  to_regprocedure('app.directory_eligibility_append_answer(uuid,text,text)') is not null,
  'directory_eligibility_append_answer helper exists'
);

select ok(
  to_regprocedure('app.directory_eligibility_complete(uuid,boolean,text)') is not null,
  'directory_eligibility_complete helper exists'
);

select ok(
  to_regprocedure('app.directory_eligibility_resume(uuid)') is not null,
  'directory_eligibility_resume helper exists'
);

select ok(
  has_function_privilege('app_api', 'app.directory_eligibility_start(text,inet,text)', 'EXECUTE'),
  'app_api can execute directory_eligibility_start'
);

select ok(
  has_function_privilege('app_api', 'app.directory_eligibility_complete(uuid,boolean,text)', 'EXECUTE'),
  'app_api can execute directory_eligibility_complete'
);

select is_empty(
  $$ select 1
       from information_schema.routine_privileges
      where routine_schema = 'app'
        and routine_name in (
          'directory_eligibility_start',
          'directory_eligibility_append_answer',
          'directory_eligibility_complete',
          'directory_eligibility_resume'
        )
        and grantee = 'PUBLIC'
        and privilege_type = 'EXECUTE' $$,
  'no eligibility helper is granted through PUBLIC'
);

-- ---------------------------------------------------------------------------
-- 2. Direct anonymous SELECT/INSERT path is closed.
-- ---------------------------------------------------------------------------

set local role app_api;
select set_config('app.role', 'directory_anonymous', true);

select is_empty(
  $$ select 1 from eligibility_sessions $$,
  'anonymous: cannot SELECT eligibility_sessions'
);

prepare es_anon_direct_insert as
  insert into eligibility_sessions (program_id)
  values ('b0000000-0000-0000-0000-000000000001'::uuid);

select throws_ok(
  'execute es_anon_direct_insert',
  '42501',  -- insufficient_privilege
  null,
  'anonymous: direct INSERT on eligibility_sessions is permission-denied'
);

-- ---------------------------------------------------------------------------
-- 3. directory_eligibility_start: published program mints; unknown returns 0 rows.
-- ---------------------------------------------------------------------------

do $do$
declare
  v_token uuid;
begin
  select token into v_token
  from app.directory_eligibility_start(
    'wst-057',
    '127.0.0.1'::inet,
    'tap-test'
  );
  perform set_config('app.test_eligibility_token', v_token::text, true);
end;
$do$;

select ok(
  current_setting('app.test_eligibility_token', true) is not null
    and length(current_setting('app.test_eligibility_token', true)) > 0,
  'anonymous: start returns a token for published wst-057'
);

select is_empty(
  $$ select token from app.directory_eligibility_start(
       'never-published',
       '127.0.0.1'::inet,
       'tap-test'
     ) $$,
  'anonymous: start returns 0 rows for unknown slug (no discovery oracle)'
);

-- ---------------------------------------------------------------------------
-- 4. Append answer merges into the JSONB.
-- ---------------------------------------------------------------------------

select is(
  app.directory_eligibility_append_answer(
    current_setting('app.test_eligibility_token')::uuid,
    'age_18_plus',
    'yes'
  ),
  true,
  'anonymous: first append_answer returns true'
);

select is(
  app.directory_eligibility_append_answer(
    current_setting('app.test_eligibility_token')::uuid,
    'diagnosis_confirmed',
    'no'
  ),
  true,
  'anonymous: second append_answer (different question) returns true'
);

-- Append against an unknown token returns false (no-op).
select is(
  app.directory_eligibility_append_answer(
    '00000000-0000-0000-0000-000000000000'::uuid,
    'foo',
    'bar'
  ),
  false,
  'anonymous: append_answer with unknown token returns false'
);

-- ---------------------------------------------------------------------------
-- 5. Complete with the failed-criterion shape from § 17.4.
-- ---------------------------------------------------------------------------

select is(
  app.directory_eligibility_complete(
    current_setting('app.test_eligibility_token')::uuid,
    false,
    'The program requires a confirmed diabetic peripheral neuropathy diagnosis from a treating physician.'
  ),
  true,
  'anonymous: complete with failed_criterion flips status to failed'
);

-- Idempotent: second complete is a no-op.
select is(
  app.directory_eligibility_complete(
    current_setting('app.test_eligibility_token')::uuid,
    true,
    null
  ),
  false,
  'anonymous: second complete on the same token is a no-op'
);

-- After complete, append_answer should also no-op (only in_progress allowed).
select is(
  app.directory_eligibility_append_answer(
    current_setting('app.test_eligibility_token')::uuid,
    'late_arrival',
    'yes'
  ),
  false,
  'anonymous: append_answer after complete is a no-op'
);

-- ---------------------------------------------------------------------------
-- 6. Complete invariant enforcement.
-- ---------------------------------------------------------------------------

-- Pass-but-with-criterion → error.
do $do$
declare
  v_token uuid;
begin
  select token into v_token
  from app.directory_eligibility_start(
    'wst-057',
    '127.0.0.1'::inet,
    'tap-test'
  );
  perform set_config('app.test_invariant_token', v_token::text, true);
end;
$do$;

prepare es_bad_complete_pass_with_reason as
  select app.directory_eligibility_complete(
    current_setting('app.test_invariant_token')::uuid,
    true,
    'must be null but is not'
  );

select throws_ok(
  'execute es_bad_complete_pass_with_reason',
  'P0001',
  null,
  'anonymous: complete(passed=true, criterion=...) raises P0001'
);

-- Fail-without-criterion → error.
prepare es_bad_complete_fail_no_reason as
  select app.directory_eligibility_complete(
    current_setting('app.test_invariant_token')::uuid,
    false,
    null
  );

select throws_ok(
  'execute es_bad_complete_fail_no_reason',
  'P0001',
  null,
  'anonymous: complete(passed=false, criterion=null) raises P0001'
);

-- ---------------------------------------------------------------------------
-- 7. Resume returns the session state.
-- ---------------------------------------------------------------------------

select is(
  (select status
   from app.directory_eligibility_resume(
     current_setting('app.test_eligibility_token')::uuid
   )),
  'failed',
  'anonymous: resume returns the completed status'
);

select is(
  (select failed_criterion
   from app.directory_eligibility_resume(
     current_setting('app.test_eligibility_token')::uuid
   )),
  'The program requires a confirmed diabetic peripheral neuropathy diagnosis from a treating physician.',
  'anonymous: resume surfaces the failed_criterion'
);

-- Unknown token → 0 rows.
select is_empty(
  $$ select 1 from app.directory_eligibility_resume(
       '00000000-0000-0000-0000-000000000000'::uuid
     ) $$,
  'anonymous: resume with unknown token returns 0 rows'
);

-- ---------------------------------------------------------------------------
-- 7b. Expired session: append / complete / resume all no-op.
--     All three helpers gate on `expires_at > now()`; an expired session
--     must behave identically to an unknown token so a stale localStorage
--     pointer can't mutate or read a session past its 30-day server expiry.
-- ---------------------------------------------------------------------------

do $do$
declare
  v_token uuid;
begin
  select token into v_token
  from app.directory_eligibility_start(
    'wst-057', '127.0.0.1'::inet, 'tap-test'
  );
  perform set_config('app.test_expired_token', v_token::text, true);
end;
$do$;

-- Push the session past its expiry (reset role bypasses RLS to simulate the
-- passage of time without waiting 30 days). created_at is backdated too so
-- the expires_at > created_at CHECK still holds for this aged row.
reset role;
update eligibility_sessions
set created_at = now() - interval '60 days',
    expires_at = now() - interval '1 day'
where token = current_setting('app.test_expired_token')::uuid;

set local role app_api;
select set_config('app.role', 'directory_anonymous', true);

select is(
  app.directory_eligibility_append_answer(
    current_setting('app.test_expired_token')::uuid, 'age_18_plus', 'yes'
  ),
  false,
  'expired: append_answer no-ops (returns false)'
);

select is(
  app.directory_eligibility_complete(
    current_setting('app.test_expired_token')::uuid, true, null
  ),
  false,
  'expired: complete no-ops (returns false)'
);

select is_empty(
  $$ select 1 from app.directory_eligibility_resume(
       current_setting('app.test_expired_token')::uuid
     ) $$,
  'expired: resume returns 0 rows (no read past expiry)'
);

-- ---------------------------------------------------------------------------
-- 8. Stale tenant context defense.
-- ---------------------------------------------------------------------------

select set_config('app.role', 'directory_anonymous', true);
select set_config('app.active_tenant_id', 'a0000000-0000-0000-0000-000000000001', true);
select set_config('app.user_id', '10000000-0000-0000-0000-000000000099', true);

select is_empty(
  $$ select 1 from eligibility_sessions $$,
  'stale-tenant: anonymous role still cannot SELECT eligibility_sessions'
);

-- ---------------------------------------------------------------------------
-- 9. Worker has a table-level SELECT grant (0011) but no SELECT policy, so a
--    direct read returns zero rows under FORCE RLS. This pins the invariant
--    that the worker's ONLY read path into the PII is the narrow
--    SECURITY DEFINER helper — a future policy granting worker SELECT would
--    fail this assertion.
-- ---------------------------------------------------------------------------

reset role;
set local role app_worker;
select set_config('app.role', 'lewis_worker', true);

select is_empty(
  $$ select 1 from eligibility_sessions $$,
  'worker: no direct SELECT on eligibility_sessions (helper-only read path)'
);

select * from finish();

rollback;
