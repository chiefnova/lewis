/**
 * Single source of truth for the bundled local-development database defaults.
 *
 * These values appear in five places that must stay in lockstep:
 *   - docker-compose.yml (POSTGRES_USER/PASSWORD/DB, port 15432, redis 16379)
 *   - env/.env.api.example, env/.env.local.example, env/.env.workers.example,
 *     env/.env.workers-elevated.example
 *   - .github/workflows/api-ci.yml, .github/workflows/pr.yml (job env)
 *   - packages/db/scripts/setup-local-runtime-roles.ts (default password fallbacks)
 *   - docs/runbooks/local-development.md (port + credential examples)
 *
 * TypeScript code MUST import from this module instead of repeating the
 * literal strings; YAML/Markdown files reference this module by path in a
 * comment so a reader chasing a typo lands here. See
 * scripts/check-local-defaults.mjs for the drift gate.
 */

export const LOCAL_DB_BOOTSTRAP_USER = "corridor";
export const LOCAL_DB_BOOTSTRAP_PASSWORD = "corridor";
export const LOCAL_DB_NAME = "corridor_dev";

export const LOCAL_POSTGRES_HOST_DEFAULT = "127.0.0.1";
export const LOCAL_POSTGRES_PORT_DEFAULT = 15432;
export const LOCAL_REDIS_HOST_DEFAULT = "127.0.0.1";
export const LOCAL_REDIS_PORT_DEFAULT = 16379;

export const LOCAL_APP_API_DB_USER = "app_api";
export const LOCAL_APP_API_DB_PASSWORD_DEFAULT = "corridor_app_api";

export const LOCAL_APP_WORKER_DB_USER = "app_worker";
export const LOCAL_APP_WORKER_DB_PASSWORD_DEFAULT = "corridor_app_worker";

export function localApiDatabaseUrl(
  host: string = LOCAL_POSTGRES_HOST_DEFAULT,
  port: number = LOCAL_POSTGRES_PORT_DEFAULT,
): string {
  return `postgres://${LOCAL_APP_API_DB_USER}:${LOCAL_APP_API_DB_PASSWORD_DEFAULT}@${host}:${port}/${LOCAL_DB_NAME}`;
}

export function localWorkerDatabaseUrl(
  host: string = LOCAL_POSTGRES_HOST_DEFAULT,
  port: number = LOCAL_POSTGRES_PORT_DEFAULT,
): string {
  return `postgres://${LOCAL_APP_WORKER_DB_USER}:${LOCAL_APP_WORKER_DB_PASSWORD_DEFAULT}@${host}:${port}/${LOCAL_DB_NAME}`;
}

export function localMigrationDatabaseUrl(
  host: string = LOCAL_POSTGRES_HOST_DEFAULT,
  port: number = LOCAL_POSTGRES_PORT_DEFAULT,
): string {
  return `postgres://${LOCAL_DB_BOOTSTRAP_USER}:${LOCAL_DB_BOOTSTRAP_PASSWORD}@${host}:${port}/${LOCAL_DB_NAME}`;
}

export function localRedisUrl(
  host: string = LOCAL_REDIS_HOST_DEFAULT,
  port: number = LOCAL_REDIS_PORT_DEFAULT,
): string {
  return `redis://${host}:${port}`;
}
