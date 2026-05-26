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
    const result = await client.emails.send({
      from: resolveFrom(input),
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });

    if (result.error) {
      return { ok: false, skipped: false, error: result.error.message };
    }
    if (!result.data?.id) {
      return { ok: false, skipped: false, error: "Resend returned no message id" };
    }
    return { ok: true, messageId: result.data.id };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unknown Resend error";
    return { ok: false, skipped: false, error: message };
  }
}

// Test-only escape hatch for the unit tests that need to reset the cached
// client when toggling RESEND_API_KEY mid-suite.
export function __resetResendClientForTesting(): void {
  cachedClient = null;
}
