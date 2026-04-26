-- 0016_global_write_admin_only.sql
--
-- 0014 split notifications_write / feature_flags_write from FOR ALL into
-- command-specific INSERT / UPDATE / DELETE policies to fix the
-- SELECT-visibility leak. The write side preserved the pre-existing
-- `tenant_id IS NULL OR app.can_write_for_tenant(...)` shape, which lets any
-- authenticated app_api/app_worker session — including one with no app.user_id
-- set — write rows where tenant_id IS NULL. Per 0009 those NULL-tenant rows
-- are visible to every authenticated tenant, so a sponsor_user, etc_user,
-- patient, or even an unauthenticated app_api session can mint a global
-- notification or flip a global feature flag.
--
-- This migration tightens the NULL-tenant branch to require an authenticated
-- session whose role explicitly grants notification:write / feature_flag:write
-- via app.role_grants_action (today: corridor_admin only, per 0008's mapping).
-- Pattern matches regulatory_jurisdictions_write and payment_rails_write in
-- 0008, which already gate global writes via an explicit role-membership check.

drop policy if exists notifications_insert on notifications;
drop policy if exists notifications_update on notifications;
drop policy if exists notifications_delete on notifications;

create policy notifications_insert on notifications
  for insert to public
  with check (
    case
      when tenant_id is null then exists (
        select 1
        from tenant_memberships tm
        where tm.user_id = app.current_user_id()
          and tm.status = 'active'
          and tm.starts_at <= now()
          and (tm.ends_at is null or tm.ends_at > now())
          and app.role_grants_action(tm.role, 'notification:write')
      )
      else app.can_write_for_tenant(tenant_id, 'notification:write')
    end
  );

create policy notifications_update on notifications
  for update to public
  using (
    case
      when tenant_id is null then exists (
        select 1
        from tenant_memberships tm
        where tm.user_id = app.current_user_id()
          and tm.status = 'active'
          and tm.starts_at <= now()
          and (tm.ends_at is null or tm.ends_at > now())
          and app.role_grants_action(tm.role, 'notification:write')
      )
      else app.can_write_for_tenant(tenant_id, 'notification:write')
    end
  )
  with check (
    case
      when tenant_id is null then exists (
        select 1
        from tenant_memberships tm
        where tm.user_id = app.current_user_id()
          and tm.status = 'active'
          and tm.starts_at <= now()
          and (tm.ends_at is null or tm.ends_at > now())
          and app.role_grants_action(tm.role, 'notification:write')
      )
      else app.can_write_for_tenant(tenant_id, 'notification:write')
    end
  );

create policy notifications_delete on notifications
  for delete to public
  using (
    case
      when tenant_id is null then exists (
        select 1
        from tenant_memberships tm
        where tm.user_id = app.current_user_id()
          and tm.status = 'active'
          and tm.starts_at <= now()
          and (tm.ends_at is null or tm.ends_at > now())
          and app.role_grants_action(tm.role, 'notification:write')
      )
      else app.can_write_for_tenant(tenant_id, 'notification:write')
    end
  );

drop policy if exists feature_flags_insert on feature_flags;
drop policy if exists feature_flags_update on feature_flags;
drop policy if exists feature_flags_delete on feature_flags;

create policy feature_flags_insert on feature_flags
  for insert to public
  with check (
    case
      when tenant_id is null then exists (
        select 1
        from tenant_memberships tm
        where tm.user_id = app.current_user_id()
          and tm.status = 'active'
          and tm.starts_at <= now()
          and (tm.ends_at is null or tm.ends_at > now())
          and app.role_grants_action(tm.role, 'feature_flag:write')
      )
      else app.can_write_for_tenant(tenant_id, 'feature_flag:write')
    end
  );

create policy feature_flags_update on feature_flags
  for update to public
  using (
    case
      when tenant_id is null then exists (
        select 1
        from tenant_memberships tm
        where tm.user_id = app.current_user_id()
          and tm.status = 'active'
          and tm.starts_at <= now()
          and (tm.ends_at is null or tm.ends_at > now())
          and app.role_grants_action(tm.role, 'feature_flag:write')
      )
      else app.can_write_for_tenant(tenant_id, 'feature_flag:write')
    end
  )
  with check (
    case
      when tenant_id is null then exists (
        select 1
        from tenant_memberships tm
        where tm.user_id = app.current_user_id()
          and tm.status = 'active'
          and tm.starts_at <= now()
          and (tm.ends_at is null or tm.ends_at > now())
          and app.role_grants_action(tm.role, 'feature_flag:write')
      )
      else app.can_write_for_tenant(tenant_id, 'feature_flag:write')
    end
  );

create policy feature_flags_delete on feature_flags
  for delete to public
  using (
    case
      when tenant_id is null then exists (
        select 1
        from tenant_memberships tm
        where tm.user_id = app.current_user_id()
          and tm.status = 'active'
          and tm.starts_at <= now()
          and (tm.ends_at is null or tm.ends_at > now())
          and app.role_grants_action(tm.role, 'feature_flag:write')
      )
      else app.can_write_for_tenant(tenant_id, 'feature_flag:write')
    end
  );
