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

export function resolveDatabaseConnectionConfig(
  env: NodeJS.ProcessEnv = process.env,
): DatabaseConnectionConfig {
  const parsed = databaseEnvSchema.parse(env);

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
    ["DB_HOST", host],
    ["DB_PORT", port],
    ["DB_DATABASE", database],
    ["DB_USERNAME", user],
    ["DB_PASSWORD", password],
  ]
    .filter(([, value]) => value === undefined || value === "")
    .map(([name]) => name);

  if (missing.length > 0 || !host || port === undefined || !database || !user || !password) {
    throw new Error(
      `Missing database configuration. Provide DATABASE_URL or ${missing.join(", ")}.`,
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
