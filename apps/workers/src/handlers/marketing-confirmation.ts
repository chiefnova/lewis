import { getDatabasePool } from "@lewis/db";
import {
  MarketingConfirmationJobPayload,
  renderMarketingConfirmationEmail,
  sendEmail,
} from "@lewis/notifications";
import type { Job } from "bullmq";

import { resolveWorkerDatabaseEnv } from "../database-env.js";
import { logger } from "../logger.js";
import { registerJobKind } from "../registry.js";

/**
 * marketing_confirmation_send handler.
 *
 * Slice 4 (§ 11.2 / 11.9). The API enqueues this job whenever
 * app.directory_marketing_subscribe returns was_new=true. The handler:
 *   1. Validates the payload via the @lewis/notifications zod schema.
 *   2. Builds the confirm + unsubscribe URLs against LEWIS_DIRECTORY_BASE_URL.
 *   3. Renders the marketing-confirmation email template.
 *   4. Calls Resend via @lewis/notifications/sendEmail.
 *   5. On success, calls app.directory_marketing_mark_sent to stamp
 *      confirmation_sent_at. The function is workers-only (revoked from
 *      app_api in migration 0020).
 *   6. On Resend failure, throws so BullMQ retries with exponential backoff
 *      (configured at queue level in apps/workers/src/index.ts).
 *
 * Idempotency: the mark_sent helper has a `confirmation_sent_at is null`
 * guard, so a retry that hits Resend successfully a second time still won't
 * re-stamp the timestamp. Resend itself dedupes by message id so the user
 * doesn't receive a second copy.
 */

function resolveDirectoryBaseUrl(): string {
  const fromEnv = process.env.LEWIS_DIRECTORY_BASE_URL;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.replace(/\/+$/, "");
  }
  // Dev default — matches the directory Vite dev server.
  return "http://localhost:13003";
}

async function processMarketingConfirmationJob(
  job: Job,
): Promise<{ status: string; messageId?: string }> {
  const parse = MarketingConfirmationJobPayload.safeParse(job.data);
  if (!parse.success) {
    // Payload drift between the API + worker. This is a programmer error,
    // not a transient failure — throw so BullMQ marks the job failed
    // permanently rather than retrying forever.
    const issues = parse.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    logger.error(
      { jobId: job.id ?? "unknown", issues },
      "marketing_confirmation_send: payload validation failed",
    );
    throw new Error(`marketing_confirmation_send payload invalid: ${issues}`);
  }

  const { emailLower, confirmationToken, unsubscribeToken } = parse.data;

  const baseUrl = resolveDirectoryBaseUrl();
  const confirmUrl = `${baseUrl}/marketing/confirm?token=${encodeURIComponent(confirmationToken)}`;
  const unsubscribeUrl = `${baseUrl}/marketing/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;

  const rendered = renderMarketingConfirmationEmail({ confirmUrl, unsubscribeUrl });

  const startMs = Date.now();
  const result = await sendEmail({
    to: emailLower,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
  const sendMs = Date.now() - startMs;

  if (result.ok === false && result.skipped === true) {
    // Dev-time path: RESEND_API_KEY is not provisioned. Log loudly so the
    // human knows nothing went out, but don't fail the job — the row stays
    // pending and admin can re-enqueue once the key lands.
    logger.warn(
      {
        jobId: job.id ?? "unknown",
        confirmationToken,
        sendMs,
      },
      "marketing_confirmation_send: skipped (RESEND_API_KEY not set; dev-only path)",
    );
    return { status: "skipped_missing_api_key" };
  }

  if (result.ok === false) {
    // Real failure — throw so BullMQ retries with backoff.
    logger.error(
      {
        jobId: job.id ?? "unknown",
        confirmationToken,
        sendMs,
        error: result.error,
      },
      "marketing_confirmation_send: Resend returned an error",
    );
    throw new Error(`Resend send failed: ${result.error}`);
  }

  // Stamp confirmation_sent_at. Failure here doesn't unwind the email send
  // (already happened) — log + swallow. A future re-run on retry would just
  // re-call mark_sent (which is idempotent on the not-null guard).
  try {
    const pool = getDatabasePool(resolveWorkerDatabaseEnv());
    const stamped = await pool.query<{ directory_marketing_mark_sent: boolean }>(
      "select app.directory_marketing_mark_sent($1::uuid) as directory_marketing_mark_sent",
      [confirmationToken],
    );
    const wasStamped = stamped.rows[0]?.directory_marketing_mark_sent ?? false;
    logger.info(
      {
        jobId: job.id ?? "unknown",
        confirmationToken,
        sendMs,
        messageId: result.messageId,
        wasStamped,
      },
      "marketing_confirmation_send: delivered",
    );
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unknown DB error";
    logger.error(
      {
        jobId: job.id ?? "unknown",
        confirmationToken,
        sendMs,
        messageId: result.messageId,
        error: message,
      },
      "marketing_confirmation_send: email delivered but mark_sent failed (will not retry)",
    );
  }

  return { status: "delivered", messageId: result.messageId };
}

export function registerMarketingConfirmationHandler(): void {
  registerJobKind("notifications", "marketing_confirmation_send", processMarketingConfirmationJob);
}
