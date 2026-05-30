import { createHash } from "node:crypto";

import { getDatabasePool } from "@lewis/db";
import {
  ConnectRequestSendJobPayload,
  renderConnectRequestEmail,
  sendEmail,
} from "@lewis/notifications";
import type { Job } from "bullmq";

import { resolveWorkerDatabaseEnv } from "../database-env.js";
import { logger } from "../logger.js";
import { registerJobKind } from "../registry.js";

/**
 * connect_request_send handler.
 *
 * Slice 5 (§ 18.2 / § 18.4). The API enqueues this job after a successful
 * POST /v1/public/connect-requests; the row is already persisted with
 * status='pending'. The handler:
 *
 *   1. Validates the payload via the @lewis/notifications zod schema.
 *   2. Reads the assembled row payload via app.directory_connect_request_for_send
 *      (worker-only EXECUTE, set up in migration 0021). The function
 *      filters on status='pending' so a retry that races a successful
 *      send just returns zero rows and the handler exits cleanly.
 *   3. Resolves the recipient address: intake_email if set, else the
 *      ETC's medical_director_clinical_email (fallback). Refuses to
 *      send (job fails) if neither is set so the operator notices.
 *   4. Renders the connect-request email template (HTML + plain text)
 *      and sends via Resend.
 *   5. On success, calls app.directory_connect_request_mark_sent(id,
 *      message_id) to stamp the row sent. The function is idempotent
 *      on the "status='pending'" guard so a retry can't double-stamp.
 *   6. On Resend failure, throws so BullMQ retries with exponential
 *      backoff. On a missing API key in non-dev, throws (same posture
 *      as marketing-confirmation).
 *
 * connectRequestId is a non-secret UUID — the database is the audit
 * truth — but we hash + prefix it in log payloads for parity with the
 * marketing handler's confirmationToken hashing.
 */

function hashIdPrefix(id: string): string {
  return createHash("sha256").update(id).digest("hex").slice(0, 8);
}

type ForSendRow = {
  request_id: string;
  program_slug: string;
  program_name: string;
  etc_name: string;
  intake_email: string | null;
  fallback_email: string | null;
  patient_name: string;
  patient_email: string;
  patient_phone: string | null;
  best_time_to_contact: string | null;
  situation: string | null;
  eligibility_answers: Record<string, string> | string | null;
  eligibility_status: "in_progress" | "passed" | "failed" | null;
  eligibility_failed_criterion: string | null;
  created_at: Date | string;
};

function formatMtDate(value: Date): string {
  // America/Denver per CLAUDE.md timezone gotcha. The new Intl.DateTimeFormat
  // call is cheap; no need to memoize.
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(value);
}

async function processConnectRequestSendJob(
  job: Job,
): Promise<{ status: string; messageId?: string }> {
  const parse = ConnectRequestSendJobPayload.safeParse(job.data);
  if (!parse.success) {
    const issues = parse.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    logger.error(
      { jobId: job.id ?? "unknown", issues },
      "connect_request_send: payload validation failed",
    );
    throw new Error(`connect_request_send payload invalid: ${issues}`);
  }

  const { connectRequestId } = parse.data;
  const hashedIdPrefix = hashIdPrefix(connectRequestId);

  const pool = getDatabasePool(resolveWorkerDatabaseEnv());

  const forSend = await pool.query<ForSendRow>(
    `select
       request_id, program_slug, program_name, etc_name,
       intake_email, fallback_email,
       patient_name, patient_email, patient_phone,
       best_time_to_contact, situation,
       eligibility_answers, eligibility_status, eligibility_failed_criterion,
       created_at
     from app.directory_connect_request_for_send($1::uuid)`,
    [connectRequestId],
  );

  const row = forSend.rows[0];
  if (!row) {
    // Either the row was already marked sent (idempotency win on a
    // BullMQ retry that races a prior successful send) or it was
    // cancelled by an admin. Either way: succeed silently.
    logger.info(
      { jobId: job.id ?? "unknown", hashedIdPrefix },
      "connect_request_send: no pending row (likely already sent)",
    );
    return { status: "no_pending_row" };
  }

  // Recipient resolution: intake_email first, fallback to medical-director
  // clinical email. Either one must be present — refusing to send is
  // safer than silently emailing the wrong person.
  const recipient = (row.intake_email ?? row.fallback_email ?? "").trim();
  if (recipient.length === 0) {
    logger.error(
      { jobId: job.id ?? "unknown", hashedIdPrefix, etcName: row.etc_name },
      "connect_request_send: ETC has no intake_email or fallback medical-director email",
    );
    throw new Error(
      `connect_request_send: ${row.etc_name} has no deliverable address; set etcs.intake_email`,
    );
  }

  // Normalize eligibility shape for the template — pg's jsonb columns
  // arrive as objects via node-postgres but defensive-string-parse just
  // in case a future driver upgrade changes the contract.
  const answers =
    typeof row.eligibility_answers === "string"
      ? (JSON.parse(row.eligibility_answers) as Record<string, string>)
      : (row.eligibility_answers ?? {});

  const eligibility =
    row.eligibility_status !== null
      ? {
          status: row.eligibility_status,
          answers,
          failedCriterion: row.eligibility_failed_criterion,
        }
      : null;

  const createdAt = row.created_at instanceof Date ? row.created_at : new Date(row.created_at);

  const rendered = renderConnectRequestEmail({
    programSlug: row.program_slug,
    programName: row.program_name,
    submittedDateMt: formatMtDate(createdAt),
    patientName: row.patient_name,
    patientEmail: row.patient_email,
    patientPhone: row.patient_phone,
    bestTimeToContact: row.best_time_to_contact,
    situation: row.situation,
    eligibility,
  });

  const startMs = Date.now();
  const result = await sendEmail({
    to: recipient,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    // The patient's email goes in Reply-To so the ETC coordinator can
    // reply directly without copy/paste. From stays the Lewis sender so
    // SPF/DKIM stay aligned.
    replyTo: row.patient_email,
    // Idempotency: send-then-mark_sent is at-least-once — if the process
    // dies after Resend accepts but before mark_sent commits, BullMQ
    // retries and for_send returns the still-pending row again. Keying the
    // send off the connect_request id makes Resend dedupe the retry within
    // its 24h window, so the ETC never receives a duplicate patient inquiry.
    idempotencyKey: `connect_request_send:${connectRequestId}`,
  });
  const sendMs = Date.now() - startMs;

  if (result.ok === false && result.skipped === true) {
    // Same posture as marketing-confirmation: stub-succeed in dev/test,
    // throw in production / staging so the failure surfaces.
    const nodeEnv = process.env.NODE_ENV ?? "development";
    const isDevOrTest = nodeEnv === "development" || nodeEnv === "test";
    if (!isDevOrTest) {
      logger.error(
        { jobId: job.id ?? "unknown", hashedIdPrefix, sendMs },
        "connect_request_send: RESEND_API_KEY missing in non-dev runtime",
      );
      throw new Error(
        `connect_request_send: RESEND_API_KEY not configured (NODE_ENV=${nodeEnv}); refusing to silently no-op ETC inquiry email`,
      );
    }
    logger.warn(
      {
        jobId: job.id ?? "unknown",
        hashedIdPrefix,
        sendMs,
        etcName: row.etc_name,
      },
      "connect_request_send: skipped (RESEND_API_KEY not set; dev-only path)",
    );
    return { status: "skipped_missing_api_key" };
  }

  if (result.ok === false) {
    logger.error(
      {
        jobId: job.id ?? "unknown",
        hashedIdPrefix,
        sendMs,
        error: result.error,
      },
      "connect_request_send: Resend returned an error",
    );
    throw new Error(`Resend send failed: ${result.error}`);
  }

  // Stamp the row sent. Failure here doesn't unwind the email send
  // (Resend already accepted it). Idempotent on status='pending', so a
  // race with a second worker that already stamped resolves to false +
  // wasStamped=false in the log.
  try {
    const stamped = await pool.query<{ directory_connect_request_mark_sent: boolean }>(
      `select app.directory_connect_request_mark_sent($1::uuid, $2)
         as directory_connect_request_mark_sent`,
      [connectRequestId, result.messageId],
    );
    const wasStamped = stamped.rows[0]?.directory_connect_request_mark_sent ?? false;
    logger.info(
      {
        jobId: job.id ?? "unknown",
        hashedIdPrefix,
        sendMs,
        messageId: result.messageId,
        wasStamped,
        etcName: row.etc_name,
      },
      "connect_request_send: delivered",
    );
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unknown DB error";
    logger.error(
      {
        jobId: job.id ?? "unknown",
        hashedIdPrefix,
        sendMs,
        messageId: result.messageId,
        error: message,
      },
      "connect_request_send: email delivered but mark_sent failed (will not retry)",
    );
  }

  return { status: "delivered", messageId: result.messageId };
}

export function registerConnectRequestHandler(): void {
  registerJobKind("notifications", "connect_request_send", processConnectRequestSendJob);
}
