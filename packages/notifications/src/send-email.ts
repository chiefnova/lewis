import { Resend } from "resend";

/**
 * Typed wrapper around the Resend SDK. The notifications worker calls this
 * for every transactional + marketing email; the API never calls Resend
 * directly (per CLAUDE.md gotcha — Puppeteer/Resend run in workers, not the
 * request path).
 *
 * Defensive on missing env: if RESEND_API_KEY is not set, the function
 * returns `{ skipped: true }` and logs nothing. The caller (the worker
 * handler) decides whether to treat that as an error. In dev the user may
 * not have provisioned Resend yet; the worker logs a "would-have-sent"
 * line and the BullMQ job completes successfully so the e2e flow doesn't
 * error.
 *
 * In production the worker startup must assert RESEND_API_KEY is set
 * (see apps/workers/src/index.ts) — defaulting silent in prod is a
 * compliance risk.
 */

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
  /**
   * Optional Resend idempotency key. When set, Resend dedupes sends with the
   * same key within a 24h window — so a BullMQ retry that races a prior
   * successful send (delivered, but the row's mark_sent hadn't committed
   * yet) does NOT deliver a second copy. Callers should key it off the
   * stable row id, e.g. `connect_request_send:<connectRequestId>`.
   */
  idempotencyKey?: string;
};

export type SendEmailResult =
  | { ok: true; messageId: string }
  | { ok: false; skipped: true; reason: "missing_api_key" }
  | { ok: false; skipped: false; error: string };

let cachedClient: Resend | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return null;
  }
  if (cachedClient === null) {
    cachedClient = new Resend(apiKey);
  }
  return cachedClient;
}

function resolveFrom(input: SendEmailInput): string {
  if (input.from) return input.from;
  const fromEnv = process.env.LEWIS_MARKETING_FROM;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv;
  // Last-resort default. Production assertion should fail before this is hit.
  return "Lewis Health <hello@lewis.health>";
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const client = getClient();
  if (!client) {
    return { ok: false, skipped: true, reason: "missing_api_key" };
  }

  try {
    const result = await client.emails.send(
      {
        from: resolveFrom(input),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      },
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
    );

    // Return stable, sanitized error codes instead of raw provider text.
    // Resend's error.message can echo the recipient address (PII; PHI when
    // the recipient is a Lewis patient), and the caller (the worker handler)
    // logs `result.error` + rethrows it — sanitizing at the source keeps
    // worker logs, Sentry, and BullMQ failure messages PHI-free per
    // CLAUDE.md § Security #3. Provider-side detail remains observable via
    // the Resend dashboard.
    if (result.error) {
      return { ok: false, skipped: false, error: "RESEND_PROVIDER_ERROR" };
    }
    if (!result.data?.id) {
      return { ok: false, skipped: false, error: "NO_MESSAGE_ID" };
    }
    return { ok: true, messageId: result.data.id };
  } catch {
    return { ok: false, skipped: false, error: "UNKNOWN_PROVIDER_ERROR" };
  }
}

// Test-only escape hatch for the unit tests that need to reset the cached
// client when toggling RESEND_API_KEY mid-suite.
export function __resetResendClientForTesting(): void {
  cachedClient = null;
}
