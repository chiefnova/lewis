import type { PoolClient } from "@lewis/db";
import type {
  AdminAuditLogResponse,
  AdminComplianceResponse,
  AdminTenantsResponse,
  AppContext,
  CursorPageQuery,
} from "@lewis/shared";

/**
 * Internal-admin service layer. Routes are role-gated (lewis_admin) and
 * audit-logged before reaching these functions. See manufacturers/service.ts for
 * the sprint-marker key (docs/implementation.md § 0.2).
 */

export async function listTenants(
  _client: PoolClient,
  _ctx: AppContext,
  _page: CursorPageQuery,
): Promise<AdminTenantsResponse> {
  // TODO(sprint-6): SELECT FROM tenants — RLS allows lewis_admin to see all
  // via support_access_grants or a future role-based path.
  // Sprint 6 ships admin portal completion (alongside pen test, a11y, perf).
  return { items: [], nextCursor: null, hasMore: false };
}

export async function getComplianceWatchlist(
  _client: PoolClient,
  _ctx: AppContext,
  _page: CursorPageQuery,
): Promise<AdminComplianceResponse> {
  // TODO(sprint-6): aggregate compliance issues across all tenants.
  // Sprint 6 ships the admin portal compliance watchlist surface.
  return { items: [], nextCursor: null, hasMore: false };
}

export async function listAuditLog(
  _client: PoolClient,
  _ctx: AppContext,
  _page: CursorPageQuery,
): Promise<AdminAuditLogResponse> {
  // TODO(sprint-6): cursor-paginated audit_log read across tenants.
  // Sprint 6 ships the admin portal audit-log viewer.
  return { items: [], nextCursor: null, hasMore: false };
}
