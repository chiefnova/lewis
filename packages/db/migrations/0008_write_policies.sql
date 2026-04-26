-- 0008_write_policies.sql
--
-- Adds INSERT / UPDATE / DELETE RLS policies to every RLS-enabled table.
--
-- Context: 0001/0002/0004/0005 enable RLS but only define SELECT policies.
-- Default RLS denies every INSERT/UPDATE/DELETE. The first feature PR would
-- otherwise have to invent the write-policy pattern under deadline pressure.
-- This migration establishes the contract:
--
--   * app.can_write_for_tenant(target_tenant_id uuid, action text) returns boolean
--     SECURITY DEFINER — single source of truth for "can current session
--     mutate things owned by target_tenant_id under this action".
--
--   * Per-table policies are extremely thin: each one passes its tenant column
--     and an action constant to the helper. To add write access for a new role
--     or action, edit the helper, not 14 separate policies.
--
-- The helper grants write capability based on:
--   1. Active tenant_memberships row in target tenant with a role allowed for
--      the action. Role-action mapping lives in the helper as a CASE table.
--   2. Active support grant whose scopes include the action.
--   3. Active tenant_relationship of the right kind (e.g. care_team can
--      append patient_data_sharing_consents on the patient's behalf during
--      onboarding).
--
-- Default-deny remains. If can_write_for_tenant returns false, the operation
-- is blocked. Adding a new RLS-enabled table without write policies is caught
-- by the CI gate in .github/workflows/api-ci.yml ("RLS tables must have all
-- four operations").

-- ---------------------------------------------------------------------------
-- Action vocabulary (documented for reviewers; not enforced by enum because
-- adding a new action to a CASE is a 1-line patch, while changing an enum is
-- a migration. Keep the list short and avoid action sprawl.)
-- ---------------------------------------------------------------------------
--   tenant:write              — administrative write on a tenant record itself
--   user:write                — write to a user row (self only, except corridor_admin)
--   membership:write          — manage tenant_memberships
--   relationship:write        — manage tenant_relationships
--   support_grant:write       — issue/revoke support_access_grants (corridor_admin only)
--   audit:write               — INSERT only; UPDATE/DELETE blocked by trigger from 0003
--   file:write                — write to file_storage_objects
--   notification:write        — enqueue notifications
--   feature_flag:write        — toggle feature_flags
--   regulatory:write          — manage regulatory_jurisdictions / regulatory_rule_versions (corridor_admin)
--   sponsor:write             — sponsor_organizations (sponsor_admin or corridor_admin)
--   etc:write                 — etcs (etc_admin or corridor_admin)
--   patient:write             — patients (patient self, ETC care_team, corridor_admin)
--   program:write             — programs (sponsor_admin)
--   device:write              — investigational_devices (sponsor_admin)
--   facility:write            — inpatient_facility_profiles (etc_admin)
--   payment_rail:write        — payment_rails (corridor_admin)
--   payment_obligation:write  — payment_obligations (etc_admin or sponsor_admin per legal_basis)
--   payment_transaction:write — payment_transactions (system role via webhook handler — not a user-facing action)
--   hfar:write                — hfar_path_a_allocations (etc_admin)
--   consent:write             — patient_data_sharing_consents (patient self)
--   device_registry:write     — patient_device_registry_entries (patient self or etc care_team)
--   search_index:write        — search_index_documents / search_index_jobs (system role)
--
-- Roles referenced (from tenant_memberships.role):
--   sponsor_admin, sponsor_user
--   etc_admin, etc_user, etc_clinician
--   patient
--   board_reviewer
--   corridor_admin, corridor_support
-- There is intentionally no "system role" RLS bypass. Worker and webhook
-- handlers must either run with an auditable Corridor user/tenant context that
-- passes these policies, or use a future explicitly scoped elevated worker
-- path that writes its own audit evidence. App runtimes never receive
-- SUPERUSER, BYPASSRLS, or table-owner credentials.

-- ---------------------------------------------------------------------------
-- Helper
-- ---------------------------------------------------------------------------

create or replace function app.role_grants_action(role_name text, action text)
returns boolean
language sql
immutable
as $$
  select case action
    when 'tenant:write'              then role_name in ('sponsor_admin', 'etc_admin', 'corridor_admin')
    when 'user:write'                then role_name in ('corridor_admin')
    when 'membership:write'          then role_name in ('sponsor_admin', 'etc_admin', 'corridor_admin')
    when 'relationship:write'        then role_name in ('sponsor_admin', 'etc_admin', 'corridor_admin')
    when 'support_grant:write'       then role_name in ('corridor_admin')
    when 'audit:write'               then true  -- any authenticated session can write audit rows; immutability trigger from 0003 handles tampering
    when 'file:write'                then role_name in ('sponsor_admin', 'sponsor_user', 'etc_admin', 'etc_user', 'etc_clinician', 'patient', 'corridor_admin')
    when 'notification:write'        then role_name in ('corridor_admin')  -- normally enqueued by workers, not directly by users
    when 'feature_flag:write'        then role_name in ('corridor_admin')
    when 'regulatory:write'          then role_name in ('corridor_admin')
    when 'sponsor:write'             then role_name in ('sponsor_admin', 'corridor_admin')
    when 'etc:write'                 then role_name in ('etc_admin', 'corridor_admin')
    when 'patient:write'             then role_name in ('patient', 'etc_admin', 'etc_clinician', 'corridor_admin')
    when 'program:write'             then role_name in ('sponsor_admin', 'corridor_admin')
    when 'device:write'              then role_name in ('sponsor_admin', 'corridor_admin')
    when 'facility:write'            then role_name in ('etc_admin', 'corridor_admin')
    when 'payment_rail:write'        then role_name in ('corridor_admin')
    when 'payment_obligation:write'  then role_name in ('sponsor_admin', 'etc_admin', 'corridor_admin')
    when 'payment_transaction:write' then role_name in ('corridor_admin')  -- normally written by webhook worker
    when 'hfar:write'                then role_name in ('etc_admin', 'corridor_admin')
    when 'consent:write'             then role_name in ('patient', 'etc_admin', 'etc_clinician', 'corridor_admin')
    when 'device_registry:write'     then role_name in ('patient', 'etc_admin', 'etc_clinician', 'corridor_admin')
    when 'search_index:write'        then role_name in ('corridor_admin')
    else false  -- default-deny for unknown actions
  end
$$;

comment on function app.role_grants_action(text, text) is
  'Single source of truth for role → action grants. Default-deny for unknown actions. Edit one function to change global write permissions.';

create or replace function app.can_write_for_tenant(target_tenant_id uuid, action text)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select
    -- Path 1: active tenant_memberships row in target tenant with a role
    --         allowed for the action. Read tenant_memberships under elevated
    --         privilege (security definer) to avoid recursing into the table's
    --         own RLS.
    exists (
      select 1
      from tenant_memberships tm
      where tm.tenant_id = target_tenant_id
        and tm.user_id = app.current_user_id()
        and tm.status = 'active'
        and tm.starts_at <= now()
        and (tm.ends_at is null or tm.ends_at > now())
        and app.role_grants_action(tm.role, action)
    )
    -- Path 2: active support grant whose scopes include the action's :write scope.
    or app.has_active_support_grant(target_tenant_id, action)
$$;

comment on function app.can_write_for_tenant(uuid, text) is
  'Authoritative gate for write operations against a target tenant. Returns true if (a) session user has an active membership in target tenant whose role grants the action, OR (b) session user has an active support grant scoped for the action.';

-- ---------------------------------------------------------------------------
-- Tenant infrastructure: tenants, users, tenant_memberships, tenant_relationships,
-- support_access_grants
-- ---------------------------------------------------------------------------

create policy tenants_write on tenants
  for all to public
  using (app.can_write_for_tenant(id, 'tenant:write'))
  with check (app.can_write_for_tenant(id, 'tenant:write'));

create policy users_write on users
  for all to public
  using (
    -- A user can update their own row; corridor_admin has user:write and we
    -- approximate "tenant" for this table by using the user's primary tenant
    -- (any active membership tenant suffices because user:write is admin-only
    -- elsewhere).
    id = app.current_user_id()
    or exists (
      select 1
      from tenant_memberships tm
      where tm.user_id = app.current_user_id()
        and tm.status = 'active'
        and app.role_grants_action(tm.role, 'user:write')
    )
  )
  with check (
    id = app.current_user_id()
    or exists (
      select 1
      from tenant_memberships tm
      where tm.user_id = app.current_user_id()
        and tm.status = 'active'
        and app.role_grants_action(tm.role, 'user:write')
    )
  );

create policy tenant_memberships_write on tenant_memberships
  for all to public
  using (app.can_write_for_tenant(tenant_id, 'membership:write'))
  with check (app.can_write_for_tenant(tenant_id, 'membership:write'));

create policy tenant_relationships_write on tenant_relationships
  for all to public
  using (
    app.can_write_for_tenant(from_tenant_id, 'relationship:write')
    or app.can_write_for_tenant(to_tenant_id, 'relationship:write')
  )
  with check (
    app.can_write_for_tenant(from_tenant_id, 'relationship:write')
    or app.can_write_for_tenant(to_tenant_id, 'relationship:write')
  );

create policy support_access_grants_write on support_access_grants
  for all to public
  using (app.can_write_for_tenant(target_tenant_id, 'support_grant:write'))
  with check (app.can_write_for_tenant(target_tenant_id, 'support_grant:write'));

-- audit_log: INSERT-only by RLS, UPDATE/DELETE blocked by 0003 immutability triggers.
-- We use a SELECT-style policy here rather than FOR ALL because UPDATE/DELETE
-- are physically prevented by triggers; making them RLS-allowed-but-trigger-blocked
-- gives clearer error messages than "RLS denied".
create policy audit_log_insert on audit_log
  for insert to public
  with check (
    tenant_id is null
    or app.can_write_for_tenant(tenant_id, 'audit:write')
  );

create policy file_storage_objects_write on file_storage_objects
  for all to public
  using (app.can_write_for_tenant(tenant_id, 'file:write'))
  with check (app.can_write_for_tenant(tenant_id, 'file:write'));

create policy notifications_write on notifications
  for all to public
  using (
    tenant_id is null
    or app.can_write_for_tenant(tenant_id, 'notification:write')
  )
  with check (
    tenant_id is null
    or app.can_write_for_tenant(tenant_id, 'notification:write')
  );

create policy feature_flags_write on feature_flags
  for all to public
  using (
    tenant_id is null
    or app.can_write_for_tenant(tenant_id, 'feature_flag:write')
  )
  with check (
    tenant_id is null
    or app.can_write_for_tenant(tenant_id, 'feature_flag:write')
  );

-- ---------------------------------------------------------------------------
-- Regulatory primitives (0002)
-- ---------------------------------------------------------------------------
--
-- regulatory_jurisdictions and regulatory_rule_versions are global lookup
-- tables. Read is open (SELECT policies in 0002 use `using (true)`). Writes
-- are corridor_admin-only and don't have a tenant column to gate on, so we
-- check role membership directly via a sentinel "any tenant" predicate.

create policy regulatory_jurisdictions_write on regulatory_jurisdictions
  for all to public
  using (
    exists (
      select 1
      from tenant_memberships tm
      where tm.user_id = app.current_user_id()
        and tm.status = 'active'
        and app.role_grants_action(tm.role, 'regulatory:write')
    )
  )
  with check (
    exists (
      select 1
      from tenant_memberships tm
      where tm.user_id = app.current_user_id()
        and tm.status = 'active'
        and app.role_grants_action(tm.role, 'regulatory:write')
    )
  );

create policy regulatory_rule_versions_write on regulatory_rule_versions
  for all to public
  using (
    exists (
      select 1
      from tenant_memberships tm
      where tm.user_id = app.current_user_id()
        and tm.status = 'active'
        and app.role_grants_action(tm.role, 'regulatory:write')
    )
  )
  with check (
    exists (
      select 1
      from tenant_memberships tm
      where tm.user_id = app.current_user_id()
        and tm.status = 'active'
        and app.role_grants_action(tm.role, 'regulatory:write')
    )
  );

-- ---------------------------------------------------------------------------
-- Architecture stubs (0004)
-- ---------------------------------------------------------------------------

create policy sponsor_organizations_write on sponsor_organizations
  for all to public
  using (app.can_write_for_tenant(tenant_id, 'sponsor:write'))
  with check (app.can_write_for_tenant(tenant_id, 'sponsor:write'));

create policy etcs_write on etcs
  for all to public
  using (app.can_write_for_tenant(tenant_id, 'etc:write'))
  with check (app.can_write_for_tenant(tenant_id, 'etc:write'));

create policy patients_write on patients
  for all to public
  using (
    app.can_write_for_tenant(tenant_id, 'patient:write')
    or app.has_tenant_relationship(app.current_tenant_id(), tenant_id, 'care_team')
  )
  with check (
    app.can_write_for_tenant(tenant_id, 'patient:write')
    or app.has_tenant_relationship(app.current_tenant_id(), tenant_id, 'care_team')
  );

create policy programs_write on programs
  for all to public
  using (app.can_write_for_tenant(sponsor_tenant_id, 'program:write'))
  with check (app.can_write_for_tenant(sponsor_tenant_id, 'program:write'));

create policy investigational_devices_write on investigational_devices
  for all to public
  using (app.can_write_for_tenant(sponsor_tenant_id, 'device:write'))
  with check (app.can_write_for_tenant(sponsor_tenant_id, 'device:write'));

create policy inpatient_facility_profiles_write on inpatient_facility_profiles
  for all to public
  using (app.can_write_for_tenant(etc_tenant_id, 'facility:write'))
  with check (app.can_write_for_tenant(etc_tenant_id, 'facility:write'));

-- payment_rails is a global lookup, corridor_admin-only writes.
create policy payment_rails_write on payment_rails
  for all to public
  using (
    exists (
      select 1
      from tenant_memberships tm
      where tm.user_id = app.current_user_id()
        and tm.status = 'active'
        and app.role_grants_action(tm.role, 'payment_rail:write')
    )
  )
  with check (
    exists (
      select 1
      from tenant_memberships tm
      where tm.user_id = app.current_user_id()
        and tm.status = 'active'
        and app.role_grants_action(tm.role, 'payment_rail:write')
    )
  );

create policy payment_obligations_write on payment_obligations
  for all to public
  using (
    (patient_tenant_id is not null and app.can_write_for_tenant(patient_tenant_id, 'payment_obligation:write'))
    or (etc_tenant_id is not null and app.can_write_for_tenant(etc_tenant_id, 'payment_obligation:write'))
  )
  with check (
    (patient_tenant_id is not null and app.can_write_for_tenant(patient_tenant_id, 'payment_obligation:write'))
    or (etc_tenant_id is not null and app.can_write_for_tenant(etc_tenant_id, 'payment_obligation:write'))
  );

-- payment_transactions are normally written by webhook handlers. Block broad
-- user-facing writes by default; webhook workers must set an auditable
-- Corridor admin context or use a future explicitly scoped elevated worker
-- path, never a general app-runtime RLS bypass.
create policy payment_transactions_write on payment_transactions
  for all to public
  using (
    exists (
      select 1
      from tenant_memberships tm
      where tm.user_id = app.current_user_id()
        and tm.status = 'active'
        and app.role_grants_action(tm.role, 'payment_transaction:write')
    )
  )
  with check (
    exists (
      select 1
      from tenant_memberships tm
      where tm.user_id = app.current_user_id()
        and tm.status = 'active'
        and app.role_grants_action(tm.role, 'payment_transaction:write')
    )
  );

create policy hfar_path_a_allocations_write on hfar_path_a_allocations
  for all to public
  using (
    etc_tenant_id is not null
    and app.can_write_for_tenant(etc_tenant_id, 'hfar:write')
  )
  with check (
    etc_tenant_id is not null
    and app.can_write_for_tenant(etc_tenant_id, 'hfar:write')
  );

create policy patient_data_sharing_consents_write on patient_data_sharing_consents
  for all to public
  using (
    app.can_write_for_tenant(patient_tenant_id, 'consent:write')
    or app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
  )
  with check (
    app.can_write_for_tenant(patient_tenant_id, 'consent:write')
    or app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
  );

create policy patient_device_registry_entries_write on patient_device_registry_entries
  for all to public
  using (
    app.can_write_for_tenant(patient_tenant_id, 'device_registry:write')
    or app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
  )
  with check (
    app.can_write_for_tenant(patient_tenant_id, 'device_registry:write')
    or app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
  );

-- ---------------------------------------------------------------------------
-- Search foundation (0005)
-- ---------------------------------------------------------------------------
--
-- search_index_documents and search_index_jobs are written by background
-- search indexers, not user-facing handlers. Block broad user writes by
-- default; workers must set an auditable Corridor admin context or use a
-- future explicitly scoped elevated worker path.

create policy search_index_documents_write on search_index_documents
  for all to public
  using (
    exists (
      select 1
      from tenant_memberships tm
      where tm.user_id = app.current_user_id()
        and tm.status = 'active'
        and app.role_grants_action(tm.role, 'search_index:write')
    )
  )
  with check (
    exists (
      select 1
      from tenant_memberships tm
      where tm.user_id = app.current_user_id()
        and tm.status = 'active'
        and app.role_grants_action(tm.role, 'search_index:write')
    )
  );

create policy search_index_jobs_write on search_index_jobs
  for all to public
  using (
    exists (
      select 1
      from tenant_memberships tm
      where tm.user_id = app.current_user_id()
        and tm.status = 'active'
        and app.role_grants_action(tm.role, 'search_index:write')
    )
  )
  with check (
    exists (
      select 1
      from tenant_memberships tm
      where tm.user_id = app.current_user_id()
        and tm.status = 'active'
        and app.role_grants_action(tm.role, 'search_index:write')
    )
  );
