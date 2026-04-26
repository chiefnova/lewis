-- 0012_representative_write_hardening.sql
--
-- Tightens patient representative/minor assent writes so an ETC care-team
-- relationship is not enough by itself. The session user must also hold a
-- tenant_memberships role in the active ETC tenant that grants the action.
-- Also aligns the signing-authority constraint with the table comment:
-- non-self signing authority requires a verified authority document.
-- Policies are command-specific rather than FOR ALL so write authority cannot
-- accidentally widen SELECT visibility.

create or replace function app.current_tenant_member_grants_action(action text)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1
    from tenant_memberships tm
    where tm.tenant_id = app.current_tenant_id()
      and tm.user_id = app.current_user_id()
      and tm.status = 'active'
      and tm.starts_at <= now()
      and (tm.ends_at is null or tm.ends_at > now())
      and app.role_grants_action(tm.role, action)
  )
$$;

comment on function app.current_tenant_member_grants_action(text) is
  'True when the current session user has an active membership in app.current_tenant_id() whose role grants the requested action. SECURITY DEFINER avoids recursive RLS reads on tenant_memberships.';

grant execute on function app.current_tenant_member_grants_action(text) to app_api, app_worker;

alter table patient_representatives
  drop constraint if exists patient_representatives_signing_requires_verification;

-- Added as NOT VALID so a deployment that finds existing rows with
-- signing_permission=true, non-self relationship, verified_by/verified_at set
-- but null authority_document_file_id (which were valid under the dropped
-- constraint) does not abort. The follow-on VALIDATE CONSTRAINT runs the same
-- full-table check but takes only a SHARE UPDATE EXCLUSIVE lock; backfill
-- offending rows in a separate migration if any are detected.
alter table patient_representatives
  add constraint patient_representatives_signing_requires_verified_document check (
    signing_permission = false
    or relationship_type = 'self'
    or (
      authority_document_file_id is not null
      and verified_by_user_id is not null
      and verified_at is not null
    )
  ) not valid;

alter table patient_representatives
  validate constraint patient_representatives_signing_requires_verified_document;

comment on constraint patient_representatives_signing_requires_verified_document
  on patient_representatives is
  'Non-self signing authority requires an attached authority document and verification metadata.';

drop policy if exists patient_representatives_write on patient_representatives;
drop policy if exists patient_representatives_insert on patient_representatives;
drop policy if exists patient_representatives_update on patient_representatives;
drop policy if exists patient_representatives_delete on patient_representatives;
create policy patient_representatives_insert on patient_representatives
  for insert to public
  with check (
    app.can_write_for_tenant(patient_tenant_id, 'representative:write')
    or (
      app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
      and app.current_tenant_member_grants_action('representative:write')
    )
  );

create policy patient_representatives_update on patient_representatives
  for update to public
  using (
    app.can_write_for_tenant(patient_tenant_id, 'representative:write')
    or (
      app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
      and app.current_tenant_member_grants_action('representative:write')
    )
  )
  with check (
    app.can_write_for_tenant(patient_tenant_id, 'representative:write')
    or (
      app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
      and app.current_tenant_member_grants_action('representative:write')
    )
  );

create policy patient_representatives_delete on patient_representatives
  for delete to public
  using (
    app.can_write_for_tenant(patient_tenant_id, 'representative:write')
    or (
      app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
      and app.current_tenant_member_grants_action('representative:write')
    )
  );

drop policy if exists minor_assents_write on minor_assents;
drop policy if exists minor_assents_insert on minor_assents;
drop policy if exists minor_assents_update on minor_assents;
drop policy if exists minor_assents_delete on minor_assents;
create policy minor_assents_insert on minor_assents
  for insert to public
  with check (
    app.can_write_for_tenant(patient_tenant_id, 'minor_assent:write')
    or (
      app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
      and app.current_tenant_member_grants_action('minor_assent:write')
    )
  );

create policy minor_assents_update on minor_assents
  for update to public
  using (
    app.can_write_for_tenant(patient_tenant_id, 'minor_assent:write')
    or (
      app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
      and app.current_tenant_member_grants_action('minor_assent:write')
    )
  )
  with check (
    app.can_write_for_tenant(patient_tenant_id, 'minor_assent:write')
    or (
      app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
      and app.current_tenant_member_grants_action('minor_assent:write')
    )
  );

create policy minor_assents_delete on minor_assents
  for delete to public
  using (
    app.can_write_for_tenant(patient_tenant_id, 'minor_assent:write')
    or (
      app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
      and app.current_tenant_member_grants_action('minor_assent:write')
    )
  );
