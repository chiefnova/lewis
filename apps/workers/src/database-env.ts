/**
 * Resolves the runtime DB env for the worker process.
 *
 * Precedence:
 *   1. If any WORKER_DATABASE_URL or WORKER_DB_* is set, the script returns
 *      a copy of process.env with the corresponding DATABASE_URL / DB_* keys
 *      overridden by the WORKER_* values.
 *   2. Otherwise, returns process.env unchanged so the regular DATABASE_URL
 *      / DB_* values flow through (e.g. the workers_elevated_dev profile sets
 *      DATABASE_URL directly without a WORKER_ prefix).
 *
 * Splitting the worker DSN from the API DSN lets a single host run an API
 * connecting as app_api and a worker connecting as app_worker without env
 * collisions. The elevated-worker pathway uses a separate process and a
 * different fnox profile entirely; this resolver is for the regular worker.
 */

const WORKER_PREFIXED = [
  "WORKER_DATABASE_URL",
  "WORKER_DB_HOST",
  "WORKER_DB_PORT",
  "WORKER_DB_DATABASE",
  "WORKER_DB_USERNAME",
  "WORKER_DB_PASSWORD",
] as const;

export function hasWorkerDatabaseConfig(env: NodeJS.ProcessEnv = process.env): boolean {
  return WORKER_PREFIXED.some((key) => env[key] !== undefined);
}

export function resolveWorkerDatabaseEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  if (!hasWorkerDatabaseConfig(env)) {
    return env;
  }

  return {
    ...env,
    DATABASE_URL: env.WORKER_DATABASE_URL ?? env.DATABASE_URL,
    DB_HOST: env.WORKER_DB_HOST ?? env.DB_HOST,
    DB_PORT: env.WORKER_DB_PORT ?? env.DB_PORT,
    DB_DATABASE: env.WORKER_DB_DATABASE ?? env.DB_DATABASE,
    DB_USERNAME: env.WORKER_DB_USERNAME ?? env.DB_USERNAME,
    DB_PASSWORD: env.WORKER_DB_PASSWORD ?? env.DB_PASSWORD,
  };
}
