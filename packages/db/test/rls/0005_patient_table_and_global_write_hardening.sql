-- 0005_patient_table_and_global_write_hardening.sql
--
-- Covers:
--   * 0015 — patients / patient_data_sharing_consents /
--     patient_device_registry_entries write policies require
--     relationship + role-action grant (mirrors 0004 pattern for the
--     three remaining patient-tenant write policies).
--   * 0016 — NULL-tenant notifications and feature_flags writes require an
--     authenticated session whose role grants the corresponding *:write
--     action (today: corridor_admin only).

begin;

select plan(11);

insert into tenants (id, kind, status, display_name) values
  ('55000000-0000-0000-0000-000000000001', 'etc', 'active', 'ETC Hardened Patient Writes'),
  ('55000000-0000-0000-0000-000000000002', 'patient', 'active', 'Patient Hardened Patient Writes'),
  ('55000000-0000-0000-0000-000000000003', 'sponsor', 'active', 'Sponsor for consent test'),
  ('55000000-0000-0000-0000-000000000004', 'sponsor', 'active', 'Corridor admin home tenant');

insert into users (id, clerk_user_id, email, name) values
  ('55000000-0000-0000-1000-000000000001', 'rls5_etc_clinician', 'clin5@test.local', 'ETC Clinician'),
  ('55000000-0000-0000-1000-000000000002', 'rls5_etc_user', 'ops5@test.local', 'ETC Ops User'),
  ('55000000-0000-0000-1000-000000000003', 'rls5_corridor_admin', 'admin5@test.local', 'Corridor Admin'),
  ('55000000-0000-0000-1000-000000000004', 'rls5_sponsor_user', 'sponsor5@test.local', 'Sponsor User');

insert into tenant_memberships (user_id, tenant_id, role) values
  ('55000000-0000-0000-1000-000000000001', '55000000-0000-0000-0000-000000000001', 'etc_clinician'),
  ('55000000-0000-0000-1000-000000000002', '55000000-0000-0000-0000-000000000001', 'etc_user'),
  ('55000000-0000-0000-1000-000000000003', '55000000-0000-0000-0000-000000000004', 'corridor_admin'),
  ('55000000-0000-0000-1000-000000000004', '55000000-0000-0000-0000-000000000003', 'sponsor_user');

insert into tenant_relationships (from_tenant_id, to_tenant_id, kind, status) values
  ('55000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000002', 'care_team', 'active');

-- No patients-row seed here: patients.tenant_id is UNIQUE (one patient per
-- patient-tenant), so seeding would collide with test 2's clinician INSERT.
-- Test 2 creates the patient row that tests 3 and 4 then operate against.

-- Seed one investigational_device so test 7's INSERT into
-- patient_device_registry_entries clears the device_id NOT NULL + FK and gets
-- to RLS WITH CHECK (the thing test 7 is actually asserting).
do $$
declare v_jur uuid;
begin
  select id into v_jur from regulatory_jurisdictions where code = 'US-MT';

  insert into investigational_devices (
    id, sponsor_tenant_id, jurisdiction_id, device_name
  ) values (
    '55000000-0000-0000-3000-000000000001',
    '55000000-0000-0000-0000-000000000003',
    v_jur,
    'Test Pacemaker'
  );
end $$;

set local role app_api;

-- ---------------------------------------------------------------------------
-- 0015 — patients write hardening
-- ---------------------------------------------------------------------------

-- 1. etc_user (relationship-only, no patient:write action) cannot INSERT.
select set_config('app.user_id', '55000000-0000-0000-1000-000000000002', true);
select set_config('app.active_tenant_id', '55000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$
  insert into patients (tenant_id, jurisdiction_id, full_name)
  values (
    '55000000-0000-0000-0000-000000000002',
    (select id from regulatory_jurisdictions where code = 'US-MT'),
    'Should Not Insert'
  )
  $$,
  '42501',
  null,
  'etc_user with care_team relationship cannot INSERT into patients'
);

-- 2. etc_clinician (relationship + patient:write) CAN INSERT.
select set_config('app.user_id', '55000000-0000-0000-1000-000000000001', true);
select lives_ok(
  $$
  insert into patients (tenant_id, jurisdiction_id, full_name)
  values (
    '55000000-0000-0000-0000-000000000002',
    (select id from regulatory_jurisdictions where code = 'US-MT'),
    'Clinician Inserted Patient'
  )
  $$,
  'etc_clinician with care_team can INSERT into patients'
);

-- 3. etc_user UPDATE on patients affects zero rows (RLS hides via USING).
--    Postgres requires WITH-containing-DML at the top level of SELECT/INSERT/
--    UPDATE/DELETE/MERGE — we capture the affected-row count via CTAS into a
--    temp table, then pass the scalar to is().
select set_config('app.user_id', '55000000-0000-0000-1000-000000000002', true);

create temp table _patients_test3_affected as
with updated as (
  update patients set full_name = full_name || ' (touched)'
   where tenant_id = '55000000-0000-0000-0000-000000000002'
   returning 1
)
select count(*)::integer as cnt from updated;

select is(
  (select cnt from _patients_test3_affected),
  0,
  'etc_user UPDATE on patients affects zero rows'
);

drop table _patients_test3_affected;

-- 4. etc_clinician UPDATE on patients lives.
select set_config('app.user_id', '55000000-0000-0000-1000-000000000001', true);
select lives_ok(
  $$
  update patients set full_name = full_name || ' (renamed)'
   where tenant_id = '55000000-0000-0000-0000-000000000002'
  $$,
  'etc_clinician UPDATE on patients lives'
);

-- ---------------------------------------------------------------------------
-- 0015 — patient_data_sharing_consents write hardening
-- ---------------------------------------------------------------------------

-- 5. etc_user cannot INSERT a consent row.
select set_config('app.user_id', '55000000-0000-0000-1000-000000000002', true);
select throws_ok(
  $$
  insert into patient_data_sharing_consents (
    patient_tenant_id, sponsor_tenant_id, jurisdiction_id, status, starts_at
  ) values (
    '55000000-0000-0000-0000-000000000002',
    '55000000-0000-0000-0000-000000000003',
    (select id from regulatory_jurisdictions where code = 'US-MT'),
    'active',
    now() - interval '1 day'
  )
  $$,
  '42501',
  null,
  'etc_user cannot INSERT into patient_data_sharing_consents'
);

-- 6. etc_clinician (consent:write granted) can INSERT.
select set_config('app.user_id', '55000000-0000-0000-1000-000000000001', true);
select lives_ok(
  $$
  insert into patient_data_sharing_consents (
    patient_tenant_id, sponsor_tenant_id, jurisdiction_id, status, starts_at
  ) values (
    '55000000-0000-0000-0000-000000000002',
    '55000000-0000-0000-0000-000000000003',
    (select id from regulatory_jurisdictions where code = 'US-MT'),
    'active',
    now() - interval '1 day'
  )
  $$,
  'etc_clinician can INSERT patient_data_sharing_consents'
);

-- ---------------------------------------------------------------------------
-- 0015 — patient_device_registry_entries write hardening
-- ---------------------------------------------------------------------------

-- 7. etc_user cannot INSERT a device registry row.
select set_config('app.user_id', '55000000-0000-0000-1000-000000000002', true);
select throws_ok(
  $$
  insert into patient_device_registry_entries (
    patient_tenant_id, jurisdiction_id, device_id, device_identifier, status
  ) values (
    '55000000-0000-0000-0000-000000000002',
    (select id from regulatory_jurisdictions where code = 'US-MT'),
    '55000000-0000-0000-3000-000000000001',
    'PACE-SN-001',
    'active'
  )
  $$,
  '42501',
  null,
  'etc_user cannot INSERT into patient_device_registry_entries'
);

-- ---------------------------------------------------------------------------
-- 0016 — NULL-tenant notifications + feature_flags require role grant
-- ---------------------------------------------------------------------------

-- 8. sponsor_user (no notification:write grant) cannot INSERT a NULL-tenant
--    notification.
select set_config('app.user_id', '55000000-0000-0000-1000-000000000004', true);
select set_config('app.active_tenant_id', '55000000-0000-0000-0000-000000000003', true);
select throws_ok(
  $$
  insert into notifications (tenant_id, channel, template, recipient)
  values (null, 'email', 'sponsor_attempt_global', 'all')
  $$,
  '42501',
  null,
  'sponsor_user cannot INSERT NULL-tenant notification'
);

-- 9. etc_user (no notification:write grant) cannot INSERT a NULL-tenant flag.
select set_config('app.user_id', '55000000-0000-0000-1000-000000000002', true);
select set_config('app.active_tenant_id', '55000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$
  insert into feature_flags (tenant_id, flag_key, enabled)
  values (null, 'rls5_etc_user_attempt_global', true)
  $$,
  '42501',
  null,
  'etc_user cannot INSERT NULL-tenant feature_flag'
);

-- 10. corridor_admin CAN INSERT a NULL-tenant notification.
select set_config('app.user_id', '55000000-0000-0000-1000-000000000003', true);
select set_config('app.active_tenant_id', '55000000-0000-0000-0000-000000000004', true);
select lives_ok(
  $$
  insert into notifications (tenant_id, channel, template, recipient)
  values (null, 'email', 'corridor_admin_global', 'all')
  $$,
  'corridor_admin CAN INSERT NULL-tenant notification'
);

-- 11. corridor_admin CAN INSERT a NULL-tenant feature_flag.
select lives_ok(
  $$
  insert into feature_flags (tenant_id, flag_key, enabled)
  values (null, 'rls5_corridor_admin_global', true)
  $$,
  'corridor_admin CAN INSERT NULL-tenant feature_flag'
);

reset role;

select * from finish();

rollback;
