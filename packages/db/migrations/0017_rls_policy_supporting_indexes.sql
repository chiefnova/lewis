-- 0017_rls_policy_supporting_indexes.sql
--
-- The RLS helpers introduced in 0001 (has_tenant_relationship,
-- has_active_support_grant) and the new 0012 helper
-- (current_tenant_member_grants_action) are evaluated per row inside policy
-- expressions on the hottest write paths in the app. tenant_relationships and
-- support_access_grants currently have only their primary-key indexes, and
-- tenant_memberships's only composite index is the unique on
-- (user_id, tenant_id, role) — usable but not partial.
--
-- This migration adds supporting indexes so policy evaluation can scale beyond
-- low-tens-of-rows in those tables. All three are non-partial-and-active or
-- partial-on-active subsets so the indexes shrink as rows expire/revoke.

-- has_tenant_relationship lookup pattern: from + to + kind, status='active' filter
create index if not exists tenant_relationships_from_to_kind_active_idx
  on tenant_relationships (from_tenant_id, to_tenant_id, kind)
  where status = 'active';

-- has_active_support_grant lookup pattern: target_tenant_id + staff_user_id,
-- with revoked_at IS NULL and time-window filters applied at row time.
create index if not exists support_access_grants_target_staff_active_idx
  on support_access_grants (target_tenant_id, staff_user_id)
  where revoked_at is null;

-- current_tenant_member_grants_action and can_write_for_tenant lookup pattern:
-- (tenant_id, user_id) with status='active' filter. The unique index on
-- (user_id, tenant_id, role) handles equality on both columns but is not
-- partial; this partial index narrows the candidate set by status.
create index if not exists tenant_memberships_tenant_user_active_idx
  on tenant_memberships (tenant_id, user_id)
  where status = 'active';
