import { z } from "zod";

import { RequestId, SupportTicketId, TenantId, UserId } from "./api/ids.js";

export type TenantKind = "sponsor" | "etc" | "patient" | "board" | "corridor_internal";

export const TenantRole = z.enum([
  "sponsor_admin",
  "sponsor_user",
  "etc_admin",
  "etc_user",
  "etc_clinician",
  "patient",
  "board_reviewer",
  "corridor_admin",
  "corridor_support",
]);
export type TenantRole = z.infer<typeof TenantRole>;

/**
 * Validated context attached to every authenticated request. Built by the
 * resolveTenant middleware after Clerk verification and tenant-membership
 * lookup, then passed through setAppContext to set Postgres session vars
 * for RLS.
 *
 * Validation runs at the trust boundary (right before binding to the DB
 * session) so a malformed value surfaces as a clean validation_error at the
 * boundary instead of a confusing 500 deep inside policy evaluation.
 */
export const AppContextSchema = z.object({
  userId: UserId,
  activeTenantId: TenantId,
  requestId: RequestId,
  role: TenantRole,
  supportTicketId: SupportTicketId.optional(),
});
export type AppContext = z.infer<typeof AppContextSchema>;
