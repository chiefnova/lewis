export const corridorQueueNames = ["notifications", "pdf", "compliance"] as const;

export type CorridorQueueName = (typeof corridorQueueNames)[number];
