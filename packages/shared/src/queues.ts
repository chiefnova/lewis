export const lewisQueueNames = ["notifications", "pdf", "compliance"] as const;

export type LewisQueueName = (typeof lewisQueueNames)[number];
