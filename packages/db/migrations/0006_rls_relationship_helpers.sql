-- 0006_rls_relationship_helpers.sql
--
-- Fixes three correctness bugs in the original RLS policies from 0001 + 0004:
--
--   1) users_self_or_tenant_read joined tenant_memberships directly inside USING(...)
--      with no SECURITY DEFINER helper. tenant_memberships itself has RLS, so the
--      policy could recursively re-evaluate (silent denial-of-rows or recursion error).
--      Fix: introduce app.shares_tenant_with(target_user_id) SECURITY DEFINER and
--      rewrite the policy to call it.
--
--   2) patients_self_read only allowed (tenant_id = current_tenant_id()) plus support
--      grants. Per the project model, ETCs treat patients (care_team relationship)
--      and manufacturers see consented data (patient_data_sharing_consents). Neither path
--      was in the policy, so the first patient view from an ETC dashboard returned
--      zero rows. Fix: union with care_team relationship + active-consent predicate.
--
--   3) programs_manufacturer_read only allowed the manufacturer tenant. ETCs need to view
--      manufacturer programs to enroll patients. Fix: union with PPA relationship.
--
-- All three policies are dropped and recreated in this migration. The new
-- SECURITY DEFINER helpers are pinned to a fixed search_path to avoid
-- search_path-injection class issues.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function app.shares_tenant_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from tenant_memberships tm_self
    join tenant_memberships tm_other on tm_other.tenant_id = tm_self.tenant_id
    where tm_self.user_id = app.current_user_id()
      and tm_other.user_id = target_user_id
      and tm_self.status = 'active'
      and tm_other.status = 'active'
      and tm_self.starts_at <= now()
      and (tm_self.ends_at is null or tm_self.ends_at > now())
      and tm_other.starts_at <= now()
      and (tm_other.ends_at is null or tm_other.ends_at > now())
  )
$$;

comment on function app.shares_tenant_with(uuid) is
  'True when current session user shares an active tenant_memberships row with target_user_id. SECURITY DEFINER bypasses RLS on tenant_memberships to avoid recursive policy evaluation. Used by users_self_or_tenant_read.';

create or replace function app.has_active_consent_for_manufacturer(
  target_patient_tenant_id uuid,
  target_manufacturer_tenant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from patient_data_sharing_consents pdsc
    where pdsc.patient_tenant_id = target_patient_tenant_id
      and pdsc.manufacturer_tenant_id = target_manufacturer_tenant_id
      and pdsc.status = 'active'
      and pdsc.starts_at is not null
      and pdsc.starts_at <= now()
      and pdsc.revoked_at is null
  )
$$;

comment on function app.has_active_consent_for_manufacturer(uuid, uuid) is
  'True when patient tenant has an active, unrevoked data-sharing consent with manufacturer tenant. SECURITY DEFINER so policies can call it without recursing into RLS on patient_data_sharing_consents.';

-- ---------------------------------------------------------------------------
-- Fix 1: users_self_or_tenant_read recursion
-- ---------------------------------------------------------------------------

drop policy if exists users_self_or_tenant_read on users;

create policy users_self_or_tenant_read on users
  for select
  using (
    id = app.current_user_id()
    or app.shares_tenant_with(id)
  );

-- ---------------------------------------------------------------------------
-- Fix 2: patients_self_read → add care_team + consented manufacturer paths
-- ---------------------------------------------------------------------------

drop policy if exists patients_self_read on patients;

create policy patients_self_read on patients
  for select
  using (
    tenant_id = app.current_tenant_id()
    or app.has_tenant_relationship(app.current_tenant_id(), tenant_id, 'care_team')
    or app.has_active_consent_for_manufacturer(tenant_id, app.current_tenant_id())
    or app.has_active_support_grant(tenant_id, 'patient:read')
  );

-- ---------------------------------------------------------------------------
-- Fix 3: programs_manufacturer_read → add PPA-related ETC visibility
-- ---------------------------------------------------------------------------

drop policy if exists programs_manufacturer_read on programs;

create policy programs_manufacturer_read on programs
  for select
  using (
    manufacturer_tenant_id = app.current_tenant_id()
    or app.has_tenant_relationship(app.current_tenant_id(), manufacturer_tenant_id, 'ppa')
    or app.has_active_support_grant(manufacturer_tenant_id, 'tenant:read')
  );
