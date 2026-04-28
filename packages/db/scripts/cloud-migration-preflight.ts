/**
 * Preflight check for `pnpm --filter @lewis/db migrate:cloud`.
 *
 * Refuses to invoke `drizzle-kit migrate` unless MIGRATION_DATABASE_URL
 * is explicitly set to a non-empty value.
 *
 * Why this is necessary even though the drizzle.config.ts resolver
 * exists: `resolveMigrationDatabaseConnectionConfig` is intentionally
 * lenient — when no MIGRATION_* env var is present, it falls back to
 * DATABASE_URL so other drizzle-kit subcommands (`drizzle-kit studio`,
 * `drizzle-kit introspect`) still work in local dev. That fallback is
 * desirable for inspect/debug tooling but is wrong for `migrate:cloud`
 * — running migrations against the runtime DATABASE_URL would either
 * fail (app_api role cannot create schema) or, on a maintainer shell
 * that happens to point DATABASE_URL at a schema-owner role, silently
 * succeed using the wrong env-var name. Either way, it bypasses the
 * CLAUDE.md security #1 intent that the migration credential is only
 * ever held under the explicit MIGRATION_* name.
 *
 * Belt-and-suspenders posture: the deploy-staging.yml and
 * deploy-prod.yml workflows already check this at the workflow level
 * before calling `migrate:cloud`. This script enforces the same
 * invariant at the package boundary so any future caller (a different
 * workflow, an ad-hoc maintainer shell, a script that imports this
 * package) gets the same fail-closed behavior.
 *
 * If you find yourself wanting to bypass this for local dev, use
 * `migrate:local` (raw SQL flow) or set MIGRATION_DATABASE_URL
 * explicitly to your local schema-owner DSN. There is no "soft mode."
 */

const MIGRATION_DATABASE_URL = "MIGRATION_DATABASE_URL";

export type PreflightResult = { ok: true } | { ok: false; reason: string };

export function checkCloudMigrationEnv(env: NodeJS.ProcessEnv = process.env): PreflightResult {
  const value = env[MIGRATION_DATABASE_URL];

  if (value === undefined) {
    return {
      ok: false,
      reason:
        `${MIGRATION_DATABASE_URL} is not set. migrate:cloud requires the schema-owner ` +
        `connection string explicitly under this name (never under DATABASE_URL).`,
    };
  }

  if (value.trim() === "") {
    return {
      ok: false,
      reason:
        `${MIGRATION_DATABASE_URL} is set but empty. migrate:cloud requires a non-empty ` +
        `connection string.`,
    };
  }

  return { ok: true };
}

function explainAndExit(reason: string): never {
  console.error(`migrate:cloud preflight FAILED: ${reason}`);
  console.error("");
  console.error("In CI: ensure the deploy workflow exports MIGRATION_DATABASE_URL from");
  console.error("  the environment-scoped GitHub Secret (STAGING_MIGRATION_DATABASE_URL");
  console.error("  or PROD_MIGRATION_DATABASE_URL) before invoking this script.");
  console.error("");
  console.error("In local dev: prefer `pnpm --filter @lewis/db migrate:local` (raw SQL");
  console.error("  flow against the local Docker Postgres). Only set MIGRATION_DATABASE_URL");
  console.error("  if you genuinely need to migrate a remote database from your laptop.");
  console.error("");
  console.error("This guard exists per CLAUDE.md security #1: the schema-owner credential");
  console.error("  must never be held under the runtime DATABASE_URL name.");
  process.exit(1);
}

const invokedDirectly = process.argv[1]?.endsWith("cloud-migration-preflight.ts");
if (invokedDirectly) {
  const result = checkCloudMigrationEnv();
  if (!result.ok) {
    explainAndExit(result.reason);
  }
  console.warn("migrate:cloud preflight passed.");
}
