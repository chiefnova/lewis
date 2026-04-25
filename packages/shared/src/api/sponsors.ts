import { z } from "zod";

import { cursorPage } from "./pagination.js";
import { SponsorId } from "./ids.js";

export const SponsorPathParams = z.object({
  sponsorId: SponsorId,
});
export type SponsorPathParams = z.infer<typeof SponsorPathParams>;

/**
 * Data scope returned with sponsor adverse-event lists. Reflects what the
 * sponsor is allowed to see based on consent + blinding posture.
 */
export const SponsorAeDataScope = z.enum([
  "aggregate",
  "deidentified_line_level_safety",
  "identified_with_authorization",
]);
export type SponsorAeDataScope = z.infer<typeof SponsorAeDataScope>;

export const SponsorProgramsResponse = z.object({
  sponsorId: SponsorId,
  ...cursorPage(z.unknown()).shape,
});
export type SponsorProgramsResponse = z.infer<typeof SponsorProgramsResponse>;

export const SponsorEtcsResponse = z.object({
  sponsorId: SponsorId,
  ...cursorPage(z.unknown()).shape,
});
export type SponsorEtcsResponse = z.infer<typeof SponsorEtcsResponse>;

export const SponsorAdverseEventsResponse = z.object({
  sponsorId: SponsorId,
  dataScope: SponsorAeDataScope,
  ...cursorPage(z.unknown()).shape,
});
export type SponsorAdverseEventsResponse = z.infer<typeof SponsorAdverseEventsResponse>;
