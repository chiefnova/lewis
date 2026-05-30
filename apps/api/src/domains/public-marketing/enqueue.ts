import {
  MarketingConfirmationJobPayload,
  type MarketingConfirmationJobPayload as MarketingConfirmationJobPayloadType,
} from "@lewis/notifications";
import { resolveRedisConnectionConfig } from "@lewis/shared";
import { Queue } from "bullmq";
import Redis, { type RedisOptions } from "ioredis";

import { logger } from "../../logger.js";

/**
 * Lazy BullMQ producer for the slice-4 marketing-confirmation flow.
 *
 * The API enqueues onto the existing `notifications` queue (see
 * apps/workers/src/registry.ts). Each job is named with its kind
 * (`marketing_confirmation_send`); the worker dispatch router in
 * apps/workers/src/index.ts looks up the per-kind handler in
 * apps/workers/src/handlers/marketing-confirmation.ts.
 *
 * BullMQ producers need a Redis connection with `maxRetriesPerRequest: null`
 * (BullMQ blocks indefinitely on retries) — the API's default redis client
 * uses a finite retry policy for its rate-limit reads, so producers run on
 * their own connection here.
 */

const NOTIFICATIONS_QUEUE_NAME = "notifications";

let cachedQueue: Queue | undefined;
let cachedConnection: Redis | undefined;

function buildBullmqConnection(env: NodeJS.ProcessEnv = process.env): Redis {
  const config = resolveRedisConnectionConfig(env);
  const options: RedisOptions = {
    connectionName: "api:bullmq:notifications",
    enableReadyCheck: true,
    // BullMQ requires this to be null. With finite retries the queue can
    // miss `bclient` reads + behave unpredictably under network blips.
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
        // Five attempts with exponential backoff. Resend transient failures
        // resolve within ~30 min; if the job still fails after that the row
        // stays pending and ops can re-enqueue from the admin console.
        attempts: 5,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: { age: 60 * 60 * 24 * 7, count: 1000 }, // 7 days
        removeOnFail: { age: 60 * 60 * 24 * 30 }, // 30 days for ops triage
      },
    });
  }
  return cachedQueue;
}

export async function enqueueMarketingConfirmation(
  payload: MarketingConfirmationJobPayloadType,
): Promise<{ jobId: string }> {
  // Validate at the producer boundary too. The worker re-validates on receive
  // — defense in depth against cache-of-the-day producers writing stale
  // payload shapes.
  const validated = MarketingConfirmationJobPayload.parse(payload);

  const queue = getNotificationsQueue();
  const job = await queue.add("marketing_confirmation_send", validated, {
    // jobId keyed off the confirmation token guards against double-enqueue
    // on a retry — BullMQ rejects an add() with an existing jobId.
    jobId: `marketing_confirmation_send:${validated.confirmationToken}`,
  });

  logger.info(
    {
      route: "queue.notifications.add",
      kind: "marketing_confirmation_send",
      jobId: job.id ?? "unknown",
    },
    "marketing_confirmation_send enqueued",
  );

  return { jobId: job.id ?? "unknown" };
}

// Test-only escape hatch — clear the cached queue so the unit tests can
// inject a fake without process-global state polluting the next test.
export function __resetNotificationsQueueForTesting(): void {
  cachedQueue = undefined;
  if (cachedConnection) {
    cachedConnection.disconnect();
    cachedConnection = undefined;
  }
}
