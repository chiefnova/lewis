import { serve } from "@hono/node-server";
import { closeDatabasePool, initializeDatabase } from "@corridor/db";

import { logger } from "./logger.js";
import { closeRedisClient, initializeRedis } from "./redis.js";
import { app } from "./server.js";

const port = Number(process.env.PORT ?? 13001);

type Server = ReturnType<typeof serve>;

async function startup(): Promise<void> {
  await initializeDatabase();
  await initializeRedis();
  logger.info("corridor API dependencies ready: postgres, redis");
}

async function shutdown(signal: NodeJS.Signals, server: Server): Promise<void> {
  logger.info({ signal }, "corridor API shutting down");
  server.close();
  await Promise.allSettled([closeRedisClient(), closeDatabasePool()]);
}

async function main(): Promise<void> {
  await startup();

  const server = serve({ fetch: app.fetch, port }, (info) => {
    logger.info({ port: info.port }, "corridor API listening");
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
