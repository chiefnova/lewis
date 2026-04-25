import { CursorPageQuery, SupportTicketId } from "@corridor/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { ApiError } from "../../middleware/errors.js";
import { requireRole } from "../../middleware/role.js";
import type { AuthenticatedDbVariables } from "../../middleware/db-context.js";
import { getComplianceWatchlist, listAuditLog, listTenants } from "./service.js";

/**
 * Internal-admin sub-router. Two enforced gates:
 *
 *   1. requireRole("corridor_admin") — only Corridor staff with the
 *      corridor_admin tenant_membership role reach these routes. The role
 *      lives on the AppContext built by resolveTenant.
 *
 *   2. X-Support-Ticket-Id header — break-glass marker. Validated against
 *      packages/shared SupportTicketId regex.
 *
 * Every successful access is logged to audit_log via app.write_audit() in
 * the same DB transaction (provided by withDbContext). The action is
 * 'admin:access' with the ticket id captured in the after JSON.
 *
 * Per CLAUDE.md: "Break-glass admin access requires a ticket reference and
 * is audit-logged."
 */

const SUPPORT_TICKET_HEADER = "x-support-ticket-id";

export const internalAdminRoutes = new Hono<{ Variables: AuthenticatedDbVariables }>();

internalAdminRoutes.use("*", requireRole("corridor_admin"));

internalAdminRoutes.use("*", async (c, next) => {
  const rawTicket = c.req.header(SUPPORT_TICKET_HEADER);
  if (!rawTicket) {
    throw new ApiError(
      "forbidden",
      `internal admin endpoints require ${SUPPORT_TICKET_HEADER} header (break-glass)`,
    );
  }
  const ticketParse = SupportTicketId.safeParse(rawTicket);
  if (!ticketParse.success) {
    throw new ApiError(
      "validation_error",
      `${SUPPORT_TICKET_HEADER} must match [A-Za-z0-9_:.-]{1,128}`,
    );
  }
  const ticketId = ticketParse.data;

  // Audit-log the break-glass access in the same transaction. If withDbContext
  // is wired correctly, the dbClient is the per-request transaction client
  // and this row commits/rolls back with the rest of the request.
  const client = c.get("dbClient");
  if (!client) {
    throw new ApiError(
      "internal_error",
      "internal-admin middleware ran without a request DB client (withDbContext missing)",
    );
  }

  await client.query(
    `select app.write_audit(
       p_action => $1,
       p_target_object_type => $2,
       p_target_object_id => null,
       p_tenant_id => null,
       p_before => null,
       p_after => $3::jsonb
     )`,
    [
      "admin:access",
      "internal_admin_route",
      JSON.stringify({
        ticketId,
        path: c.req.path,
        method: c.req.method,
      }),
    ],
  );

  await next();
});

internalAdminRoutes.get("/tenants", zValidator("query", CursorPageQuery), async (c) => {
  const page = c.req.valid("query");
  const response = await listTenants(c.get("dbClient"), c.get("appContext"), page);
  return c.json(response);
});

internalAdminRoutes.get("/compliance", zValidator("query", CursorPageQuery), async (c) => {
  const page = c.req.valid("query");
  const response = await getComplianceWatchlist(c.get("dbClient"), c.get("appContext"), page);
  return c.json(response);
});

internalAdminRoutes.get("/audit-log", zValidator("query", CursorPageQuery), async (c) => {
  const page = c.req.valid("query");
  const response = await listAuditLog(c.get("dbClient"), c.get("appContext"), page);
  return c.json(response);
});
