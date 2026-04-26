import { requiredEnv } from "@lewis/shared";
import { Webhook as Svix } from "svix";

import { ApiError } from "../middleware/errors.js";

/**
 * Verifies a Clerk webhook payload. Clerk uses Svix for webhook signing —
 * three required headers: `svix-id`, `svix-timestamp`, `svix-signature`.
 *
 * Throws ApiError("forbidden") on missing/invalid signature. Returns the
 * parsed event payload on success. Caller must NOT touch the body before
 * passing it in — `rawBody` is the exact bytes Clerk signed.
 */
export function verifyClerkWebhook(rawBody: string, headers: Headers): unknown {
  const secret = requiredEnv("CLERK_WEBHOOK_SECRET");
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new ApiError("forbidden", "missing clerk webhook signature headers");
  }

  const wh = new Svix(secret);
  try {
    return wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch {
    throw new ApiError("forbidden", "clerk webhook signature verification failed");
  }
}
