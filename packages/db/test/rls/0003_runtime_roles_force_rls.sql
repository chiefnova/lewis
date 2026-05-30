begin;

select plan(6);

insert into tenants (id, kind, status, display_name)
values ('33000000-0000-0000-0000-000000000001', 'manufacturer', 'active', 'Runtime Role Test Tenant');

insert into users (id, clerk_user_id, email, name)
values ('33000000-0000-0000-1000-000000000001', 'rls3_runtime_user', 'runtime@test.local', 'Runtime User');

insert into tenant_memberships (user_id, tenant_id, role)
values ('33000000-0000-0000-1000-000000000001', '33000000-0000-0000-0000-000000000001', 'manufacturer_admin');

select ok(
  exists (
    select 1
    from pg_roles
    where rolname = 'app_api'
      and rolcanlogin
      and not rolbypassrls
  ),
  'app_api exists, can login, and cannot bypass RLS'
);

select ok(
  exists (
    select 1
    from pg_roles
    where rolname = 'app_worker'
      and rolcanlogin
      and not rolbypassrls
  ),
  'app_worker exists, can login, and cannot bypass RLS'
);

select is_empty(
  $$
    select relname
    from pg_class
    where relkind = 'r'
      and relnamespace = 'public'::regnamespace
      and relrowsecurity
      and not relforcerowsecurity
  $$,
  'every RLS-enabled public table has FORCE ROW LEVEL SECURITY'
);

select lives_ok(
  $$ set local role app_api $$,
  'test harness can evaluate policies as the app_api runtime role'
);

select is(
  (select count(*)::integer from tenants where id = '33000000-0000-0000-0000-000000000001'),
  0,
  'app_api cannot read tenant rows without transaction-local app context'
);

-- Positive case: with valid context, app_api CAN read its own tenant row.
-- Catches regressions where a policy USING(false) or a missing helper grant
-- silently breaks all reads while passing static coverage.
select set_config('app.user_id', '33000000-0000-0000-1000-000000000001', true);
select set_config('app.active_tenant_id', '33000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*)::integer from tenants where id = '33000000-0000-0000-0000-000000000001'),
  1,
  'app_api with valid app.user_id + app.active_tenant_id reads its own tenant'
);

reset role;

select * from finish();

rollback;
