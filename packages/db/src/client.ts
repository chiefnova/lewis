import { Pool } from "pg";

import { resolveDatabaseConnectionConfig } from "./config.js";

export type ReadinessCheck = {
  ok: boolean;
  message?: string;
};

let databasePool: Pool | undefined;

export function createDatabasePool(env: NodeJS.ProcessEnv = process.env): Pool {
  const config = resolveDatabaseConnectionConfig(env);

  if (config.kind === "url") {
    return new Pool({
      connectionString: config.connectionString,
    });
  }

  return new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
  });
}

export function getDatabasePool(env: NodeJS.ProcessEnv = process.env): Pool {
  databasePool ??= createDatabasePool(env);
  return databasePool;
}

export async function initializeDatabase(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  await getDatabasePool(env).query("select 1");
}

export async function checkDatabaseReady(
  env: NodeJS.ProcessEnv = process.env,
): Promise<ReadinessCheck> {
  try {
    await getDatabasePool(env).query("select 1");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error) };
  }
}

export async function closeDatabasePool(): Promise<void> {
  if (!databasePool) {
    return;
  }

  await databasePool.end();
  databasePool = undefined;
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown database readiness error";
}
