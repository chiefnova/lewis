import type { TenantKind } from "@corridor/shared";

export type Role =
  | "sponsor_admin"
  | "sponsor_clinical"
  | "etc_admin"
  | "etc_medical_director"
  | "etc_staff"
  | "etrb_reviewer"
  | "patient"
  | "patient_representative"
  | "corridor_support"
  | "corridor_admin";

export const tenantKindRoles: Record<TenantKind, readonly Role[]> = {
  sponsor: ["sponsor_admin", "sponsor_clinical"],
  etc: ["etc_admin", "etc_medical_director", "etc_staff"],
  patient: ["patient", "patient_representative"],
  board: ["etrb_reviewer"],
  corridor_internal: ["corridor_support", "corridor_admin"],
};

export function roleBelongsToTenantKind(role: Role, tenantKind: TenantKind): boolean {
  return tenantKindRoles[tenantKind].includes(role);
}
