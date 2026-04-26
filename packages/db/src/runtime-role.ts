import type { Pool } from "pg";

/**
 * Defense-in-depth: assert at process startup that the connection runs as a
 * non-superuser, NOBYPASSRLS Postgres role. The runtime role split (migration
 * 0011 — app_api / app_worker / app_worker_elevated) is config-driven; this
 * check turns it into a hard contract so a misconfigured fnox profile or a
 * copy-paste of MIGRATION_DATABASE_URL into DATABASE_URL fails closed instead
 * of silently degrading every RLS policy this codebase relies on.
 *
 * The check is not a security boundary on its own — Postgres RLS is the real
 * gate. It catches operator errors before a misconfigured process serves a
 * single request. Skipping the check (e.g. for tests that connect as the
 * migration owner) requires opting in via `expectedRoles` or
 * `allowSuperuser: true`, never via a silent fallback.
 */

export type RuntimeRoleAssertion = {
  /**
   * Whitelist of acceptable Postgres role names for this process. The check
   * fails closed unless current_user matches one of these (case-insensitive).
   */
  expectedRoles: readonly string[];
  /**
   * If true, accept rolbypassrls = true. Default false. Only set true for
   * tests that intentionally connect as the migration owner / superuser.
   */
  allowSuperuser?: boolean;
  /**
   * If true, accept rolsuper = true. Default false. Same caveat as
   * allowSuperuser; superuser bypasses RLS regardless of FORCE.
   */
  allowSuper?: boolean;
};

type RuntimeRoleRow = {
  current_user: string;
  rolbypassrls: boolean;
  rolsuper: boolean;
};

export class RuntimeRoleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeRoleError";
  }
}

export async function assertRuntimeRole(
  pool: Pool,
  assertion: RuntimeRoleAssertion,
): Promise<RuntimeRoleRow> {
  const result = await pool.query<RuntimeRoleRow>(
    `select current_user::text as current_user,
            coalesce(r.rolbypassrls, false) as rolbypassrls,
            coalesce(r.rolsuper, false) as rolsuper
       from pg_roles r
      where r.rolname = current_user`,
  );

  const row = result.rows[0];
  if (!row) {
    throw new RuntimeRoleError(
      "assertRuntimeRole: pg_roles returned no row for current_user — connection state is inconsistent.",
    );
  }

  const allowed = new Set(assertion.expectedRoles.map((r) => r.toLowerCase()));
  if (!allowed.has(row.current_user.toLowerCase())) {
    throw new RuntimeRoleError(
      `Runtime DB role check FAILED: connected as '${row.current_user}', expected one of ${[
        ...allowed,
      ].join(", ")}. ` +
        "Verify DATABASE_URL points at the application role, not the migration owner. " +
        "See packages/db/migrations/0011_runtime_roles_and_force_rls.sql for the contract.",
    );
  }

  if (row.rolbypassrls && assertion.allowSuperuser !== true) {
    throw new RuntimeRoleError(
      `Runtime DB role check FAILED: '${row.current_user}' has BYPASSRLS. ` +
        "Application processes must connect as a NOBYPASSRLS role so FORCE ROW LEVEL SECURITY is enforceable. " +
        "Either revoke BYPASSRLS from the role or set allowSuperuser:true if this is a known test path.",
    );
  }

  if (row.rolsuper && assertion.allowSuper !== true) {
    throw new RuntimeRoleError(
      `Runtime DB role check FAILED: '${row.current_user}' is a SUPERUSER. ` +
        "Superuser sessions implicitly bypass RLS. Use a non-superuser application role for runtime processes.",
    );
  }

  return row;
}
