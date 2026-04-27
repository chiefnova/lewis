-- 0014_global_write_policy_command_scope.sql
--
-- notifications_write and feature_flags_write were FOR ALL policies. In
-- Postgres, FOR ALL contributes to SELECT visibility too, which widened
-- NULL-tenant/global rows despite the tightened SELECT policies in 0009.
-- Split them into command-specific write policies so read visibility is
-- controlled only by *_tenant_read.

drop policy if exists notifications_write on notifications;

create policy notifications_insert on notifications
  for insert to public
  with check (
    tenant_id is null
    or app.can_write_for_tenant(tenant_id, 'notification:write')
  );

create policy notifications_update on notifications
  for update to public
  using (
    tenant_id is null
    or app.can_write_for_tenant(tenant_id, 'notification:write')
  )
  with check (
    tenant_id is null
    or app.can_write_for_tenant(tenant_id, 'notification:write')
  );

create policy notifications_delete on notifications
  for delete to public
  using (
    tenant_id is null
    or app.can_write_for_tenant(tenant_id, 'notification:write')
  );

drop policy if exists feature_flags_write on feature_flags;

create policy feature_flags_insert on feature_flags
  for insert to public
  with check (
    tenant_id is null
    or app.can_write_for_tenant(tenant_id, 'feature_flag:write')
  );

create policy feature_flags_update on feature_flags
  for update to public
  using (
    tenant_id is null
    or app.can_write_for_tenant(tenant_id, 'feature_flag:write')
  )
  with check (
    tenant_id is null
    or app.can_write_for_tenant(tenant_id, 'feature_flag:write')
  );

create policy feature_flags_delete on feature_flags
  for delete to public
  using (
    tenant_id is null
    or app.can_write_for_tenant(tenant_id, 'feature_flag:write')
  );
