import { z } from "zod";

export type DatabaseConnectionConfig =
  | {
      kind: "url";
      connectionString: string;
    }
  | {
      kind: "parameters";
      host: string;
      port: number;
      database: string;
      user: string;
      password: string;
    };

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  DB_HOST: z.string().min(1).optional(),
  DB_PORT: z.coerce.number().int().positive().optional(),
  DB_DATABASE: z.string().min(1).optional(),
  DB_USERNAME: z.string().min(1).optional(),
  DB_PASSWORD: z.string().optional(),
});

type DatabaseEnvPrefix = "" | "MIGRATION_";

function readDatabaseEnv(env: NodeJS.ProcessEnv, prefix: DatabaseEnvPrefix) {
  return databaseEnvSchema.parse({
    DATABASE_URL: env[`${prefix}DATABASE_URL`],
    DB_HOST: env[`${prefix}DB_HOST`],
    DB_PORT: env[`${prefix}DB_PORT`],
    DB_DATABASE: env[`${prefix}DB_DATABASE`],
    DB_USERNAME: env[`${prefix}DB_USERNAME`],
    DB_PASSWORD: env[`${prefix}DB_PASSWORD`],
  });
}

function resolveDatabaseConnectionConfigForPrefix(
  env: NodeJS.ProcessEnv,
  prefix: DatabaseEnvPrefix,
): DatabaseConnectionConfig {
  const parsed = readDatabaseEnv(env, prefix);

  if (parsed.DATABASE_URL) {
    return {
      kind: "url",
      connectionString: parsed.DATABASE_URL,
    };
  }

  const host = parsed.DB_HOST;
  const port = parsed.DB_PORT;
  const database = parsed.DB_DATABASE;
  const user = parsed.DB_USERNAME;
  const password = parsed.DB_PASSWORD;
  const missing = [
    [`${prefix}DB_HOST`, host],
    [`${prefix}DB_PORT`, port],
    [`${prefix}DB_DATABASE`, database],
    [`${prefix}DB_USERNAME`, user],
    [`${prefix}DB_PASSWORD`, password],
  ]
    .filter(([, value]) => value === undefined || value === "")
    .map(([name]) => name);

  if (missing.length > 0 || !host || port === undefined || !database || !user || !password) {
    throw new Error(
      `Missing database configuration. Provide ${prefix}DATABASE_URL or ${missing.join(", ")}.`,
    );
  }

  return {
    kind: "parameters",
    host,
    port,
    database,
    user,
    password,
  };
}

export function resolveDatabaseConnectionConfig(
  env: NodeJS.ProcessEnv = process.env,
): DatabaseConnectionConfig {
  return resolveDatabaseConnectionConfigForPrefix(env, "");
}

export function resolveMigrationDatabaseConnectionConfig(
  env: NodeJS.ProcessEnv = process.env,
): DatabaseConnectionConfig {
  const hasMigrationConfig =
    env.MIGRATION_DATABASE_URL !== undefined ||
    env.MIGRATION_DB_HOST !== undefined ||
    env.MIGRATION_DB_PORT !== undefined ||
    env.MIGRATION_DB_DATABASE !== undefined ||
    env.MIGRATION_DB_USERNAME !== undefined ||
    env.MIGRATION_DB_PASSWORD !== undefined;

  if (!hasMigrationConfig) {
    return resolveDatabaseConnectionConfig(env);
  }

  return resolveDatabaseConnectionConfigForPrefix(env, "MIGRATION_");
}

export function databaseUrlFromConfig(config: DatabaseConnectionConfig): string {
  if (config.kind === "url") {
    return config.connectionString;
  }

  const user = encodeURIComponent(config.user);
  const password = encodeURIComponent(config.password);
  const host = encodeURIComponent(config.host);
  const database = encodeURIComponent(config.database);
  return `postgres://${user}:${password}@${host}:${config.port}/${database}`;
}
