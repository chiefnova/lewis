import { defineConfig } from "drizzle-kit";

import { databaseUrlFromConfig, resolveMigrationDatabaseConnectionConfig } from "./src/config.js";

// drizzle-kit's primary use here is `drizzle-kit migrate` (production
// migration runner via CI — see packages/db/package.json `migrate:cloud`
// and .github/workflows/deploy-*.yml). That command needs the schema-
// owner credential, which lives in MIGRATION_DATABASE_URL — never the
// runtime app_api DATABASE_URL (NOBYPASSRLS, no schema-modify rights per
// CLAUDE.md security #1). resolveMigrationDatabaseConnectionConfig falls
// back to DATABASE_URL when MIGRATION_DATABASE_URL is unset, preserving
// existing behavior for any developer who runs `drizzle-kit studio` or
// similar against a local DB without a separate migration env.
const databaseUrl = databaseUrlFromConfig(resolveMigrationDatabaseConnectionConfig());

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
