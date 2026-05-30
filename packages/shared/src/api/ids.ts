import { z } from "zod";

/**
 * Branded UUID schemas. Each branded type is a distinct compile-time identity
 * so a ManufacturerId can't be silently passed where a PatientId is expected.
 *
 * At runtime they're plain strings. At compile time `ManufacturerId !== PatientId`.
 *
 * Pattern:
 *   const ManufacturerId = uuidBrand("ManufacturerId");
 *   type ManufacturerId = z.infer<typeof ManufacturerId>;
 */
function uuidBrand<B extends string>(_brand: B) {
  return z.string().uuid().brand<B>();
}

export const ManufacturerId = uuidBrand("ManufacturerId");
export type ManufacturerId = z.infer<typeof ManufacturerId>;

export const EtcId = uuidBrand("EtcId");
export type EtcId = z.infer<typeof EtcId>;

export const PatientId = uuidBrand("PatientId");
export type PatientId = z.infer<typeof PatientId>;

export const BoardId = uuidBrand("BoardId");
export type BoardId = z.infer<typeof BoardId>;

export const TenantId = uuidBrand("TenantId");
export type TenantId = z.infer<typeof TenantId>;

export const UserId = uuidBrand("UserId");
export type UserId = z.infer<typeof UserId>;

export const ProgramId = uuidBrand("ProgramId");
export type ProgramId = z.infer<typeof ProgramId>;

/**
 * Plain string-based identifiers (not UUIDs but still need shape validation).
 */
export const RequestId = z
  .string()
  .regex(/^[A-Za-z0-9_-]{8,128}$/, "request id must be 8-128 url-safe characters");
export type RequestId = z.infer<typeof RequestId>;

export const SupportTicketId = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_:.-]+$/, "support ticket id must be url-safe");
export type SupportTicketId = z.infer<typeof SupportTicketId>;
