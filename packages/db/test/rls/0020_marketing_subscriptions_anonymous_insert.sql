-- 0020_marketing_subscriptions_anonymous_insert.sql
--
-- Asserts the marketing_subscriptions security posture from migration 0020:
--
--   1. directory_anonymous has NO direct SELECT/INSERT/UPDATE/DELETE path —
--      attempts return zero rows / raise permission denied.
--   2. The four SECURITY DEFINER helpers exist with the right grants:
--      - directory_marketing_subscribe → app_api
--      - directory_marketing_confirm → app_api
--      - directory_marketing_unsubscribe → app_api
--      - directory_marketing_mark_sent → app_worker (NOT app_api)
--      All revoke from PUBLIC.
--   3. Subscribe is idempotent on duplicate email (returns existing token,
--      was_new = false).
--   4. Confirm flips status pending → confirmed exactly once; subsequent
--      calls return false.
--   5. Unsubscribe flips both pending and confirmed states, returns false on
--      already-unsubscribed.
--   6. Email is lowercased + trimmed before storage (case-insensitive
--      idempotency).
--   7. Invalid email regex raises invalid_email.
--   8. Invalid source raises invalid_source.

begin;

select plan(20);

-- ---------------------------------------------------------------------------
-- 1. Helper existence + grant posture.
-- ---------------------------------------------------------------------------

select ok(
  to_regprocedure('app.directory_marketing_subscribe(text,text,inet,text)') is not null,
  'directory_marketing_subscribe helper exists'
);

select ok(
  to_regprocedure('app.directory_marketing_confirm(uuid)') is not null,
  'directory_marketing_confirm helper exists'
);

select ok(
  to_regprocedure('app.directory_marketing_unsubscribe(uuid)') is not null,
  'directory_marketing_unsubscribe helper exists'
);

select ok(
  to_regprocedure('app.directory_marketing_mark_sent(uuid)') is not null,
  'directory_marketing_mark_sent helper exists'
);

select ok(
  has_function_privilege('app_api', 'app.directory_marketing_subscribe(text,text,inet,text)', 'EXECUTE'),
  'app_api can execute directory_marketing_subscribe'
);

select ok(
  has_function_privilege('app_worker', 'app.directory_marketing_mark_sent(uuid)', 'EXECUTE'),
  'app_worker can execute directory_marketing_mark_sent'
);

-- mark_sent is workers-only — app_api should NOT have execute.
select ok(
  not has_function_privilege('app_api', 'app.directory_marketing_mark_sent(uuid)', 'EXECUTE'),
  'app_api CANNOT execute directory_marketing_mark_sent (workers-only)'
);

select is_empty(
  $$ select 1
       from information_schema.routine_privileges
      where routine_schema = 'app'
        and routine_name in (
          'directory_marketing_subscribe',
          'directory_marketing_confirm',
          'directory_marketing_unsubscribe',
          'directory_marketing_mark_sent'
        )
        and grantee = 'PUBLIC'
        and privilege_type = 'EXECUTE' $$,
  'no marketing_subscriptions helper is granted through PUBLIC'
);

-- ---------------------------------------------------------------------------
-- 2. Direct anonymous SELECT/INSERT path is closed.
-- ---------------------------------------------------------------------------

set local role app_api;
select set_config('app.role', 'directory_anonymous', true);

-- Anonymous SELECT returns zero rows (no policy grants SELECT to
-- directory_anonymous).
select is_empty(
  $$ select 1 from marketing_subscriptions $$,
  'anonymous: cannot SELECT marketing_subscriptions'
);

-- Anonymous direct INSERT raises permission denied. Wrap in a sub-block so
-- the failure registers as a PASS for the assertion.
prepare anon_direct_insert as
  insert into marketing_subscriptions (email_lower, source)
  values ('direct@example.com', 'announcement_strip');

select throws_ok(
  'execute anon_direct_insert',
  '42501',  -- insufficient_privilege
  null,
  'anonymous: direct INSERT is permission-denied'
);

-- ---------------------------------------------------------------------------
-- 3. Subscribe via SECURITY DEFINER works (anonymous role can call function).
-- ---------------------------------------------------------------------------

select is(
  (select was_new
   from app.directory_marketing_subscribe(
     'tester@example.com',
     'announcement_strip',
     '127.0.0.1'::inet,
     'tap-test'
   )),
  true,
  'anonymous: first subscribe returns was_new = true'
);

-- Re-subscribe with the same email (different case) returns was_new = false
-- and the same token (idempotency + case-insensitivity).
select is(
  (select was_new
   from app.directory_marketing_subscribe(
     'TESTER@example.com',
     'announcement_strip',
     '127.0.0.1'::inet,
     'tap-test'
   )),
  false,
  'anonymous: case-different re-subscribe returns was_new = false'
);

-- ---------------------------------------------------------------------------
-- 4. Confirm + unsubscribe flow (still as anonymous role).
--
-- The subscribe helper returns BOTH tokens in a single SECURITY DEFINER
-- round-trip (directory_anonymous has no SELECT path on the underlying
-- table, so the API depends on this dual-return shape).
-- ---------------------------------------------------------------------------

do $do$
declare
  v_confirmation uuid;
  v_unsubscribe uuid;
begin
  select confirmation_token, unsubscribe_token
    into v_confirmation, v_unsubscribe
  from app.directory_marketing_subscribe(
    'tester@example.com',
    'announcement_strip',
    '127.0.0.1'::inet,
    'tap-test'
  );
  perform set_config('app.test_confirmation_token', v_confirmation::text, true);
  perform set_config('app.test_unsubscribe_token', v_unsubscribe::text, true);
end;
$do$;

select is(
  app.directory_marketing_confirm(current_setting('app.test_confirmation_token')::uuid),
  true,
  'anonymous: confirm flips pending → confirmed'
);

select is(
  app.directory_marketing_confirm(current_setting('app.test_confirmation_token')::uuid),
  false,
  'anonymous: second confirm is a no-op'
);

select is(
  app.directory_marketing_confirm('00000000-0000-0000-0000-000000000000'::uuid),
  false,
  'anonymous: confirm with unknown token returns false'
);

select is(
  app.directory_marketing_unsubscribe(current_setting('app.test_unsubscribe_token')::uuid),
  true,
  'anonymous: unsubscribe flips confirmed → unsubscribed'
);

select is(
  app.directory_marketing_unsubscribe(current_setting('app.test_unsubscribe_token')::uuid),
  false,
  'anonymous: second unsubscribe is a no-op'
);

-- ---------------------------------------------------------------------------
-- 5. Validation rejects bad input.
-- ---------------------------------------------------------------------------

prepare bad_email as
  select app.directory_marketing_subscribe(
    'not-an-email',
    'announcement_strip',
    '127.0.0.1'::inet,
    'tap-test'
  );

select throws_ok(
  'execute bad_email',
  'P0001',
  'invalid_email',
  'anonymous: invalid email raises invalid_email'
);

prepare bad_source as
  select app.directory_marketing_subscribe(
    'fresh@example.com',
    'not_a_real_source',
    '127.0.0.1'::inet,
    'tap-test'
  );

select throws_ok(
  'execute bad_source',
  'P0001',
  'invalid_source',
  'anonymous: invalid source raises invalid_source'
);

-- ---------------------------------------------------------------------------
-- 6. Stale tenant context defense — directory_anonymous reads still empty
--    even when app.user_id / app.active_tenant_id are set.
-- ---------------------------------------------------------------------------

select set_config('app.role', 'directory_anonymous', true);
select set_config('app.active_tenant_id', 'a0000000-0000-0000-0000-000000000001', true);
select set_config('app.user_id', '10000000-0000-0000-0000-000000000099', true);

select is_empty(
  $$ select 1 from marketing_subscriptions $$,
  'stale-tenant: anonymous role still cannot SELECT marketing_subscriptions'
);

-- ---------------------------------------------------------------------------
-- 7. Lowercase enforcement — re-fetch the seeded row and assert it stored
--    the lowercase form, not the uppercase variant.
-- ---------------------------------------------------------------------------

reset role;

select is(
  (select email_lower from marketing_subscriptions
    where email_lower = 'tester@example.com'),
  'tester@example.com',
  'lowercased email is the canonical key'
);

select is_empty(
  $$ select 1 from marketing_subscriptions
       where email_lower = 'TESTER@example.com' $$,
  'uppercase variant did NOT create a duplicate row'
);

select * from finish();

rollback;
