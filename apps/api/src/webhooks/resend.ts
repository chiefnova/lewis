import { requiredEnv } from "@lewis/shared";
import { Webhook as Svix } from "svix";

import { ApiError } from "../middleware/errors.js";

/**
 * Resend webhook verification. Resend uses Svix-formatted signatures (same
 * three-header convention as Clerk).
 */
export function verifyResendWebhook(rawBody: string, headers: Headers): unknown {
  const secret = requiredEnv("RESEND_WEBHOOK_SECRET");
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new ApiError("forbidden", "missing resend webhook signature headers");
  }

  const wh = new Svix(secret);
  try {
    return wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch {
    throw new ApiError("forbidden", "resend webhook signature verification failed");
  }
}
