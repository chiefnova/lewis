/**
 * Clerk publicMetadata contract for Corridor staff and patient routing.
 *
 * publicMetadata is set by Corridor admins via Clerk's server-side API; it is
 * server-trusted but client-readable. The frontends use it for UX routing
 * (e.g. send a sponsor_user to /sponsor by default), and the API will use it
 * as a hint when resolving the active tenant + membership before setting
 * transaction-local RLS context. The actual authorization gate lives in
 * Postgres RLS policies + app.resolve_authenticated_membership; metadata is
 * defense-in-depth, never the sole gate.
 */

export const STAFF_PORTAL_VALUES = ["sponsor", "etc", "admin"] as const;
export type StaffPortal = (typeof STAFF_PORTAL_VALUES)[number];

export const STAFF_PORTALS: ReadonlySet<StaffPortal> = new Set<StaffPortal>(STAFF_PORTAL_VALUES);

export const CORRIDOR_PORTALS_KEY = "corridorPortals";
export const CORRIDOR_DEFAULT_PORTAL_KEY = "corridorDefaultPortal";

export function isStaffPortal(value: unknown): value is StaffPortal {
  return typeof value === "string" && STAFF_PORTALS.has(value as StaffPortal);
}

/**
 * Read the user's allowed staff portals from publicMetadata.
 *   - corridorPortals (StaffPortal[]) is the primary source
 *   - corridorDefaultPortal (StaffPortal) is a fallback when corridorPortals
 *     is absent — useful when the admin only wants to assign one portal
 *   - unknown values are filtered out (never trust string from JSON)
 */
export function readStaffPortals(
  metadata: Record<string, unknown> | null | undefined,
): StaffPortal[] {
  if (!metadata) return [];

  const portals = metadata[CORRIDOR_PORTALS_KEY];
  if (Array.isArray(portals)) {
    return portals.filter(isStaffPortal);
  }

  const defaultPortal = metadata[CORRIDOR_DEFAULT_PORTAL_KEY];
  if (isStaffPortal(defaultPortal)) {
    return [defaultPortal];
  }

  return [];
}

/**
 * Resolve the path the user should land on after sign-in. Honors
 * corridorDefaultPortal first, then falls through to the first valid entry
 * in corridorPortals. Returns null when no portal is assigned.
 */
export function defaultStaffPath(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  if (!metadata) return null;

  const defaultPortal = metadata[CORRIDOR_DEFAULT_PORTAL_KEY];
  if (isStaffPortal(defaultPortal)) {
    return `/${defaultPortal}`;
  }

  const firstPortal = readStaffPortals(metadata)[0];
  return firstPortal ? `/${firstPortal}` : null;
}
