-- 0006_runtime_role_grants_present.sql
--
-- Asserts that every RLS-enabled public table has SELECT/INSERT/UPDATE/DELETE
-- granted to BOTH app_api and app_worker. ALTER DEFAULT PRIVILEGES (set in
-- 0011) only applies to objects created by the role that ran the ALTER —
-- if a future migration is run as a different role, the new table silently
-- skips the default grant and runtime queries would error with "permission
-- denied for table". This test catches that drift in CI before it ships.

begin;

select plan(1);

with rls_tables as (
  select n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where c.relkind = 'r'
     and n.nspname = 'public'
     and c.relrowsecurity
), missing_grants as (
  select t.schema_name, t.table_name, role_name, action
    from rls_tables t
    cross join (values ('app_api'), ('app_worker')) as r(role_name)
    cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) as a(action)
   where not has_table_privilege(role_name, format('%I.%I', schema_name, table_name)::regclass, action)
)
select is(
  (select count(*)::integer from missing_grants),
  0,
  'every RLS-enabled public table has SELECT/INSERT/UPDATE/DELETE granted to app_api and app_worker'
);

select * from finish();

rollback;
