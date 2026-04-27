import { z } from "zod";

import { cursorPage } from "./pagination.js";

export const AdminTenantsResponse = cursorPage(z.unknown());
export type AdminTenantsResponse = z.infer<typeof AdminTenantsResponse>;

export const AdminComplianceResponse = z.object({
  // Compliance watchlist is bounded by the number of tenants under risk;
  // typically <100 entries — paginated for safety, but caller can rely on
  // typical page=1 covering everything.
  ...cursorPage(z.unknown()).shape,
});
export type AdminComplianceResponse = z.infer<typeof AdminComplianceResponse>;

export const AdminAuditLogResponse = cursorPage(z.unknown());
export type AdminAuditLogResponse = z.infer<typeof AdminAuditLogResponse>;
