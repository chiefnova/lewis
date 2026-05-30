import {
  ConnectRequestSendJobPayload,
  type ConnectRequestSendJobPayload as ConnectRequestSendJobPayloadType,
} from "@lewis/notifications";
import { resolveRedisConnectionConfig } from "@lewis/shared";
import { Queue } from "bullmq";
import Redis, { type RedisOptions } from "ioredis";

import { logger } from "../../logger.js";

/**
 * Lazy BullMQ producer for the slice-5 connect_request_send flow.
 *
 * The API enqueues onto the same `notifications` queue used by slice 4's
 * marketing-confirmation path. Each job is named with its kind
 * (`connect_request_send`); the worker dispatch router in
 * apps/workers/src/index.ts looks up the per-kind handler in
 * apps/workers/src/handlers/connect-request.ts.
 *
 * Mirrors apps/api/src/domains/public-marketing/enqueue.ts — the BullMQ
 * connection settings (maxRetriesPerRequest: null) and defaultJobOptions
 * (exponential backoff, 5 attempts, 7-day complete retention, 30-day fail
 * retention) are identical because the failure shapes are the same.
 */

const NOTIFICATIONS_QUEUE_NAME = "notifications";

let cachedQueue: Queue | undefined;
let cachedConnection: Redis | undefined;

function buildBullmqConnection(env: NodeJS.ProcessEnv = process.env): Redis {
  const config = resolveRedisConnectionConfig(env);
  const options: RedisOptions = {
    connectionName: "api:bullmq:notifications:connect",
    enableReadyCheck: true,
    maxRetriesPerRequest: null,
  };
  if (config.kind === "url") {
    return new Redis(config.url, options);
  }
  return new Redis({ ...options, host: config.host, port: config.port });
}

function getNotificationsQueue(): Queue {
  if (!cachedQueue) {
    cachedConnection = buildBullmqConnection();
    cachedQueue = new Queue(NOTIFICATIONS_QUEUE_NAME, {
      connection: cachedConnection,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: { age: 60 * 60 * 24 * 7, count: 1000 },
        removeOnFail: { age: 60 * 60 * 24 * 30 },
      },
    });
  }
  return cachedQueue;
}

export async function enqueueConnectRequestSend(
  payload: ConnectRequestSendJobPayloadType,
): Promise<{ jobId: string }> {
  // Validate at the producer boundary too. The worker re-validates on
  // receive — defense in depth against drift between API + worker payload
  // shapes.
  const validated = ConnectRequestSendJobPayload.parse(payload);

  const queue = getNotificationsQueue();
  const job = await queue.add("connect_request_send", validated, {
    // jobId keyed off the connect_request id guards against double-enqueue
    // on a retry — BullMQ rejects an add() with an existing jobId. The
    // row is single-use (status flips pending → sent + mark_sent is
    // idempotent), so the id is the right deduplication key.
    jobId: `connect_request_send:${validated.connectRequestId}`,
  });

  logger.info(
    {
      route: "queue.notifications.add",
      kind: "connect_request_send",
      jobId: job.id ?? "unknown",
      connectRequestId: validated.connectRequestId,
    },
    "connect_request_send enqueued",
  );

  return { jobId: job.id ?? "unknown" };
}

// Test-only escape hatch — clear the cached queue so the unit tests can
// inject a fake without process-global state polluting the next test.
export function __resetConnectQueueForTesting(): void {
  cachedQueue = undefined;
  if (cachedConnection) {
    cachedConnection.disconnect();
    cachedConnection = undefined;
  }
}
