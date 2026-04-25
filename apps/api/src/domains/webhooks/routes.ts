import { buildErrorResponse } from "@corridor/shared";
import { Hono, type Context } from "hono";

import { ApiError } from "../../middleware/errors.js";
import { verifyClerkWebhook } from "../../webhooks/clerk.js";
import { verifyPlaidWebhook } from "../../webhooks/plaid.js";
import { verifyResendWebhook } from "../../webhooks/resend.js";
import { verifyStripeWebhook } from "../../webhooks/stripe.js";

/**
 * Webhook subrouter.
 *
 * IMPORTANT: this router lives OUTSIDE the auth middleware chain because
 * webhook callers (Stripe, Plaid, Clerk, Resend) don't carry Clerk JWTs.
 * Each handler verifies the provider's signature itself before doing anything.
 *
 * Until real handler logic lands, every route returns 501 Not Implemented
 * AFTER successful verification. The CI gate
 * (.github/workflows/api-ci.yml) ensures every /v1/webhooks/* route calls a
 * verifier — it greps each route file for the matching `verify*Webhook(`.
 *
 * Body parsing: handlers MUST read raw bytes via c.req.text() and pass them
 * to the verifier. Stripe and Svix both sign the exact bytes received; if you
 * c.req.json() first, you'll fail signature verification on whitespace/key-
 * order normalization.
 */
type ApiVariables = {
  requestId: string;
};

type WebhookContext = Context<{ Variables: ApiVariables }>;

export const webhookRoutes = new Hono<{ Variables: ApiVariables }>();

function notImplementedResponse(c: WebhookContext, provider: string): Response {
  const requestId = c.get("requestId") ?? "unknown";
  return c.json(
    buildErrorResponse(
      "not_implemented",
      `${provider} webhook scaffold accepted; signature verified but no handler is wired up yet.`,
      requestId,
      { provider, scaffold: true },
    ),
    501,
  );
}

webhookRoutes.post("/clerk", async (c) => {
  const rawBody = await c.req.text();
  if (!rawBody) {
    throw new ApiError("unprocessable", "empty webhook body");
  }
  verifyClerkWebhook(rawBody, c.req.raw.headers);
  return notImplementedResponse(c, "clerk");
});

webhookRoutes.post("/stripe", async (c) => {
  const rawBody = await c.req.text();
  if (!rawBody) {
    throw new ApiError("unprocessable", "empty webhook body");
  }
  verifyStripeWebhook(rawBody, c.req.raw.headers);
  return notImplementedResponse(c, "stripe");
});

webhookRoutes.post("/plaid", async (c) => {
  const rawBody = await c.req.text();
  if (!rawBody) {
    throw new ApiError("unprocessable", "empty webhook body");
  }
  await verifyPlaidWebhook(rawBody, c.req.raw.headers);
  return notImplementedResponse(c, "plaid");
});

webhookRoutes.post("/resend", async (c) => {
  const rawBody = await c.req.text();
  if (!rawBody) {
    throw new ApiError("unprocessable", "empty webhook body");
  }
  verifyResendWebhook(rawBody, c.req.raw.headers);
  return notImplementedResponse(c, "resend");
});
