-- 0009_audit_helpers_and_tightening.sql
--
-- Seven DB-side hardenings discovered in the post-/review pass:
--
--   (a) audit_log.tenant_id is currently nullable. Per CLAUDE.md, every state
--       change must write an audit row; nullable tenant_id makes "unread by
--       any tenant" rows possible — a hidden audit gap. Add a system-events
--       sentinel tenant (kind='lewis_internal'), make audit_log.tenant_id
--       NOT NULL, default to the sentinel for system events.
--
--   (b) app.write_audit(...) helper. SECURITY DEFINER. Every domain mutation
--       calls this; it inserts the row and returns the audit row id. Side-
--       effect-only by design.
--
--   (c) notifications + feature_flags policies allow read when tenant_id IS
--       NULL regardless of session state. Tighten to also require
--       app.current_user_id() IS NOT NULL — global rows still need an
--       authenticated session.
--
--   (d) search_index_jobs has no race protection. Add a UNIQUE partial index
--       on (source_table, source_id) WHERE processed_at IS NULL so concurrent
--       enqueue calls collapse instead of doubling work.
--
--   (e) manufacturer_organizations.tax_id_encrypted is bytea-without-encryption.
--       Drop it. When a real KMS strategy lands, re-add via a forward
--       migration with pgcrypto + key-source documentation. Better to
--       not-have than to ship plaintext-as-encrypted.
--
--   (f) app.current_role() helper for diagnostics/audit context. Access
--       policies still re-check tenant_memberships rather than trusting the
--       caller-bound role string.
--
--   (g) app.resolve_authenticated_membership(...) helper. Tenant bootstrap
--       needs to resolve Clerk user + requested tenant before app.* RLS vars are
--       available. Keep that escape hatch narrow instead of making the runtime
--       role broadly bypass RLS.

-- ---------------------------------------------------------------------------
-- (a) System-events sentinel tenant + audit_log NOT NULL tenant_id
-- ---------------------------------------------------------------------------
--
-- A fixed UUID is used for the system-events sentinel so it's stable across
-- environments and easy to identify in queries. The value is documented in
-- packages/shared/src/api/ids.ts (SYSTEM_TENANT_ID).

insert into tenants (id, kind, status, display_name)
values (
  '00000000-0000-4000-8000-00000000C0DE'::uuid,
  'lewis_internal',
  'active',
  'Lewis System Events'
)
on conflict (id) do update set
  status = excluded.status,
  display_name = excluded.display_name,
  updated_at = now();

-- Backfill existing audit_log rows that lack tenant_id.
update audit_log
  set tenant_id = '00000000-0000-4000-8000-00000000C0DE'::uuid
  where tenant_id is null;

alter table audit_log
  alter column tenant_id set not null,
  alter column tenant_id set default '00000000-0000-4000-8000-00000000C0DE'::uuid;

-- ---------------------------------------------------------------------------
-- (b) app.write_audit() helper
-- ---------------------------------------------------------------------------
--
-- Every domain mutation must call this in the same transaction as the
-- mutation. Example:
--
--   select app.write_audit(
--     p_tenant_id => :tenant_id,
--     p_action    => 'patient.update',
--     p_target_object_type => 'patients',
--     p_target_object_id   => :patient_id,
--     p_before    => :before_jsonb,
--     p_after     => :after_jsonb
--   );
--
-- Defaults pull actor + request_id from the session app.* settings so
-- callers don't have to thread them. Returns the inserted row's id.
-- SECURITY DEFINER so it can write through audit_log RLS regardless of which
-- table's RLS context is set.

create or replace function app.write_audit(
  p_action text,
  p_target_object_type text,
  p_target_object_id uuid default null,
  p_tenant_id uuid default null,
  p_before jsonb default null,
  p_after jsonb default null,
  p_actor_user_id uuid default null,
  p_ip inet default null,
  p_ua text default null,
  p_request_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_id uuid;
  v_tenant_id uuid;
  v_actor_user_id uuid;
  v_request_id text;
begin
  -- Tenant: caller-supplied wins, else current session, else system sentinel.
  v_tenant_id := coalesce(
    p_tenant_id,
    app.current_tenant_id(),
    '00000000-0000-4000-8000-00000000C0DE'::uuid
  );

  v_actor_user_id := coalesce(p_actor_user_id, app.current_user_id());
  v_request_id := coalesce(p_request_id, app.current_request_id());

  if p_action is null or length(p_action) = 0 then
    raise exception 'app.write_audit: p_action is required';
  end if;
  if p_target_object_type is null or length(p_target_object_type) = 0 then
    raise exception 'app.write_audit: p_target_object_type is required';
  end if;

  insert into audit_log (
    tenant_id, actor_user_id, action, target_object_type,
    target_object_id, before, after, ip, ua, request_id
  )
  values (
    v_tenant_id, v_actor_user_id, p_action, p_target_object_type,
    p_target_object_id, p_before, p_after, p_ip, p_ua, v_request_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function app.write_audit(text, text, uuid, uuid, jsonb, jsonb, uuid, inet, text, text) is
  'Authoritative helper for writing audit_log rows. Pulls actor + request_id from session app.* settings unless overridden. SECURITY DEFINER so callers do not need direct INSERT permission on audit_log.';

-- ---------------------------------------------------------------------------
-- (f) app.current_role() helper
-- ---------------------------------------------------------------------------

create or replace function app.current_role() returns text
language sql stable
as $$
  select nullif(current_setting('app.role', true), '')
$$;

comment on function app.current_role() is
  'Returns the application tenant role bound by the API middleware. For diagnostics/audit context only; authorization policies must still verify tenant_memberships.';

-- ---------------------------------------------------------------------------
-- (g) Tenant bootstrap helper
-- ---------------------------------------------------------------------------

create or replace function app.resolve_authenticated_membership(
  p_clerk_user_id text,
  p_tenant_id uuid
)
returns table(user_id uuid, role text)
language sql
stable
security definer
set search_path = public, app
as $$
  select u.id as user_id, tm.role
  from users u
  join tenant_memberships tm on tm.user_id = u.id
  where u.clerk_user_id = p_clerk_user_id
    and tm.tenant_id = p_tenant_id
    and tm.status = 'active'
    and tm.starts_at <= now()
    and (tm.ends_at is null or tm.ends_at > now())
  order by tm.starts_at desc
  limit 1
$$;

comment on function app.resolve_authenticated_membership(text, uuid) is
  'Narrow tenant-bootstrap helper used after Clerk verification and before app.* RLS vars are available. Returns only user_id + role for an active membership in the requested tenant.';

-- ---------------------------------------------------------------------------
-- (c) Tighten notifications + feature_flags NULL-tenant policies
-- ---------------------------------------------------------------------------

drop policy if exists notifications_tenant_read on notifications;

create policy notifications_tenant_read on notifications
  for select
  using (
    -- Global rows (NULL tenant_id) require an authenticated session.
    (tenant_id is null and app.current_user_id() is not null)
    or tenant_id = app.current_tenant_id()
  );

drop policy if exists feature_flags_tenant_read on feature_flags;

create policy feature_flags_tenant_read on feature_flags
  for select
  using (
    (tenant_id is null and app.current_user_id() is not null)
    or tenant_id = app.current_tenant_id()
  );

-- The write policies for these tables (added in 0008) already check
-- can_write_for_tenant which itself requires a session user, so writes are
-- already gated correctly. No change needed on the write side.

-- ---------------------------------------------------------------------------
-- (d) search_index_jobs unique partial index for race protection
-- ---------------------------------------------------------------------------
--
-- Concurrent indexers calling "enqueue source_table, source_id" should
-- collapse to one in-flight job. Once processed (processed_at IS NOT NULL),
-- the row no longer participates in the unique constraint, so a new enqueue
-- after processing succeeds.

create unique index if not exists search_index_jobs_pending_unique
  on search_index_jobs (source_table, source_id)
  where processed_at is null;

-- ---------------------------------------------------------------------------
-- (e) Drop manufacturer_organizations.tax_id_encrypted
-- ---------------------------------------------------------------------------
--
-- The column was declared bytea but no encryption helper, key management,
-- or KMS integration exists. Without those, any write would store plaintext
-- bytes in a column called "encrypted" — worse than not having the column.
--
-- When a real KMS strategy lands (per the TODOS.md item), re-add via a
-- forward migration that bundles:
--   1. The column creation
--   2. A pgcrypto-based set/get helper
--   3. The key-source documentation (env var name, KMS arn, rotation policy)
--   4. A pgTAP test that the raw column is unreadable without the helper

alter table manufacturer_organizations drop column if exists tax_id_encrypted;
