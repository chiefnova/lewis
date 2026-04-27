begin;

select plan(10);

insert into tenants (id, kind, status, display_name) values
  ('44000000-0000-0000-0000-000000000001', 'etc', 'active', 'ETC Hardened Writes'),
  ('44000000-0000-0000-0000-000000000002', 'patient', 'active', 'Patient Hardened Writes');

insert into users (id, clerk_user_id, email, name) values
  ('44000000-0000-0000-1000-000000000001', 'rls4_etc_clinician', 'clinician@test.local', 'ETC Clinician'),
  ('44000000-0000-0000-1000-000000000002', 'rls4_etc_user', 'ops@test.local', 'ETC Ops User'),
  ('44000000-0000-0000-1000-000000000003', 'rls4_patient', 'patient@test.local', 'Patient User'),
  ('44000000-0000-0000-1000-000000000004', 'rls4_guardian', 'guardian@test.local', 'Guardian User');

insert into tenant_memberships (user_id, tenant_id, role) values
  ('44000000-0000-0000-1000-000000000001', '44000000-0000-0000-0000-000000000001', 'etc_clinician'),
  ('44000000-0000-0000-1000-000000000002', '44000000-0000-0000-0000-000000000001', 'etc_user'),
  ('44000000-0000-0000-1000-000000000003', '44000000-0000-0000-0000-000000000002', 'patient');

insert into tenant_relationships (from_tenant_id, to_tenant_id, kind, status)
values ('44000000-0000-0000-0000-000000000001', '44000000-0000-0000-0000-000000000002', 'care_team', 'active');

do $$
declare v_jur uuid;
begin
  select id into v_jur from regulatory_jurisdictions where code = 'US-MT';

  insert into patients (tenant_id, jurisdiction_id, primary_user_id, full_name)
  values (
    '44000000-0000-0000-0000-000000000002',
    v_jur,
    '44000000-0000-0000-1000-000000000003',
    'Patient Hardened Writes'
  );

  insert into file_storage_objects (
    id, tenant_id, bucket, object_path, sha256, size_bytes, mime_type,
    uploaded_by_user_id, immutable_ref
  ) values (
    '44000000-0000-0000-2000-000000000001',
    '44000000-0000-0000-0000-000000000002',
    'patient-files', 'authority/guardian.pdf',
    repeat('c', 64), 100, 'application/pdf',
    '44000000-0000-0000-1000-000000000001',
    true
  );
end $$;

set local role app_api;

-- 1. Relationship alone is not enough: etc_user lacks representative:write.
select set_config('app.user_id', '44000000-0000-0000-1000-000000000002', true);
select set_config('app.active_tenant_id', '44000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$
  insert into patient_representatives (
    patient_tenant_id, jurisdiction_id, user_id, relationship_type, authority_basis,
    access_scope, signing_permission
  )
  values (
    '44000000-0000-0000-0000-000000000002',
    (select id from regulatory_jurisdictions where code = 'US-MT'),
    '44000000-0000-0000-1000-000000000004',
    'caregiver',
    'designated_by_patient',
    array['schedule:read'],
    false
  )
  $$,
  '42501',
  null,
  'relationship-only ETC user cannot write patient_representatives'
);

-- 2. Relationship alone is not enough: etc_user lacks minor_assent:write.
select throws_ok(
  $$
  insert into minor_assents (
    patient_tenant_id, jurisdiction_id, assent_status, assented_at, recorded_by_user_id
  )
  values (
    '44000000-0000-0000-0000-000000000002',
    (select id from regulatory_jurisdictions where code = 'US-MT'),
    'collected',
    now(),
    '44000000-0000-0000-1000-000000000002'
  )
  $$,
  '42501',
  null,
  'relationship-only ETC user cannot write minor_assents'
);

-- 3. An ETC clinician with the same care_team relationship can write non-signing representative rows.
select set_config('app.user_id', '44000000-0000-0000-1000-000000000001', true);
select lives_ok(
  $$
  insert into patient_representatives (
    patient_tenant_id, jurisdiction_id, user_id, relationship_type, authority_basis,
    access_scope, signing_permission
  )
  values (
    '44000000-0000-0000-0000-000000000002',
    (select id from regulatory_jurisdictions where code = 'US-MT'),
    '44000000-0000-0000-1000-000000000004',
    'caregiver',
    'designated_by_patient',
    array['schedule:read'],
    false
  )
  $$,
  'ETC clinician can write scoped non-signing representative row'
);

-- 4. The ETC clinician can record minor assent.
select lives_ok(
  $$
  insert into minor_assents (
    patient_tenant_id, jurisdiction_id, assent_status, assented_at, recorded_by_user_id
  )
  values (
    '44000000-0000-0000-0000-000000000002',
    (select id from regulatory_jurisdictions where code = 'US-MT'),
    'collected',
    now(),
    '44000000-0000-0000-1000-000000000001'
  )
  $$,
  'ETC clinician can write minor_assents'
);

-- 5. Non-self signing permission requires a verified authority document.
select throws_ok(
  $$
  insert into patient_representatives (
    patient_tenant_id, jurisdiction_id, user_id, relationship_type, authority_basis,
    access_scope, signing_permission, verified_by_user_id, verified_at
  )
  values (
    '44000000-0000-0000-0000-000000000002',
    (select id from regulatory_jurisdictions where code = 'US-MT'),
    '44000000-0000-0000-1000-000000000004',
    'legal_guardian',
    'court_order',
    array['records:read','consents:read'],
    true,
    '44000000-0000-0000-1000-000000000001',
    now()
  )
  $$,
  '23514',
  null,
  'non-self signing permission requires authority_document_file_id'
);

-- 6. Self-relationship signing is permitted without an authority document
--    (the constraint's relationship_type='self' bypass).
select set_config('app.user_id', '44000000-0000-0000-1000-000000000003', true);
select set_config('app.active_tenant_id', '44000000-0000-0000-0000-000000000002', true);
select lives_ok(
  $$
  insert into patient_representatives (
    patient_tenant_id, jurisdiction_id, user_id, relationship_type, authority_basis,
    access_scope, signing_permission
  )
  values (
    '44000000-0000-0000-0000-000000000002',
    (select id from regulatory_jurisdictions where code = 'US-MT'),
    '44000000-0000-0000-1000-000000000003',
    'self',
    'patient_self',
    array['schedule:read','records:read'],
    true
  )
  $$,
  'self-relationship signing bypasses authority_document_file_id requirement'
);

-- 7. UPDATE: ETC clinician (role + relationship) can update an existing rep row.
select set_config('app.user_id', '44000000-0000-0000-1000-000000000001', true);
select set_config('app.active_tenant_id', '44000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$
  update patient_representatives
     set access_scope = array['schedule:read','records:read']
   where patient_tenant_id = '44000000-0000-0000-0000-000000000002'
     and relationship_type = 'caregiver'
  $$,
  'ETC clinician can UPDATE patient_representatives via relationship + role'
);

-- 8. UPDATE: relationship-only etc_user is denied. Postgres reports zero
--    affected rows (RLS hides the row via USING) rather than 42501; assert
--    the no-op semantic. Postgres requires WITH-containing-DML at the top
--    level of SELECT/INSERT/UPDATE/DELETE/MERGE — we capture the affected-
--    row count via CTAS into a temp table, then pass the scalar to is().
select set_config('app.user_id', '44000000-0000-0000-1000-000000000002', true);

create temp table _rep_test8_affected as
with updated as (
  update patient_representatives
     set access_scope = array['schedule:read']
   where patient_tenant_id = '44000000-0000-0000-0000-000000000002'
     and relationship_type = 'caregiver'
   returning 1
)
select count(*)::integer as cnt from updated;

select is(
  (select cnt from _rep_test8_affected),
  0,
  'relationship-only etc_user UPDATE on patient_representatives affects zero rows'
);

drop table _rep_test8_affected;

-- 9. DELETE: relationship-only etc_user is denied (zero affected rows).
create temp table _rep_test9_affected as
with deleted as (
  delete from patient_representatives
   where patient_tenant_id = '44000000-0000-0000-0000-000000000002'
     and relationship_type = 'caregiver'
   returning 1
)
select count(*)::integer as cnt from deleted;

select is(
  (select cnt from _rep_test9_affected),
  0,
  'relationship-only etc_user DELETE on patient_representatives affects zero rows'
);

drop table _rep_test9_affected;

-- 10. Cross-tenant negative: ETC clinician with care_team to tenant A cannot
--     INSERT a rep row whose patient_tenant_id points to an unrelated tenant.
select set_config('app.user_id', '44000000-0000-0000-1000-000000000001', true);
select set_config('app.active_tenant_id', '44000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$
  insert into patient_representatives (
    patient_tenant_id, jurisdiction_id, user_id, relationship_type, authority_basis,
    access_scope, signing_permission
  )
  values (
    '22000000-0000-0000-0000-0000000000f1',
    (select id from regulatory_jurisdictions where code = 'US-MT'),
    '44000000-0000-0000-1000-000000000004',
    'caregiver',
    'designated_by_patient',
    array['schedule:read'],
    false
  )
  $$,
  '42501',
  null,
  'ETC clinician cannot INSERT rep into a patient tenant outside their care_team'
);

reset role;

select * from finish();

rollback;
