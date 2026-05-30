-- 0011_runtime_roles_and_force_rls.sql
--
-- Splits migration ownership from application runtime access and makes RLS
-- non-bypassable for table owners. Runtime applications must connect as
-- app_api or app_worker, never as the migration owner.
--
-- IMPORTANT — function-owner contract under FORCE RLS:
--   Every SECURITY DEFINER helper that reads RLS-enabled tables —
--   app.is_tenant_member, app.has_tenant_relationship,
--   app.has_active_support_grant, app.can_write_for_tenant,
--   app.current_tenant_member_grants_action — relies on the function owner
--   bypassing RLS to perform its lookup. Today the owner is the lewis
--   superuser (Docker bootstrap), which has BYPASSRLS implicitly. If function
--   ownership is ever transferred to app_migrator (NOINHERIT NOBYPASSRLS) or
--   any other NOBYPASSRLS role, FORCE RLS will apply to those reads and the
--   helpers will return false / empty, breaking every write policy and most
--   relationship-based read policies.
--
--   When the time comes to transfer object ownership to app_migrator, also:
--     1. grant BYPASSRLS to a dedicated `app_helpers` role,
--     2. ALTER FUNCTION ... OWNER TO app_helpers for each app.* helper,
--     3. add a deploy-time CI check that calls each helper with deterministic
--        inputs and asserts the expected truth value.
--
--   Until then, do NOT alter ownership of app.* functions.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_api') then
    create role app_api login nobypassrls;
  else
    alter role app_api with login nobypassrls;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'app_worker') then
    create role app_worker login nobypassrls;
  else
    alter role app_worker with login nobypassrls;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'app_migrator') then
    create role app_migrator noinherit nobypassrls;
  else
    alter role app_migrator with noinherit nobypassrls;
  end if;
end $$;

comment on role app_api is
  'Lewis API runtime role. LOGIN allowed; NOBYPASSRLS required; must not own application tables.';
comment on role app_worker is
  'Lewis regular worker runtime role. LOGIN allowed; NOBYPASSRLS required; must not own application tables.';
comment on role app_migrator is
  'Lewis migration/DDL ownership role. Never available to API or worker runtimes.';

grant usage on schema public, app to app_api, app_worker;
grant select, insert, update, delete on all tables in schema public to app_api, app_worker;
grant usage, select on all sequences in schema public to app_api, app_worker;
grant execute on all functions in schema app to app_api, app_worker;

alter default privileges in schema public
  grant select, insert, update, delete on tables to app_api, app_worker;
alter default privileges in schema public
  grant usage, select on sequences to app_api, app_worker;
alter default privileges in schema app
  grant execute on functions to app_api, app_worker;

-- FORCE RLS is intentionally explicit so static CI can catch any future
-- RLS-enabled table that fails to opt into owner enforcement.
alter table if exists tenants force row level security;
alter table if exists users force row level security;
alter table if exists tenant_memberships force row level security;
alter table if exists tenant_relationships force row level security;
alter table if exists support_access_grants force row level security;
alter table if exists audit_log force row level security;
alter table if exists file_storage_objects force row level security;
alter table if exists notifications force row level security;
alter table if exists feature_flags force row level security;
alter table if exists regulatory_jurisdictions force row level security;
alter table if exists regulatory_rule_versions force row level security;
alter table if exists manufacturer_organizations force row level security;
alter table if exists etcs force row level security;
alter table if exists patients force row level security;
alter table if exists programs force row level security;
alter table if exists investigational_devices force row level security;
alter table if exists inpatient_facility_profiles force row level security;
alter table if exists payment_rails force row level security;
alter table if exists payment_obligations force row level security;
alter table if exists payment_transactions force row level security;
alter table if exists hfar_path_a_allocations force row level security;
alter table if exists patient_data_sharing_consents force row level security;
alter table if exists patient_device_registry_entries force row level security;
alter table if exists search_index_documents force row level security;
alter table if exists search_index_jobs force row level security;
alter table if exists patient_representatives force row level security;
alter table if exists minor_assents force row level security;
