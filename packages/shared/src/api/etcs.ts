import { z } from "zod";

import { cursorPage } from "./pagination.js";
import { EtcId } from "./ids.js";

export const EtcPathParams = z.object({
  etcId: EtcId,
});
export type EtcPathParams = z.infer<typeof EtcPathParams>;

export const EtcDashboardResponse = z.object({
  etcId: EtcId,
  compliance: z.unknown().nullable(),
  // tasks is a small bounded list (open todos for the ETC), not paginated.
  tasks: z.array(z.unknown()),
});
export type EtcDashboardResponse = z.infer<typeof EtcDashboardResponse>;

export const EtcComplianceResponse = z.object({
  etcId: EtcId,
  healthScore: z.number().nullable(),
  // obligations is a small bounded list of regulatory obligations, not paginated.
  obligations: z.array(z.unknown()),
});
export type EtcComplianceResponse = z.infer<typeof EtcComplianceResponse>;

export const EtcMessagesResponse = z.object({
  etcId: EtcId,
  ...cursorPage(z.unknown()).shape,
});
export type EtcMessagesResponse = z.infer<typeof EtcMessagesResponse>;

export const EtcDrugInventoryLotsResponse = z.object({
  etcId: EtcId,
  ...cursorPage(z.unknown()).shape,
});
export type EtcDrugInventoryLotsResponse = z.infer<typeof EtcDrugInventoryLotsResponse>;
