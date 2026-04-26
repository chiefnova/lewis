import { requiredEnv } from "@lewis/shared";
import Stripe from "stripe";

import { ApiError } from "../middleware/errors.js";

/**
 * Lazy Stripe client. We don't want to instantiate at module load because
 * STRIPE_SECRET_KEY may not be set in dev (e.g. patient app developer with
 * no Stripe keys). The client is only needed for `webhooks.constructEvent`,
 * which doesn't actually use the secret key — but the SDK requires one to
 * construct. We use a dummy in non-prod if missing, since constructEvent
 * doesn't make API calls.
 */
let stripeSingleton: Stripe | undefined;
function getStripe(): Stripe {
  if (!stripeSingleton) {
    const apiKey = process.env.STRIPE_SECRET_KEY ?? "sk_dev_unused_for_signature_verify_only";
    stripeSingleton = new Stripe(apiKey, {
      apiVersion: "2026-04-22.dahlia",
      typescript: true,
    });
  }
  return stripeSingleton;
}

/**
 * Verifies a Stripe webhook. Throws ApiError("forbidden") on missing/invalid
 * signature. Returns the typed Stripe.Event on success.
 *
 * Stripe requires the EXACT bytes received — read `c.req.text()` first, do
 * not parse JSON beforehand.
 */
export function verifyStripeWebhook(rawBody: string, headers: Headers): Stripe.Event {
  const signature = headers.get("stripe-signature");
  if (!signature) {
    throw new ApiError("forbidden", "missing stripe-signature header");
  }
  const webhookSecret = requiredEnv("STRIPE_WEBHOOK_SECRET");

  try {
    return getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    throw new ApiError("forbidden", "stripe webhook signature verification failed");
  }
}
