import { serve } from "@hono/node-server";
import {
  assertRuntimeRole,
  closeDatabasePool,
  getDatabasePool,
  initializeDatabase,
} from "@lewis/db";

import { logger } from "./logger.js";
import { closeRedisClient, initializeRedis } from "./redis.js";
import { app } from "./server.js";

const port = Number(process.env.PORT ?? 13001);

type Server = ReturnType<typeof serve>;

// Defense-in-depth: the API process must connect as a non-superuser
// NOBYPASSRLS role so the RLS hardening in migrations 0011-0017 actually
// fires. Tests can opt out with API_RUNTIME_ROLE_OPT_OUT=true (see
// packages/db/src/runtime-role.ts). NODE_ENV=test alone does not opt out
// because integration tests still need the role contract enforced.
async function assertApiRuntimeRole(): Promise<void> {
  if (process.env.API_RUNTIME_ROLE_OPT_OUT === "true") {
    logger.warn(
      "API_RUNTIME_ROLE_OPT_OUT=true — skipping runtime DB role assertion. This must never be set in staging/prod.",
    );
    return;
  }

  const pool = getDatabasePool();
  const row = await assertRuntimeRole(pool, { expectedRoles: ["app_api"] });
  logger.info(
    { dbUser: row.current_user, bypassRls: row.rolbypassrls },
    "API runtime DB role verified",
  );
}

async function startup(): Promise<void> {
  await initializeDatabase();
  await assertApiRuntimeRole();
  await initializeRedis();
  logger.info("lewis API dependencies ready: postgres, redis");
}

async function shutdown(signal: NodeJS.Signals, server: Server): Promise<void> {
  logger.info({ signal }, "lewis API shutting down");
  server.close();
  await Promise.allSettled([closeRedisClient(), closeDatabasePool()]);
}

async function main(): Promise<void> {
  await startup();

  const server = serve({ fetch: app.fetch, port }, (info) => {
    logger.info({ port: info.port }, "lewis API listening");
  });

  process.once("SIGINT", (signal) => {
    void shutdown(signal, server).then(() => process.exit(0));
  });

  process.once("SIGTERM", (signal) => {
    void shutdown(signal, server).then(() => process.exit(0));
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown API startup error";
  logger.fatal({ message }, "API startup failed");
  void Promise.allSettled([closeRedisClient(), closeDatabasePool()]).finally(() => {
    process.exit(1);
  });
});
