import type { LewisQueueName } from "@lewis/shared";
import type { Job } from "bullmq";

export type WorkerDefinition = {
  queueName: LewisQueueName;
  description: string;
  concurrency: number;
};

export const workerDefinitions: readonly WorkerDefinition[] = [
  {
    queueName: "notifications",
    description:
      "Notification dispatch queue. Carries marketing-confirmation sends (slice 4) plus future patient invite / account-created / password-reset flows.",
    concurrency: 5,
  },
  {
    queueName: "pdf",
    description:
      "PDF render queue contract; real Puppeteer processor lands with PDF template activation.",
    concurrency: 2,
  },
  {
    queueName: "compliance",
    description:
      "Compliance queue contract; real schedulers land with Sprint 3 compliance activation.",
    concurrency: 1,
  },
];

/**
 * Per-job-kind handler registry.
 *
 * BullMQ jobs carry a `name` field that we use as the kind discriminator.
 * The worker callback in apps/workers/src/index.ts looks each incoming job
 * up by `${queueName}:${job.name}`. If a handler is registered, it runs;
 * if not, the job falls through to the stub processor (so queues without
 * real consumers keep their slice-1 stub posture without error).
 *
 * Handlers register themselves at startup via `registerJobKind(...)`. See
 * apps/workers/src/handlers/marketing-confirmation.ts for the pattern.
 *
 * Each handler is responsible for:
 *   - Validating its own payload via the zod schema in @lewis/notifications.
 *     The dispatch router does NOT validate — handlers own their contract.
 *   - Returning a serializable result (or throwing on failure for retry).
 *   - Idempotency. BullMQ retries on failure; handlers must tolerate
 *     re-runs without double-effects (the marketing handler uses
 *     app.directory_marketing_mark_sent's "already-set guard" for this).
 */

export type JobKindHandler = (job: Job) => Promise<unknown>;

const handlers: Map<string, JobKindHandler> = new Map();

function dispatchKey(queueName: LewisQueueName, jobKind: string): string {
  return `${queueName}:${jobKind}`;
}

export function registerJobKind(
  queueName: LewisQueueName,
  jobKind: string,
  handler: JobKindHandler,
): void {
  const key = dispatchKey(queueName, jobKind);
  if (handlers.has(key)) {
    throw new Error(
      `Job-kind handler for ${key} is already registered. Each kind has exactly one handler.`,
    );
  }
  handlers.set(key, handler);
}

export function lookupJobHandler(
  queueName: LewisQueueName,
  jobKind: string,
): JobKindHandler | undefined {
  return handlers.get(dispatchKey(queueName, jobKind));
}

// Test-only helper. Avoid in production code paths — handler registration
// should happen exactly once at process startup.
export function __resetJobKindRegistryForTesting(): void {
  handlers.clear();
}
