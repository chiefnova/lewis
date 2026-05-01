-- 0019_program_clinical_evidence.sql RLS/security-definer test
--
-- Covers the directory_program_etc_count helper introduced for the public
-- programs API. The helper is SECURITY DEFINER because tenant_relationships
-- stays private; these assertions keep that bypass narrow.

begin;

select plan(6);

select ok(
  to_regprocedure('app.directory_program_etc_count(uuid)') is not null,
  'directory_program_etc_count helper exists'
);

select ok(
  has_function_privilege('app_api', 'app.directory_program_etc_count(uuid)', 'EXECUTE'),
  'app_api can execute directory_program_etc_count'
);

select ok(
  has_function_privilege('app_worker', 'app.directory_program_etc_count(uuid)', 'EXECUTE'),
  'app_worker can execute directory_program_etc_count'
);

select is_empty(
  $$ select 1
       from information_schema.routine_privileges
      where routine_schema = 'app'
        and routine_name = 'directory_program_etc_count'
        and grantee = 'PUBLIC'
        and privilege_type = 'EXECUTE' $$,
  'directory_program_etc_count is not granted through PUBLIC'
);

-- Setup an unpublished program under the same sponsor as WST-057. Without the
-- helper's directory_published guard, this would leak that the sponsor has an
-- active published ETC relationship by returning 1.
insert into programs (
  id,
  sponsor_tenant_id,
  jurisdiction_id,
  name,
  treatment_form,
  directory_slug,
  directory_published
)
select
  'b0000000-0000-0000-0000-00000000dead'::uuid,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  j.id,
  'RLS Test Unpublished Program',
  'topical',
  'rls-test-unpublished-program',
  false
from regulatory_jurisdictions j
where j.code = 'US-MT';

set local role app_api;
select set_config('app.role', 'directory_anonymous', true);

select is(
  app.directory_program_etc_count('b0000000-0000-0000-0000-000000000001'::uuid),
  1,
  'published WST-057 returns its public ETC count'
);

select is(
  app.directory_program_etc_count('b0000000-0000-0000-0000-00000000dead'::uuid),
  0,
  'unpublished program returns zero ETC count through the helper'
);

select * from finish();

rollback;
