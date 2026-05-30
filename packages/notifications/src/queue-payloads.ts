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

export const LewisJobKind = z.enum(["marketing_confirmation_send", "connect_request_send"]);
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

/**
 * `connect_request_send` — Slice 5 § 18.2 / § 18.4. The API enqueues this
 * job after persisting a connect_requests row via the SECURITY DEFINER
 * directory_connect_request_create helper. The worker handler:
 *
 *   1. Reads the row via app.directory_connect_request_for_send (worker-only
 *      grant) to get patient contact fields + the offering ETC's intake_email
 *      / fallback medical_director_clinical_email + any linked eligibility
 *      session answers.
 *   2. Renders the connect-request template (HTML + plain text) and sends
 *      via Resend to the ETC's intake (or fallback) address with the
 *      "[Lewis] New patient inquiry for {program} — {date}" subject.
 *   3. On success, calls app.directory_connect_request_mark_sent(id,
 *      message_id) to stamp the row sent. The function is idempotent so a
 *      retry that double-delivers can't double-stamp.
 *
 * The payload carries only the id — the read happens worker-side so
 * tightening the row's read surface (worker-only EXECUTE) is the single
 * gate.
 */
export const ConnectRequestSendJobPayload = z.object({
  connectRequestId: z.string().uuid(),
});
export type ConnectRequestSendJobPayload = z.infer<typeof ConnectRequestSendJobPayload>;
