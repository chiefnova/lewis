import { getDatabasePool } from "@lewis/db";
import { AppContextSchema, TenantId, type AppContext } from "@lewis/shared";
import type { MiddlewareHandler } from "hono";

import { ApiError } from "./errors.js";
import type { AuthenticatedClerkVariables } from "./auth.js";

/**
 * resolveTenant — turns a Clerk user id (set by requireClerkAuth) into a
 * Lewis users.id, then validates the active tenant against the
 * `x-lewis-tenant-id` header by checking tenant_memberships. The
 * membership row's role is also captured so downstream middleware
 * (requireRole, internal-admin gate) can authorize without re-querying.
 *
 * This middleware runs BEFORE withDbContext, so app.* RLS variables are not
 * available yet. The membership lookup is intentionally confined to the
 * DB-side app.resolve_authenticated_membership(...) bootstrap helper, which
 * returns only user_id + role for the Clerk user and requested tenant.
 *
 * On success: c.var.appContext is populated with { userId, activeTenantId,
 * requestId, role }. On failure: 403 (no membership) — we deliberately do
 * NOT distinguish "no Lewis user" from "no membership" because the
 * distinction is information disclosure.
 */

const TENANT_HEADER = "x-lewis-tenant-id";
const SUPPORT_TICKET_HEADER = "x-support-ticket-id";

type TenantVariables = AuthenticatedClerkVariables & {
  appContext: AppContext;
};

export const resolveTenant: MiddlewareHandler<{ Variables: TenantVariables }> = async (c, next) => {
  const clerkUserId = c.get("clerkUserId");
  if (!clerkUserId) {
    throw new ApiError("internal_error", "resolveTenant ran before requireClerkAuth");
  }

  const tenantHeader = c.req.header(TENANT_HEADER);
  if (!tenantHeader) {
    throw new ApiError(
      "forbidden",
      `missing ${TENANT_HEADER} header; pick a tenant from /v1/me/tenants and resend`,
    );
  }

  const tenantParse = TenantId.safeParse(tenantHeader);
  if (!tenantParse.success) {
    throw new ApiError("validation_error", `${TENANT_HEADER} must be a valid uuid`);
  }
  const activeTenantId = tenantParse.data;

  const requestId = c.get("requestId" as never) as string | undefined;
  if (!requestId) {
    throw new ApiError("internal_error", "request_id middleware did not run before resolveTenant");
  }

  const pool = getDatabasePool();

  const result = await pool.query<{ user_id: string; role: string }>(
    `
    select user_id, role
    from app.resolve_authenticated_membership($1, $2)
    `,
    [clerkUserId, activeTenantId],
  );

  if (result.rowCount === 0) {
    throw new ApiError("forbidden", "no active tenant membership for the requested tenant");
  }

  const row = result.rows[0];
  if (!row || !row.user_id) {
    throw new ApiError("internal_error", "tenant lookup returned a malformed row");
  }

  const supportTicketId = c.req.header(SUPPORT_TICKET_HEADER);

  // Build the AppContext through the schema so we get one consistent
  // validation pass that turns plain strings into branded types AND catches
  // any malformed value at the trust boundary.
  const parsed = AppContextSchema.safeParse({
    userId: row.user_id,
    activeTenantId,
    requestId,
    role: row.role,
    ...(supportTicketId ? { supportTicketId } : {}),
  });
  if (!parsed.success) {
    // The middleware produced a value that doesn't satisfy AppContextSchema.
    // This is a programming error (or DB corruption), not a client error.
    throw new ApiError("internal_error", "constructed AppContext failed validation");
  }

  c.set("appContext", parsed.data);
  await next();
};

export type AuthenticatedTenantVariables = TenantVariables;
