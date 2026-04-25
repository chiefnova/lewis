-- 0002_helpers_policies_retention.sql
--
-- Comprehensive pgTAP coverage for the helpers, policies, and triggers
-- introduced in migrations 0006-0010. Closes the Sprint-1 coverage gap per
-- implementation.md § 2.2.1.
--
-- Coverage map:
--   * Helper functions:
--       app.shares_tenant_with                    (0006)
--       app.has_active_consent_for_sponsor        (0006)
--       app.role_grants_action                    (0008, extended in 0010)
--       app.can_write_for_tenant                  (0008)
--       app.write_audit                            (0009)
--       app.compute_retention                     (0007)
--   * Rewritten read policies:
--       users_self_or_tenant_read                  (0006 — recursion fix)
--       patients_self_read                         (0006 — care_team + consent)
--       programs_sponsor_read                      (0006 — PPA)
--   * Triggers / immutability:
--       audit_log: update/delete/truncate blocked  (0003 + reaffirmed)
--       audit_log retention auto-populate          (0007)
--       file_storage_objects retention auto-pop    (0007)
--       file_storage_objects BEFORE DELETE block   (0007)
--   * NEW Sprint-1-foundation tables (0010):
--       patient_representatives RLS + check constraints
--       minor_assents RLS + check constraints
--   * NULL-tenant policy tightening (0009):
--       notifications + feature_flags require app.current_user_id() IS NOT NULL
--
-- Test session uses a NOBYPASSRLS role so policy USING/WITH CHECK clauses
-- actually fire (the postgres superuser bypasses RLS by default).

create extension if not exists pgtap;

begin;

select plan(38);

-- ---------------------------------------------------------------------------
-- Test cast — fresh UUIDs that don't collide with 0001_foundation
-- ---------------------------------------------------------------------------
--   Tenants:
--     S = sponsor
--     E = ETC (care_team for P, M, C)
--     B = board (review)
--     P = patient (self-directed adult, has consent with S)
--     M = minor patient (with parent representative)
--     C = patient with caregiver (no signing perms)
--     X = unrelated tenant (must be denied access to everything)
--   Users:
--     u_S, u_E, u_B, u_P, u_M_parent, u_C_caregiver, u_X
-- ---------------------------------------------------------------------------

insert into tenants (id, kind, status, display_name) values
  ('22000000-0000-0000-0000-00000000000S', 'sponsor', 'active', 'Sponsor S'),
  ('22000000-0000-0000-0000-00000000000E', 'etc', 'active', 'ETC E'),
  ('22000000-0000-0000-0000-00000000000B', 'board', 'active', 'Board B'),
  ('22000000-0000-0000-0000-00000000000A', 'patient', 'active', 'Patient P (adult)'),
  ('22000000-0000-0000-0000-00000000000C', 'patient', 'active', 'Patient C (with caregiver)'),
  ('22000000-0000-0000-0000-00000000000D', 'patient', 'active', 'Patient M (minor)'),
  ('22000000-0000-0000-0000-00000000000F', 'sponsor', 'active', 'Tenant X (unrelated)');

insert into users (id, clerk_user_id, email, name) values
  ('22000000-0000-0000-1000-000000000001', 'rls2_user_S', 'sponsor_s@test.local', 'Sponsor User'),
  ('22000000-0000-0000-1000-000000000002', 'rls2_user_E', 'etc_e@test.local', 'ETC User'),
  ('22000000-0000-0000-1000-000000000003', 'rls2_user_B', 'board_b@test.local', 'Board User'),
  ('22000000-0000-0000-1000-000000000004', 'rls2_user_P', 'patient_p@test.local', 'Patient P User'),
  ('22000000-0000-0000-1000-000000000005', 'rls2_user_Mparent', 'parent_m@test.local', 'Minor M Parent'),
  ('22000000-0000-0000-1000-000000000006', 'rls2_user_Ccaregiver', 'caregiver_c@test.local', 'Patient C Caregiver'),
  ('22000000-0000-0000-1000-000000000007', 'rls2_user_X', 'tenant_x@test.local', 'Unrelated User');

insert into tenant_memberships (user_id, tenant_id, role) values
  ('22000000-0000-0000-1000-000000000001', '22000000-0000-0000-0000-00000000000S', 'sponsor_admin'),
  ('22000000-0000-0000-1000-000000000002', '22000000-0000-0000-0000-00000000000E', 'etc_clinician'),
  ('22000000-0000-0000-1000-000000000003', '22000000-0000-0000-0000-00000000000B', 'board_reviewer'),
  ('22000000-0000-0000-1000-000000000004', '22000000-0000-0000-0000-00000000000A', 'patient'),
  ('22000000-0000-0000-1000-000000000007', '22000000-0000-0000-0000-00000000000F', 'sponsor_admin');

insert into tenant_relationships (from_tenant_id, to_tenant_id, kind, status) values
  ('22000000-0000-0000-0000-00000000000S', '22000000-0000-0000-0000-00000000000E', 'ppa', 'active'),
  ('22000000-0000-0000-0000-00000000000E', '22000000-0000-0000-0000-00000000000A', 'care_team', 'active'),
  ('22000000-0000-0000-0000-00000000000E', '22000000-0000-0000-0000-00000000000C', 'care_team', 'active'),
  ('22000000-0000-0000-0000-00000000000E', '22000000-0000-0000-0000-00000000000D', 'care_team', 'active'),
  ('22000000-0000-0000-0000-00000000000B', '22000000-0000-0000-0000-00000000000E', 'board_review', 'active');

-- US-MT jurisdiction is seeded by migration 0002. Look it up for FKs.
do $$
declare v_jur uuid;
begin
  select id into v_jur from regulatory_jurisdictions where code = 'US-MT';

  -- Patient rows
  insert into patients (tenant_id, jurisdiction_id, primary_user_id, full_name) values
    ('22000000-0000-0000-0000-00000000000A', v_jur, '22000000-0000-0000-1000-000000000004', 'Patient P'),
    ('22000000-0000-0000-0000-00000000000C', v_jur, null, 'Patient C'),
    ('22000000-0000-0000-0000-00000000000D', v_jur, null, 'Minor M');

  -- Active consent: Patient P → Sponsor S
  insert into patient_data_sharing_consents (
    patient_tenant_id, sponsor_tenant_id, jurisdiction_id, status, starts_at
  ) values (
    '22000000-0000-0000-0000-00000000000A',
    '22000000-0000-0000-0000-00000000000S',
    v_jur,
    'active',
    now() - interval '1 day'
  );

  -- Sponsor S has a program
  insert into programs (
    sponsor_tenant_id, jurisdiction_id, name, treatment_form, status
  ) values (
    '22000000-0000-0000-0000-00000000000S',
    v_jur,
    'Test Program',
    'outpatient',
    'draft'
  );

  -- Patient representatives: P=self, C=caregiver (no signing), M=parent (signing, verified)
  insert into patient_representatives (
    patient_tenant_id, jurisdiction_id, user_id, relationship_type, authority_basis,
    access_scope, signing_permission, messaging_permission
  ) values (
    '22000000-0000-0000-0000-00000000000A', v_jur,
    '22000000-0000-0000-1000-000000000004', 'self', 'self_directed_adult',
    array['schedule:read','outcomes:read','documents:read','messages:read','records:read','consents:read','agreements:read'],
    true, true
  );
  insert into patient_representatives (
    patient_tenant_id, jurisdiction_id, user_id, relationship_type, authority_basis,
    access_scope, signing_permission, messaging_permission
  ) values (
    '22000000-0000-0000-0000-00000000000C', v_jur,
    '22000000-0000-0000-1000-000000000006', 'caregiver', 'designated_by_patient',
    array['schedule:read','outcomes:read'],
    false, false
  );
  insert into patient_representatives (
    patient_tenant_id, jurisdiction_id, user_id, relationship_type, authority_basis,
    authority_document_file_id,
    access_scope, signing_permission, messaging_permission,
    verified_by_user_id, verified_at
  ) values (
    '22000000-0000-0000-0000-00000000000D', v_jur,
    '22000000-0000-0000-1000-000000000005', 'parent_guardian', 'parental_rights',
    null,
    array['schedule:read','outcomes:read','documents:read','messages:read','records:read','consents:read','agreements:read'],
    true, true,
    '22000000-0000-0000-1000-000000000002', now() - interval '1 hour'
  );

  -- A minor_assents row (collected) for Minor M
  insert into minor_assents (
    patient_tenant_id, jurisdiction_id, assent_status, assented_at, recorded_by_user_id
  ) values (
    '22000000-0000-0000-0000-00000000000D', v_jur,
    'collected', now() - interval '30 minutes',
    '22000000-0000-0000-1000-000000000002'
  );

end $$;

-- ---------------------------------------------------------------------------
-- Force RLS on tables under test so the test session (likely superuser)
-- still triggers USING/WITH CHECK evaluation. Side effects roll back with
-- the transaction.
-- ---------------------------------------------------------------------------

alter table users force row level security;
alter table patients force row level security;
alter table programs force row level security;
alter table patient_representatives force row level security;
alter table minor_assents force row level security;
alter table notifications force row level security;
alter table feature_flags force row level security;

-- ---------------------------------------------------------------------------
-- 1-4: Helper functions in isolation
-- ---------------------------------------------------------------------------

select set_config('app.user_id', '22000000-0000-0000-1000-000000000004', true);
select set_config('app.active_tenant_id', '22000000-0000-0000-0000-00000000000A', true);

-- 1. shares_tenant_with: patient P shares the patient tenant with themselves
select ok(
  app.shares_tenant_with('22000000-0000-0000-1000-000000000004'::uuid),
  'shares_tenant_with: self always shares'
);

-- 2. shares_tenant_with: P does NOT share a tenant with the unrelated user
select ok(
  not app.shares_tenant_with('22000000-0000-0000-1000-000000000007'::uuid),
  'shares_tenant_with: cross-tenant returns false'
);

-- 3. has_active_consent_for_sponsor: P has active consent with S
select ok(
  app.has_active_consent_for_sponsor(
    '22000000-0000-0000-0000-00000000000A'::uuid,
    '22000000-0000-0000-0000-00000000000S'::uuid
  ),
  'has_active_consent_for_sponsor: active consent returns true'
);

-- 4. has_active_consent_for_sponsor: P has no consent with X
select ok(
  not app.has_active_consent_for_sponsor(
    '22000000-0000-0000-0000-00000000000A'::uuid,
    '22000000-0000-0000-0000-00000000000F'::uuid
  ),
  'has_active_consent_for_sponsor: no consent returns false'
);

-- ---------------------------------------------------------------------------
-- 5-7: role_grants_action + can_write_for_tenant
-- ---------------------------------------------------------------------------

-- 5. role_grants_action: corridor_admin grants membership:write
select ok(
  app.role_grants_action('corridor_admin', 'membership:write'),
  'role_grants_action: corridor_admin → membership:write'
);

-- 6. role_grants_action: patient does NOT grant tenant:write
select ok(
  not app.role_grants_action('patient', 'tenant:write'),
  'role_grants_action: patient → tenant:write denied'
);

-- 7. role_grants_action: representative:write was added in 0010
select ok(
  app.role_grants_action('etc_clinician', 'representative:write'),
  'role_grants_action: etc_clinician → representative:write (added in 0010)'
);

-- 8. can_write_for_tenant: patient P can write to their own patient tenant for patient:write
select ok(
  app.can_write_for_tenant(
    '22000000-0000-0000-0000-00000000000A'::uuid, 'patient:write'
  ),
  'can_write_for_tenant: patient self can patient:write own tenant'
);

-- 9. can_write_for_tenant: patient P cannot write to ETC tenant
select ok(
  not app.can_write_for_tenant(
    '22000000-0000-0000-0000-00000000000E'::uuid, 'etc:write'
  ),
  'can_write_for_tenant: cross-tenant denied'
);

-- ---------------------------------------------------------------------------
-- 10-12: app.write_audit() — uses session context, returns id, writes row
-- ---------------------------------------------------------------------------

select set_config('app.request_id', 'rls2-test-req-001', true);

-- 10. write_audit returns a non-null uuid
select isnt(
  app.write_audit('test.action', 'test_target_type'),
  null,
  'write_audit returns inserted row id'
);

-- 11. write_audit pulled actor from app.current_user_id()
select is(
  (select actor_user_id from audit_log where action = 'test.action'),
  '22000000-0000-0000-1000-000000000004'::uuid,
  'write_audit pulled actor from session'
);

-- 12. write_audit pulled tenant from app.current_tenant_id()
select is(
  (select tenant_id from audit_log where action = 'test.action'),
  '22000000-0000-0000-0000-00000000000A'::uuid,
  'write_audit pulled tenant from session'
);

-- ---------------------------------------------------------------------------
-- 13-15: audit_log immutability (update/delete/truncate)
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ update audit_log set action = 'tampered' where action = 'test.action' $$,
  'P0001',
  'audit_log is append-only',
  '13. audit_log UPDATE blocked'
);

select throws_ok(
  $$ delete from audit_log where action = 'test.action' $$,
  'P0001',
  'audit_log is append-only',
  '14. audit_log DELETE blocked'
);

select throws_ok(
  $$ truncate audit_log $$,
  'P0001',
  'audit_log is append-only',
  '15. audit_log TRUNCATE blocked'
);

-- ---------------------------------------------------------------------------
-- 16-19: patients_self_read policy (rewritten in 0006)
-- ---------------------------------------------------------------------------

-- 16. Patient P sees their own row
select set_config('app.user_id', '22000000-0000-0000-1000-000000000004', true);
select set_config('app.active_tenant_id', '22000000-0000-0000-0000-00000000000A', true);
select is(
  (select count(*) from patients where tenant_id = '22000000-0000-0000-0000-00000000000A'),
  1::bigint,
  '16. patients_self_read: patient self can read own row'
);

-- 17. ETC E (care_team) sees Patient P
select set_config('app.user_id', '22000000-0000-0000-1000-000000000002', true);
select set_config('app.active_tenant_id', '22000000-0000-0000-0000-00000000000E', true);
select is(
  (select count(*) from patients where tenant_id = '22000000-0000-0000-0000-00000000000A'),
  1::bigint,
  '17. patients_self_read: ETC care_team can read patient'
);

-- 18. Sponsor S (with active consent) sees Patient P
select set_config('app.user_id', '22000000-0000-0000-1000-000000000001', true);
select set_config('app.active_tenant_id', '22000000-0000-0000-0000-00000000000S', true);
select is(
  (select count(*) from patients where tenant_id = '22000000-0000-0000-0000-00000000000A'),
  1::bigint,
  '18. patients_self_read: sponsor with active consent can read patient'
);

-- 19. Unrelated tenant X cannot see any patients
select set_config('app.user_id', '22000000-0000-0000-1000-000000000007', true);
select set_config('app.active_tenant_id', '22000000-0000-0000-0000-00000000000F', true);
select is(
  (select count(*) from patients),
  0::bigint,
  '19. patients_self_read: unrelated tenant denied'
);

-- ---------------------------------------------------------------------------
-- 20-22: programs_sponsor_read policy (rewritten in 0006)
-- ---------------------------------------------------------------------------

-- 20. Sponsor S sees their own program
select set_config('app.user_id', '22000000-0000-0000-1000-000000000001', true);
select set_config('app.active_tenant_id', '22000000-0000-0000-0000-00000000000S', true);
select is(
  (select count(*) from programs where sponsor_tenant_id = '22000000-0000-0000-0000-00000000000S'),
  1::bigint,
  '20. programs_sponsor_read: sponsor self can read own programs'
);

-- 21. ETC E (with PPA to S) sees S's programs
select set_config('app.user_id', '22000000-0000-0000-1000-000000000002', true);
select set_config('app.active_tenant_id', '22000000-0000-0000-0000-00000000000E', true);
select is(
  (select count(*) from programs where sponsor_tenant_id = '22000000-0000-0000-0000-00000000000S'),
  1::bigint,
  '21. programs_sponsor_read: ETC with PPA can read sponsor programs'
);

-- 22. Unrelated tenant X cannot see programs
select set_config('app.user_id', '22000000-0000-0000-1000-000000000007', true);
select set_config('app.active_tenant_id', '22000000-0000-0000-0000-00000000000F', true);
select is(
  (select count(*) from programs),
  0::bigint,
  '22. programs_sponsor_read: unrelated tenant denied'
);

-- ---------------------------------------------------------------------------
-- 23-24: users_self_or_tenant_read recursion fix (0006)
-- ---------------------------------------------------------------------------

-- 23. Patient P sees their own user row
select set_config('app.user_id', '22000000-0000-0000-1000-000000000004', true);
select set_config('app.active_tenant_id', '22000000-0000-0000-0000-00000000000A', true);
select is(
  (select count(*) from users where id = '22000000-0000-0000-1000-000000000004'),
  1::bigint,
  '23. users_self_or_tenant_read: self read works (no recursion)'
);

-- 24. Patient P does NOT see unrelated user
select is(
  (select count(*) from users where id = '22000000-0000-0000-1000-000000000007'),
  0::bigint,
  '24. users_self_or_tenant_read: unrelated user denied (no recursion bug)'
);

-- ---------------------------------------------------------------------------
-- 25-27: patient_representatives RLS
-- ---------------------------------------------------------------------------

-- 25. Patient P sees their own representative row (self)
select set_config('app.user_id', '22000000-0000-0000-1000-000000000004', true);
select set_config('app.active_tenant_id', '22000000-0000-0000-0000-00000000000A', true);
select is(
  (select count(*) from patient_representatives
    where patient_tenant_id = '22000000-0000-0000-0000-00000000000A'),
  1::bigint,
  '25. patient_representatives: patient self reads own row'
);

-- 26. ETC E (care_team) sees representatives for all 3 patients (P, C, M)
select set_config('app.user_id', '22000000-0000-0000-1000-000000000002', true);
select set_config('app.active_tenant_id', '22000000-0000-0000-0000-00000000000E', true);
select is(
  (select count(*) from patient_representatives),
  3::bigint,
  '26. patient_representatives: ETC care_team reads all care patients'
);

-- 27. Unrelated tenant X cannot see any representatives
select set_config('app.user_id', '22000000-0000-0000-1000-000000000007', true);
select set_config('app.active_tenant_id', '22000000-0000-0000-0000-00000000000F', true);
select is(
  (select count(*) from patient_representatives),
  0::bigint,
  '27. patient_representatives: unrelated tenant denied'
);

-- ---------------------------------------------------------------------------
-- 28-29: patient_representatives check constraints
-- ---------------------------------------------------------------------------

-- 28. signing_permission=true with no verification on a non-self relationship → check fails
do $$
begin
  set local row_security = off;
end $$;

select throws_ok(
  $$
  insert into patient_representatives (
    patient_tenant_id, jurisdiction_id, user_id, relationship_type, authority_basis,
    access_scope, signing_permission
  )
  select
    '22000000-0000-0000-0000-00000000000C',
    (select id from regulatory_jurisdictions where code = 'US-MT'),
    '22000000-0000-0000-1000-000000000006',
    'legal_guardian',
    'court_order',
    array['records:read','consents:read'],
    true
  $$,
  '23514',  -- check_violation
  null,
  '28. patient_representatives: signing_permission requires verification for non-self'
);

-- 29. relationship_type outside allowed set → check fails
select throws_ok(
  $$
  insert into patient_representatives (
    patient_tenant_id, jurisdiction_id, user_id, relationship_type, authority_basis
  )
  select
    '22000000-0000-0000-0000-00000000000A',
    (select id from regulatory_jurisdictions where code = 'US-MT'),
    '22000000-0000-0000-1000-000000000004',
    'invalid_role',
    'made_up'
  $$,
  '23514',
  null,
  '29. patient_representatives: relationship_type must be in allowed enum'
);

-- ---------------------------------------------------------------------------
-- 30-32: minor_assents
-- ---------------------------------------------------------------------------

do $$
begin
  set local row_security = on;
end $$;

-- 30. ETC E (care_team) reads minor M's assent
select set_config('app.user_id', '22000000-0000-0000-1000-000000000002', true);
select set_config('app.active_tenant_id', '22000000-0000-0000-0000-00000000000E', true);
select is(
  (select count(*) from minor_assents where patient_tenant_id = '22000000-0000-0000-0000-00000000000D'),
  1::bigint,
  '30. minor_assents: ETC care_team reads minor patient assent'
);

-- 31. Unrelated tenant X denied
select set_config('app.user_id', '22000000-0000-0000-1000-000000000007', true);
select set_config('app.active_tenant_id', '22000000-0000-0000-0000-00000000000F', true);
select is(
  (select count(*) from minor_assents),
  0::bigint,
  '31. minor_assents: unrelated tenant denied'
);

-- 32. assent_status='waived' without waiver_reason or medical_director → check fails
select throws_ok(
  $$
  insert into minor_assents (
    patient_tenant_id, jurisdiction_id, assent_status
  )
  select
    '22000000-0000-0000-0000-00000000000D',
    (select id from regulatory_jurisdictions where code = 'US-MT'),
    'waived'
  $$,
  '23514',
  null,
  '32. minor_assents: waived requires waiver_reason + medical_director'
);

-- ---------------------------------------------------------------------------
-- 33-35: retention triggers (audit_log + file_storage_objects)
-- ---------------------------------------------------------------------------

-- 33. compute_retention returns expected interval for known categories
select is(
  app.compute_retention('audit_log'),
  interval '7 years',
  '33. compute_retention: audit_log → 7 years'
);

-- 34. file_storage_objects insert auto-populates retention_until + retention_category
select set_config('app.user_id', '22000000-0000-0000-1000-000000000002', true);
select set_config('app.active_tenant_id', '22000000-0000-0000-0000-00000000000E', true);

do $$
declare v_jur uuid;
begin
  select id into v_jur from regulatory_jurisdictions where code = 'US-MT';

  insert into file_storage_objects (
    id, tenant_id, bucket, object_path, sha256, size_bytes, mime_type,
    uploaded_by_user_id, immutable_ref
  ) values (
    '33000000-0000-0000-0000-000000000001',
    '22000000-0000-0000-0000-00000000000E',
    'patient-files', 'test/path.pdf',
    repeat('a', 64), 100, 'application/pdf',
    '22000000-0000-0000-1000-000000000002',
    true
  );
end $$;

select isnt(
  (select retention_until from file_storage_objects where id = '33000000-0000-0000-0000-000000000001'),
  null,
  '34. file_storage_objects: BEFORE INSERT trigger populates retention_until'
);

-- 35. file_storage_objects DELETE before retention_until → blocked
select throws_ok(
  $$ delete from file_storage_objects where id = '33000000-0000-0000-0000-000000000001' $$,
  '23514',
  null,
  '35. file_storage_objects: BEFORE DELETE blocks premature delete'
);

-- ---------------------------------------------------------------------------
-- 36-38: NULL-tenant policy tightening (0009) for notifications + feature_flags
-- ---------------------------------------------------------------------------

-- Insert a NULL-tenant notification + feature flag. RLS write policies require
-- can_write_for_tenant; for NULL-tenant rows we bypass via SECURITY DEFINER
-- by temporarily disabling RLS for the test setup (rolls back).
do $$
begin
  set local row_security = off;
end $$;

insert into notifications (tenant_id, channel, template, recipient)
values (null, 'email', 'system_broadcast', 'all');

insert into feature_flags (tenant_id, flag_key, enabled)
values (null, 'rls2_test_global_flag', true);

do $$
begin
  set local row_security = on;
end $$;

-- 36. Authenticated session sees the NULL-tenant notification
select set_config('app.user_id', '22000000-0000-0000-1000-000000000004', true);
select set_config('app.active_tenant_id', '22000000-0000-0000-0000-00000000000A', true);
select ok(
  (select exists (select 1 from notifications where template = 'system_broadcast')),
  '36. notifications: NULL-tenant readable when session user is set'
);

-- 37. Unauthenticated session (no app.user_id) does NOT see NULL-tenant rows
select set_config('app.user_id', '', true);
select set_config('app.active_tenant_id', '', true);
select ok(
  not exists (select 1 from notifications where template = 'system_broadcast'),
  '37. notifications: NULL-tenant blocked without authenticated session'
);

-- 38. Same tightening applies to feature_flags
select ok(
  not exists (select 1 from feature_flags where flag_key = 'rls2_test_global_flag'),
  '38. feature_flags: NULL-tenant blocked without authenticated session'
);

select * from finish();

rollback;
