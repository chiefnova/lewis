import {
  assertRuntimeRole,
  closeDatabasePool,
  getDatabasePool,
  initializeDatabase,
} from "@lewis/db";
import { QueueEvents, Worker, type Job } from "bullmq";

import { resolveWorkerDatabaseEnv } from "./database-env.js";
import { registerConnectRequestHandler } from "./handlers/connect-request.js";
import { registerMarketingConfirmationHandler } from "./handlers/marketing-confirmation.js";
import { logger } from "./logger.js";
import { lookupJobHandler, workerDefinitions, type WorkerDefinition } from "./registry.js";
import { closeRedisConnections, createRedisConnection } from "./redis.js";

type WorkerRuntime = {
  workers: Worker[];
  queueEvents: QueueEvents[];
};

const runtime: WorkerRuntime = {
  workers: [],
  queueEvents: [],
};

function stubWorkersEnabled(): boolean {
  const nodeEnv = process.env.NODE_ENV ?? "development";

  if (nodeEnv === "production") {
    if (process.env.ENABLE_STUB_WORKERS === "true") {
      logger.warn(
        { nodeEnv },
        "ENABLE_STUB_WORKERS=true is being IGNORED because NODE_ENV=production. Stub processors are forbidden in production regardless of any flag.",
      );
    }
    return false;
  }

  return (
    process.env.ENABLE_STUB_WORKERS === "true" || nodeEnv === "development" || nodeEnv === "test"
  );
}

async function processStubJob(
  job: Job,
  definition: WorkerDefinition,
): Promise<Record<string, string>> {
  logger.debug(
    { queueName: definition.queueName, jobId: job.id ?? "unknown", jobName: job.name },
    "stub processor invoked (no registered handler for this kind)",
  );
  return {
    status: "stubbed",
    queueName: definition.queueName,
    jobId: job.id ?? "unknown",
  };
}

/**
 * Dispatch router. Each incoming job is looked up by `${queueName}:${job.name}`
 * in the per-job-kind handler registry (apps/workers/src/registry.ts).
 *
 * Behavior on miss is gated by `isStub` (computed once at startup from
 * `stubWorkersEnabled()`):
 *   - stub mode (dev / test / explicit ENABLE_STUB_WORKERS=true): fall through
 *     to processStubJob so queues without real consumers keep their slice-1
 *     posture for local iteration.
 *   - non-stub mode (production, or any future per-queue activation): throw
 *     a descriptive Error so BullMQ retries with backoff and the failure is
 *     observable via the worker.on("failed", …) pino log, instead of
 *     silently marking a real business job (e.g., a patient invite or a PDF
 *     render) as completed.
 */
async function dispatchJob(
  job: Job,
  definition: WorkerDefinition,
  isStub: boolean,
): Promise<unknown> {
  const handler = lookupJobHandler(definition.queueName, job.name);
  if (handler) {
    return handler(job);
  }
  if (isStub) {
    return processStubJob(job, definition);
  }
  throw new Error(`No handler for job ${job.name} on queue ${definition.queueName}`);
}

async function registerWorker(definition: WorkerDefinition, isStub: boolean): Promise<void> {
  const worker = new Worker(definition.queueName, (job) => dispatchJob(job, definition, isStub), {
    connection: createRedisConnection(`worker:${definition.queueName}`),
    concurrency: definition.concurrency,
  });

  const queueEvents = new QueueEvents(definition.queueName, {
    connection: createRedisConnection(`events:${definition.queueName}`),
  });

  worker.on("failed", (job, error) => {
    logger.error(
      {
        queueName: definition.queueName,
        jobId: job?.id ?? "unknown",
        message: error.message,
      },
      "worker job failed",
    );
  });

  queueEvents.on("completed", ({ jobId }) => {
    logger.debug({ queueName: definition.queueName, jobId }, "worker job completed");
  });

  queueEvents.on("failed", ({ jobId, failedReason }) => {
    logger.error(
      {
        queueName: definition.queueName,
        jobId,
        message: failedReason,
      },
      "worker queue event reported failure",
    );
  });

  await Promise.all([worker.waitUntilReady(), queueEvents.waitUntilReady()]);
  runtime.workers.push(worker);
  runtime.queueEvents.push(queueEvents);
  logger.info(
    { queueName: definition.queueName, description: definition.description },
    "worker registered",
  );
}

// Defense-in-depth: workers must connect as a non-superuser NOBYPASSRLS role
// so the runtime role split actually gates RLS evaluation. The regular worker
// uses app_worker; the elevated worker uses app_worker_elevated. Tests can opt
// out with WORKER_RUNTIME_ROLE_OPT_OUT=true.
async function assertWorkerRuntimeRole(): Promise<void> {
  if (process.env.WORKER_RUNTIME_ROLE_OPT_OUT === "true") {
    logger.warn(
      "WORKER_RUNTIME_ROLE_OPT_OUT=true — skipping runtime DB role assertion. This must never be set in staging/prod.",
    );
    return;
  }

  const expectedRoles =
    process.env.WORKER_ELEVATED === "true" ? ["app_worker_elevated"] : ["app_worker"];
  const pool = getDatabasePool(resolveWorkerDatabaseEnv());
  const row = await assertRuntimeRole(pool, { expectedRoles });
  logger.info(
    {
      dbUser: row.current_user,
      bypassRls: row.rolbypassrls,
      elevated: process.env.WORKER_ELEVATED === "true",
    },
    "worker runtime DB role verified",
  );
}

async function startup(): Promise<void> {
  const isStub = stubWorkersEnabled();
  if (!isStub) {
    throw new Error(
      "Worker processors are still scaffolded. Set ENABLE_STUB_WORKERS=true only for intentional non-production stub execution.",
    );
  }

  await initializeDatabase(resolveWorkerDatabaseEnv());
  await assertWorkerRuntimeRole();

  // Register per-job-kind handlers before workers start consuming. The order
  // matters: registerJobKind throws on duplicate registration, which would
  // surface a bug if two handlers tried to claim the same kind.
  registerMarketingConfirmationHandler();
  registerConnectRequestHandler();

  const startupRedis = createRedisConnection("worker:startup");
  const redisPing = await startupRedis.ping();
  if (redisPing !== "PONG") {
    throw new Error("Redis ping failed during worker startup");
  }
  startupRedis.disconnect();

  for (const definition of workerDefinitions) {
    await registerWorker(definition, isStub);
  }

  logger.info({ queues: workerDefinitions.map((d) => d.queueName), isStub }, "lewis workers ready");
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info({ signal }, "lewis workers shutting down");
  await Promise.allSettled(runtime.workers.map((worker) => worker.close()));
  await Promise.allSettled(runtime.queueEvents.map((queueEvent) => queueEvent.close()));
  await Promise.allSettled([closeRedisConnections(), closeDatabasePool()]);
}

process.once("SIGINT", (signal) => {
  void shutdown(signal).then(() => process.exit(0));
});

process.once("SIGTERM", (signal) => {
  void shutdown(signal).then(() => process.exit(0));
});

startup().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown worker startup error";
  logger.fatal({ message }, "worker startup failed");
  void Promise.allSettled([closeRedisConnections(), closeDatabasePool()]).finally(() => {
    process.exit(1);
  });
});
