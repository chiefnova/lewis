import { Pool } from "pg";

import { databaseUrlFromConfig, resolveMigrationDatabaseConnectionConfig } from "../src/config.js";
import {
  LOCAL_APP_API_DB_PASSWORD_DEFAULT,
  LOCAL_APP_WORKER_DB_PASSWORD_DEFAULT,
} from "../src/local-defaults.js";
import {
  ALLOWED_HOST_LITERALS,
  ALLOWED_NODE_ENVS,
  assertLocalDatabaseSafe,
} from "./_local-safety.js";

const PASSWORD_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

// Re-export so consumers/tests can import the allowlists from one stable
// import path (existed in this file before the shared extraction landed).
export { ALLOWED_HOST_LITERALS, ALLOWED_NODE_ENVS };

export function assertLocalRoleSetupSafe(
  connectionString: string,
  nodeEnv: string = process.env.NODE_ENV ?? "development",
): void {
  assertLocalDatabaseSafe({
    connectionString,
    scriptName: "setup-local-runtime-roles.ts",
    nodeEnv,
  });
}

export function assertSafeRolePassword(value: string, name: string): void {
  if (!PASSWORD_PATTERN.test(value)) {
    throw new Error(
      `${name} must match /^[A-Za-z0-9_-]{8,128}$/ to be safe for ALTER ROLE PASSWORD interpolation.`,
    );
  }
}

export function sqlStringLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

async function main(): Promise<void> {
  const connectionString = databaseUrlFromConfig(resolveMigrationDatabaseConnectionConfig());
  assertLocalRoleSetupSafe(connectionString);

  const apiPassword = process.env.LOCAL_APP_API_DB_PASSWORD ?? LOCAL_APP_API_DB_PASSWORD_DEFAULT;
  const workerPassword =
    process.env.LOCAL_APP_WORKER_DB_PASSWORD ?? LOCAL_APP_WORKER_DB_PASSWORD_DEFAULT;

  assertSafeRolePassword(apiPassword, "LOCAL_APP_API_DB_PASSWORD");
  assertSafeRolePassword(workerPassword, "LOCAL_APP_WORKER_DB_PASSWORD");

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query(
      `alter role app_api with login nobypassrls password ${sqlStringLiteral(apiPassword)}`,
    );
    await client.query(
      `alter role app_worker with login nobypassrls password ${sqlStringLiteral(workerPassword)}`,
    );
    await client.query("commit");
    console.warn("Configured local app_api and app_worker runtime role passwords.");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Only invoke main() when this file is executed directly, not when it's
// imported as a module (e.g. by setup-local-runtime-roles.test.ts).
const invokedDirectly = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    const entryUrl = new URL(`file://${entry}`).href;
    return import.meta.url === entryUrl;
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown runtime role setup error";
    console.error(message);
    process.exit(1);
  });
}
