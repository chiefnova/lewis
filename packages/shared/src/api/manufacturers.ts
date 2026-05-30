import { z } from "zod";

import { cursorPage } from "./pagination.js";
import { ManufacturerId } from "./ids.js";

export const ManufacturerPathParams = z.object({
  manufacturerId: ManufacturerId,
});
export type ManufacturerPathParams = z.infer<typeof ManufacturerPathParams>;

/**
 * Data scope returned with manufacturer adverse-event lists. Reflects what the
 * manufacturer is allowed to see based on consent + blinding posture.
 */
export const ManufacturerAeDataScope = z.enum([
  "aggregate",
  "deidentified_line_level_safety",
  "identified_with_authorization",
]);
export type ManufacturerAeDataScope = z.infer<typeof ManufacturerAeDataScope>;

export const ManufacturerProgramsResponse = z.object({
  manufacturerId: ManufacturerId,
  ...cursorPage(z.unknown()).shape,
});
export type ManufacturerProgramsResponse = z.infer<typeof ManufacturerProgramsResponse>;

export const ManufacturerEtcsResponse = z.object({
  manufacturerId: ManufacturerId,
  ...cursorPage(z.unknown()).shape,
});
export type ManufacturerEtcsResponse = z.infer<typeof ManufacturerEtcsResponse>;

export const ManufacturerAdverseEventsResponse = z.object({
  manufacturerId: ManufacturerId,
  dataScope: ManufacturerAeDataScope,
  ...cursorPage(z.unknown()).shape,
});
export type ManufacturerAdverseEventsResponse = z.infer<typeof ManufacturerAdverseEventsResponse>;
