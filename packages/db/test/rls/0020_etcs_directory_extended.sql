-- 0020_etcs_directory_extended.sql RLS/security-definer test
--
-- Slice 4 covers two database surfaces:
--   1. New ETC profile columns (medical director contact, address lines,
--      phone, hours, lat/lng, accepting_new_patients) — these inherit
--      0018's etcs_directory_public_read policy.
--   2. The directory_etc_program_offerings SECURITY DEFINER helper that
--      surfaces an ETC's offered programs without exposing
--      tenant_relationships to the directory_anonymous role.
--
-- This file covers both. The marketing_subscriptions assertions live in
-- 0020_marketing_subscriptions_anonymous_insert.sql.

begin;

select plan(16);

-- ---------------------------------------------------------------------------
-- 1. Helper existence + grant posture (mirrors 0019 helper test).
-- ---------------------------------------------------------------------------

select ok(
  to_regprocedure('app.directory_etc_program_offerings(uuid)') is not null,
  'directory_etc_program_offerings helper exists'
);

select ok(
  has_function_privilege('app_api', 'app.directory_etc_program_offerings(uuid)', 'EXECUTE'),
  'app_api can execute directory_etc_program_offerings'
);

select ok(
  has_function_privilege('app_worker', 'app.directory_etc_program_offerings(uuid)', 'EXECUTE'),
  'app_worker can execute directory_etc_program_offerings'
);

select is_empty(
  $$ select 1
       from information_schema.routine_privileges
      where routine_schema = 'app'
        and routine_name = 'directory_etc_program_offerings'
        and grantee = 'PUBLIC'
        and privilege_type = 'EXECUTE' $$,
  'directory_etc_program_offerings is not granted through PUBLIC'
);

-- directory_etc_display_name: the ETC name lives on tenants.display_name, which
-- directory_anonymous CANNOT read (tenants has only member-read + write
-- policies). The public /etcs list + detail must therefore source the name via
-- this SECURITY DEFINER helper, not a direct join.
select ok(
  to_regprocedure('app.directory_etc_display_name(uuid)') is not null,
  'directory_etc_display_name helper exists'
);

select ok(
  has_function_privilege('app_api', 'app.directory_etc_display_name(uuid)', 'EXECUTE'),
  'app_api can execute directory_etc_display_name'
);

select is_empty(
  $$ select 1
       from information_schema.routine_privileges
      where routine_schema = 'app'
        and routine_name = 'directory_etc_display_name'
        and grantee = 'PUBLIC'
        and privilege_type = 'EXECUTE' $$,
  'directory_etc_display_name is not granted through PUBLIC'
);

-- ---------------------------------------------------------------------------
-- 2. New ETC columns visible to directory_anonymous through the existing
--    etcs_directory_public_read policy (no new policy needed).
-- ---------------------------------------------------------------------------

set local role app_api;
select set_config('app.role', 'directory_anonymous', true);

select is(
  (select medical_director_name from etcs where directory_slug = 'big-sky'),
  'Helena Marsh, MD',
  'anonymous: medical_director_name visible on big-sky'
);

select is(
  (select medical_director_clinical_email from etcs where directory_slug = 'big-sky'),
  'medical.director@bigskyetc.com',
  'anonymous: medical_director_clinical_email visible on big-sky'
);

select is(
  (select array_length(directory_address_lines, 1) from etcs where directory_slug = 'big-sky'),
  2,
  'anonymous: directory_address_lines is two-line'
);

select is(
  (select round(directory_lat::numeric, 4) from etcs where directory_slug = 'big-sky'),
  45.6889::numeric,
  'anonymous: directory_lat backfilled correctly'
);

select is(
  (select accepting_new_patients from etcs where directory_slug = 'big-sky'),
  true,
  'anonymous: accepting_new_patients = true on Big Sky'
);

-- ---------------------------------------------------------------------------
-- 3. directory_etc_program_offerings surfaces only published programs.
-- ---------------------------------------------------------------------------

-- Big Sky is the only published ETC; WST-057 is the only published program;
-- the seed established a PPA from WinSanTor → Big Sky. The helper should
-- therefore return exactly one row for Big Sky's id.
reset role;

-- Use the seeded Big Sky UUID to call the helper as the anonymous runtime.
set local role app_api;
select set_config('app.role', 'directory_anonymous', true);

select is(
  (select count(*)::int from app.directory_etc_program_offerings('c0000000-0000-0000-0000-000000000001'::uuid)),
  1,
  'anonymous: directory_etc_program_offerings returns 1 program for Big Sky'
);

select is(
  (select slug from app.directory_etc_program_offerings('c0000000-0000-0000-0000-000000000001'::uuid) limit 1),
  'wst-057',
  'anonymous: directory_etc_program_offerings returns wst-057 slug'
);

-- ---------------------------------------------------------------------------
-- 4. directory_etc_display_name resolves the published ETC name for anonymous,
--    even though anonymous cannot read the tenants table directly. This is the
--    regression guard for the slice-4 bug where the list/detail routes joined
--    tenants directly and silently returned zero rows under RLS.
-- ---------------------------------------------------------------------------

select is(
  app.directory_etc_display_name('c0000000-0000-0000-0000-000000000001'::uuid),
  'Big Sky Experimental Treatment Center',
  'anonymous: directory_etc_display_name resolves Big Sky name via SECURITY DEFINER'
);

select is(
  (select count(*)::int from tenants),
  0,
  'anonymous: direct tenants read returns 0 rows (proves the helper is required)'
);

select * from finish();

rollback;
