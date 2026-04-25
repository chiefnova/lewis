import { type TenantRole } from "@corridor/shared";
import type { MiddlewareHandler } from "hono";

import { ApiError } from "./errors.js";
import type { AuthenticatedTenantVariables } from "./tenant.js";

/**
 * requireRole(...roles) — middleware factory. Asserts the resolved
 * AppContext carries one of the allowed roles. Use after resolveTenant.
 *
 * Example:
 *   v1Authed.use("/admin/*", requireRole("corridor_admin"));
 *
 * The TenantRole type ensures compile-time correctness — a typo in the
 * caller is a type error. On runtime failure: 403 forbidden. The check is
 * cheap (already-parsed AppContext) so it adds no DB round-trip.
 */
export function requireRole(
  ...allowedRoles: ReadonlyArray<TenantRole>
): MiddlewareHandler<{ Variables: AuthenticatedTenantVariables }> {
  const allowed = new Set<string>(allowedRoles);

  return async (c, next) => {
    const ctx = c.get("appContext");
    if (!ctx) {
      throw new ApiError("internal_error", "requireRole ran before resolveTenant");
    }
    if (!allowed.has(ctx.role)) {
      throw new ApiError(
        "forbidden",
        `requires one of: ${[...allowed].join(", ")} (your role: ${ctx.role})`,
      );
    }
    await next();
  };
}
