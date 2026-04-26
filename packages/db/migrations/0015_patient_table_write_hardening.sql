-- 0015_patient_table_write_hardening.sql
--
-- Extends the same hardening pattern 0012 introduced for
-- patient_representatives + minor_assents to the three remaining patient-tenant
-- write policies that still allowed a tenant_relationship('care_team') OR-branch
-- on its own. Without this, an etc_user (admin/ops, no clinical scope) holding
-- a care_team relationship can INSERT/UPDATE/DELETE rows in patients,
-- patient_data_sharing_consents, and patient_device_registry_entries despite
-- not having the corresponding action grant.
--
-- Mirrors 0012:
--   1. require app.current_tenant_member_grants_action(<action>) on the OR-branch
--   2. split FOR ALL into command-specific INSERT / UPDATE / DELETE policies so
--      write authority does not contribute to SELECT visibility.
--
-- patients_self_read (0006), patient_data_sharing_consents_member_read (0004),
-- and patient_device_registry_entries_member_read (0004) remain the sole
-- visibility gates after this change.

drop policy if exists patients_write on patients;

create policy patients_insert on patients
  for insert to public
  with check (
    app.can_write_for_tenant(tenant_id, 'patient:write')
    or (
      app.has_tenant_relationship(app.current_tenant_id(), tenant_id, 'care_team')
      and app.current_tenant_member_grants_action('patient:write')
    )
  );

create policy patients_update on patients
  for update to public
  using (
    app.can_write_for_tenant(tenant_id, 'patient:write')
    or (
      app.has_tenant_relationship(app.current_tenant_id(), tenant_id, 'care_team')
      and app.current_tenant_member_grants_action('patient:write')
    )
  )
  with check (
    app.can_write_for_tenant(tenant_id, 'patient:write')
    or (
      app.has_tenant_relationship(app.current_tenant_id(), tenant_id, 'care_team')
      and app.current_tenant_member_grants_action('patient:write')
    )
  );

create policy patients_delete on patients
  for delete to public
  using (
    app.can_write_for_tenant(tenant_id, 'patient:write')
    or (
      app.has_tenant_relationship(app.current_tenant_id(), tenant_id, 'care_team')
      and app.current_tenant_member_grants_action('patient:write')
    )
  );

drop policy if exists patient_data_sharing_consents_write on patient_data_sharing_consents;

create policy patient_data_sharing_consents_insert on patient_data_sharing_consents
  for insert to public
  with check (
    app.can_write_for_tenant(patient_tenant_id, 'consent:write')
    or (
      app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
      and app.current_tenant_member_grants_action('consent:write')
    )
  );

create policy patient_data_sharing_consents_update on patient_data_sharing_consents
  for update to public
  using (
    app.can_write_for_tenant(patient_tenant_id, 'consent:write')
    or (
      app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
      and app.current_tenant_member_grants_action('consent:write')
    )
  )
  with check (
    app.can_write_for_tenant(patient_tenant_id, 'consent:write')
    or (
      app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
      and app.current_tenant_member_grants_action('consent:write')
    )
  );

create policy patient_data_sharing_consents_delete on patient_data_sharing_consents
  for delete to public
  using (
    app.can_write_for_tenant(patient_tenant_id, 'consent:write')
    or (
      app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
      and app.current_tenant_member_grants_action('consent:write')
    )
  );

drop policy if exists patient_device_registry_entries_write on patient_device_registry_entries;

create policy patient_device_registry_entries_insert on patient_device_registry_entries
  for insert to public
  with check (
    app.can_write_for_tenant(patient_tenant_id, 'device_registry:write')
    or (
      app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
      and app.current_tenant_member_grants_action('device_registry:write')
    )
  );

create policy patient_device_registry_entries_update on patient_device_registry_entries
  for update to public
  using (
    app.can_write_for_tenant(patient_tenant_id, 'device_registry:write')
    or (
      app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
      and app.current_tenant_member_grants_action('device_registry:write')
    )
  )
  with check (
    app.can_write_for_tenant(patient_tenant_id, 'device_registry:write')
    or (
      app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
      and app.current_tenant_member_grants_action('device_registry:write')
    )
  );

create policy patient_device_registry_entries_delete on patient_device_registry_entries
  for delete to public
  using (
    app.can_write_for_tenant(patient_tenant_id, 'device_registry:write')
    or (
      app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
      and app.current_tenant_member_grants_action('device_registry:write')
    )
  );
