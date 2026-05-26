/**
 * @lewis/notifications — typed Resend wrapper + queue payload contracts +
 * email templates. The API enqueues jobs onto BullMQ; this package is the
 * shared spec the worker handlers + API enqueue calls agree on.
 *
 * Slice 4 introduces the marketing-confirmation flow (see queue-payloads.ts
 * + templates/marketing-confirmation.ts). Future flows (patient invite,
 * account created, password reset) follow the same pattern: payload schema
 * here, handler in apps/workers/src/handlers/.
 */

export * from "./queue-payloads.js";
export * from "./send-email.js";
export * from "./templates/marketing-confirmation.js";
