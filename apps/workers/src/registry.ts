import type { CorridorQueueName } from "@corridor/shared";

export type WorkerDefinition = {
  queueName: CorridorQueueName;
  description: string;
  concurrency: number;
};

export const workerDefinitions: readonly WorkerDefinition[] = [
  {
    queueName: "notifications",
    description:
      "Notification dispatch queue contract; real Resend processor lands with notification activation.",
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
