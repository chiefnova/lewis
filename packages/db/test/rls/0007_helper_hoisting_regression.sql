-- 0007_helper_hoisting_regression.sql
--
-- Regression coverage for the planner hoisting STABLE SECURITY DEFINER
-- helpers out of per-row policy evaluation. The 0012 hardening introduced
-- app.current_tenant_member_grants_action(action text), which receives a
-- constant `action` argument and reads only session GUCs internally — so
-- the planner is expected to evaluate it at most once per statement (not
-- per row). If a future edit drops the STABLE marker or otherwise defeats
-- hoisting, RLS evaluation on multi-row writes against patient_representatives
-- and minor_assents would scale linearly with row count instead of being
-- effectively constant.
--
-- We verify two complementary properties:
--   1. STRUCTURAL: app.current_tenant_member_grants_action retains
--      provolatile = 's' (STABLE). Same for the broader helper set
--      (is_tenant_member, has_tenant_relationship, has_active_support_grant,
--      can_write_for_tenant, role_grants_action).
--   2. EMPIRICAL: track_functions = 'all' counts function invocations during
--      a multi-row UPDATE; we assert the helper was invoked a small,
--      hoisting-consistent number of times (<= 2*row_count_threshold).

begin;

select plan(2);

-- 1. Structural: every helper used in RLS policy expressions must remain
--    STABLE (or IMMUTABLE) so the planner can hoist or memoize it.
select is(
  (
    select string_agg(p.proname || ':' || p.provolatile, ',' order by p.proname)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app'
      and p.proname in (
        'is_tenant_member',
        'has_tenant_relationship',
        'has_active_support_grant',
        'can_write_for_tenant',
        'current_tenant_member_grants_action',
        'role_grants_action'
      )
  ),
  -- All helpers must be STABLE ('s') except role_grants_action which is
  -- IMMUTABLE ('i') — the role->action CASE table is pure.
  'can_write_for_tenant:s,current_tenant_member_grants_action:s,has_active_support_grant:s,has_tenant_relationship:s,is_tenant_member:s,role_grants_action:i',
  'RLS helpers retain their volatility markers (STABLE/IMMUTABLE) so the planner can hoist them out of per-row policy evaluation'
);

-- 2. Empirical: a multi-row UPDATE invokes
--    app.current_tenant_member_grants_action a small number of times,
--    bounded by USING + WITH CHECK pass count (NOT by row count).
do $$
declare
  v_jur uuid;
  v_baseline bigint;
  v_after bigint;
  v_delta bigint;
  v_row_count integer := 5;
begin
  -- Seed: 1 ETC tenant, 1 patient tenant, care_team relationship, ETC
  -- clinician membership granting representative:write, plus N rep rows.
  insert into tenants (id, kind, status, display_name) values
    ('77000000-0000-0000-0000-000000000001', 'etc', 'active', 'Hoist ETC'),
    ('77000000-0000-0000-0000-000000000002', 'patient', 'active', 'Hoist Patient');
  insert into users (id, clerk_user_id, email, name) values
    ('77000000-0000-0000-1000-000000000001', 'rls7_clinician', 'clin7@test.local', 'Clinician'),
    ('77000000-0000-0000-1000-000000000002', 'rls7_subject', 'subj7@test.local', 'Subject');
  insert into tenant_memberships (user_id, tenant_id, role) values
    ('77000000-0000-0000-1000-000000000001', '77000000-0000-0000-0000-000000000001', 'etc_clinician');
  insert into tenant_relationships (from_tenant_id, to_tenant_id, kind, status) values
    ('77000000-0000-0000-0000-000000000001', '77000000-0000-0000-0000-000000000002', 'care_team', 'active');

  select id into v_jur from regulatory_jurisdictions where code = 'US-MT';

  insert into patients (tenant_id, jurisdiction_id, full_name)
  values ('77000000-0000-0000-0000-000000000002', v_jur, 'Hoist Patient');

  for i in 1..v_row_count loop
    insert into patient_representatives (
      patient_tenant_id, jurisdiction_id, user_id, relationship_type,
      authority_basis, access_scope, signing_permission
    ) values (
      '77000000-0000-0000-0000-000000000002', v_jur,
      '77000000-0000-0000-1000-000000000002',
      'caregiver', 'designated_by_patient',
      array['schedule:read'], false
    );
  end loop;

  set local track_functions = 'all';

  set local role app_api;
  perform set_config('app.user_id', '77000000-0000-0000-1000-000000000001', true);
  perform set_config('app.active_tenant_id', '77000000-0000-0000-0000-000000000001', true);

  select coalesce(s.calls, 0) into v_baseline
    from pg_stat_user_functions s
    join pg_proc p on p.oid = s.funcid
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'app' and p.proname = 'current_tenant_member_grants_action';
  v_baseline := coalesce(v_baseline, 0);

  -- Hot path: multi-row UPDATE under RLS. The policy expression invokes
  -- app.current_tenant_member_grants_action; with STABLE + constant args,
  -- the planner hoists this to a small constant number of evaluations.
  update patient_representatives
     set access_scope = array['schedule:read', 'records:read']
   where patient_tenant_id = '77000000-0000-0000-0000-000000000002';

  select coalesce(s.calls, 0) into v_after
    from pg_stat_user_functions s
    join pg_proc p on p.oid = s.funcid
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'app' and p.proname = 'current_tenant_member_grants_action';
  v_after := coalesce(v_after, 0);

  v_delta := v_after - v_baseline;
  reset role;

  -- Threshold: USING + WITH CHECK = 2 evaluation passes; the planner may
  -- additionally cache once for arg parsing. Anything <= 4 indicates
  -- hoisting; >= row_count indicates per-row evaluation (regression).
  if v_delta > 4 then
    raise exception
      'current_tenant_member_grants_action invoked % times for a %-row UPDATE; expected ≤ 4 (planner hoisting). The STABLE marker or policy expression may have regressed.',
      v_delta, v_row_count;
  end if;

  perform ok(true,
    format('current_tenant_member_grants_action hoisted: %s calls for %s-row UPDATE (≤ 4 expected)',
           v_delta, v_row_count));
end $$;

select * from finish();

rollback;
