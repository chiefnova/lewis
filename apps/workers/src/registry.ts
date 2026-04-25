import type { CorridorQueueName } from "@corridor/shared";

export type WorkerDefinition = {
  queueName: CorridorQueueName;
  description: string;
  concurrency: number;
};

export const workerDefinitions: readonly WorkerDefinition[] = [
  {
    queueName: "notifications",
    description: "Dispatches Resend transactional emails and records delivery lifecycle.",
    concurrency: 5,
  },
  {
    queueName: "pdf",
    description: "Renders regulated PDF artifacts outside the API request path.",
    concurrency: 2,
  },
  {
    queueName: "compliance",
    description: "Runs daily compliance obligation scheduling and health-score recalculation.",
    concurrency: 1,
  },
];
