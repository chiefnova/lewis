begin;

select plan(6);

insert into tenants (id, kind, status, display_name)
values
  ('00000000-0000-0000-0000-000000000001', 'sponsor', 'active', 'Sponsor A'),
  ('00000000-0000-0000-0000-000000000002', 'etc', 'active', 'ETC A'),
  ('00000000-0000-0000-0000-000000000003', 'patient', 'active', 'Patient A');

insert into users (id, clerk_user_id, email, name)
values
  ('10000000-0000-0000-0000-000000000001', 'user_sponsor', 'sponsor@example.test', 'Sponsor User'),
  ('10000000-0000-0000-0000-000000000002', 'user_patient', 'patient@example.test', 'Patient User');

insert into tenant_memberships (user_id, tenant_id, role)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'sponsor_admin'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'patient');

select set_config('app.user_id', '10000000-0000-0000-0000-000000000001', true);
select set_config('app.active_tenant_id', '00000000-0000-0000-0000-000000000001', true);

select ok(app.is_tenant_member('00000000-0000-0000-0000-000000000001'::uuid), 'sponsor user is member of sponsor tenant');
select ok(not app.is_tenant_member('00000000-0000-0000-0000-000000000003'::uuid), 'sponsor user is not member of patient tenant');

insert into audit_log (tenant_id, actor_user_id, action, target_object_type, target_object_id)
values (
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'test.created',
  'test',
  '20000000-0000-0000-0000-000000000001'
);

select throws_ok(
  $$ update audit_log set action = 'test.updated' where target_object_id = '20000000-0000-0000-0000-000000000001' $$,
  'P0001',
  'audit_log is append-only',
  'audit_log update is blocked'
);

select throws_ok(
  $$ delete from audit_log where target_object_id = '20000000-0000-0000-0000-000000000001' $$,
  '23514',
  null,
  'audit_log delete is blocked'
);

select has_table('public', 'search_index_documents', 'search foundation table exists');
select has_table('public', 'payment_rails', 'payment rail abstraction exists');

select * from finish();

rollback;
