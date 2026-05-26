import { z } from "zod";

/**
 * Job-kind contracts for the BullMQ `notifications` queue.
 *
 * BullMQ jobs carry a `name` field. Lewis uses the name as the kind
 * discriminator and the data field as the payload — the worker dispatch
 * router (apps/workers/src/registry.ts) looks handlers up by
 * `${queueName}:${jobName}`.
 *
 * Adding a new job kind:
 *   1. Add the literal to `LewisJobKind` below.
 *   2. Add a payload zod schema next to the others.
 *   3. Register a handler in apps/workers/src/handlers/ that imports the
 *      schema and validates the job's data before processing.
 *   4. The API enqueue path imports the schema and types its `queue.add`
 *      call — drift between API + worker payloads is caught at typecheck.
 */

export const LewisJobKind = z.enum(["marketing_confirmation_send"]);
export type LewisJobKind = z.infer<typeof LewisJobKind>;

/**
 * `marketing_confirmation_send` — sent when a fresh marketing subscription
 * row is created via app.directory_marketing_subscribe (slice 4 §
 * 11.2 / 11.9). Worker handler renders the confirmation email and calls
 * Resend, then stamps confirmation_sent_at via app.directory_marketing_mark_sent.
 *
 * Email is required + lower-cased; tokens are UUIDv4. The job payload is
 * the minimum the worker needs — the row's authoritative state lives in
 * marketing_subscriptions and is read on the confirm/unsubscribe paths.
 */
export const MarketingConfirmationJobPayload = z.object({
  emailLower: z.string().email(),
  confirmationToken: z.string().uuid(),
  unsubscribeToken: z.string().uuid(),
});
export type MarketingConfirmationJobPayload = z.infer<typeof MarketingConfirmationJobPayload>;
