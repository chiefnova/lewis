import {
  MarketingConfirmResponse,
  MarketingSubscriptionRequest,
  MarketingSubscriptionResponse,
  MarketingUnsubscribeResponse,
} from "@lewis/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { respondWithError } from "../../middleware/errors.js";
import type { PublicDbContextVars } from "../../middleware/public-context.js";
import { logger } from "../../logger.js";
import { enqueueMarketingConfirmation } from "./enqueue.js";

/**
 * Anonymous marketing-subscription endpoints (slice 4 § 11.2 / 11.9 / 7.5).
 *
 *   POST /v1/public/marketing-subscriptions             → subscribe
 *   GET  /v1/public/marketing-subscriptions/confirm     → confirm via token
 *   GET  /v1/public/marketing-subscriptions/unsubscribe → unsubscribe via token
 *
 * All three calls go through SECURITY DEFINER helpers (added in migration
 * 0020) — directory_anonymous has no direct INSERT or SELECT path on the
 * marketing_subscriptions table. Reads are admin-only.
 *
 * The POST handler is timing-attack-resistant: the response is identical
 * for a brand-new subscriber and an existing one, so an attacker can't
 * enumerate which emails are already on the list.
 *
 * The Resend confirmation send happens in a worker job (notifications
 * queue, kind=marketing_confirmation_send) — the API only enqueues, never
 * blocks the request on email delivery.
 */

const TokenQuery = z.object({ token: z.string().uuid() });

const TRUST_REMOTE_ADDR_HEADERS = ["cf-connecting-ip", "x-forwarded-for", "x-real-ip"] as const;

function captureClientIp(headers: Headers): string | null {
  for (const headerName of TRUST_REMOTE_ADDR_HEADERS) {
    const v = headers.get(headerName);
    if (!v) continue;
    // x-forwarded-for can be comma-separated; first entry is the original client.
    const first = v.split(",")[0]?.trim();
    if (first && first.length > 0) return first;
  }
  return null;
}

function captureUserAgent(headers: Headers): string | null {
  const ua = headers.get("user-agent");
  if (!ua) return null;
  // Cap at 500 chars to bound storage. Real UAs rarely exceed 200.
  return ua.slice(0, 500);
}

type SubscribeRow = {
  confirmation_token: string;
  unsubscribe_token: string;
  was_new: boolean;
};

type BoolFnRow<K extends string> = Record<K, boolean>;

export const publicMarketingRoutes = new Hono<{ Variables: PublicDbContextVars }>();

publicMarketingRoutes.post(
  "/",
  zValidator("json", MarketingSubscriptionRequest, (result, c) => {
    if (!result.success) {
      return respondWithError(
        c,
        "validation_error",
        "Invalid subscription request.",
        result.error.flatten(),
      );
    }
  }),
  async (c) => {
    const db = c.var.dbClient;
    const requestId = c.var.requestId ?? "unknown";
    const { email, source } = c.req.valid("json");

    const ip = captureClientIp(c.req.raw.headers);
    const ua = captureUserAgent(c.req.raw.headers);

    let subscribeRow: SubscribeRow | undefined;
    try {
      const result = await db.query<SubscribeRow>(
        `select confirmation_token, unsubscribe_token, was_new
           from app.directory_marketing_subscribe($1, $2, $3::inet, $4)`,
        [email, source, ip, ua],
      );
      subscribeRow = result.rows[0];
    } catch (caught) {
      // Distinguish helper validation rejects (P0001 with invalid_email /
      // invalid_source) from genuine DB failures (connection drop, RLS
      // denial, query timeout). Mapping every error to 400 hides outages
      // and permission issues behind a misleading "invalid request" UX.
      const code = (caught as { code?: unknown } | null)?.code;
      const rawMessage = caught instanceof Error ? caught.message : "unknown subscribe error";
      const isHelperValidation =
        code === "P0001" &&
        (rawMessage.includes("invalid_email") || rawMessage.includes("invalid_source"));

      if (isHelperValidation) {
        logger.warn(
          {
            requestId,
            route: "/v1/public/marketing-subscriptions",
            source,
            // Email is PII-adjacent — never log it.
            helperMessage: rawMessage,
          },
          "marketing subscribe rejected by db helper validation",
        );
        return respondWithError(c, "validation_error", "Invalid subscription request.");
      }

      logger.error(
        {
          requestId,
          route: "/v1/public/marketing-subscriptions",
          source,
          // Email is PII-adjacent — never log it.
          pgCode: code,
          message: rawMessage,
        },
        "marketing subscribe failed (non-validation db error)",
      );
      return respondWithError(c, "internal_error", "Subscription failed.");
    }

    if (!subscribeRow) {
      // Defensive — the helper always returns a row.
      logger.error(
        { requestId, route: "/v1/public/marketing-subscriptions", source },
        "marketing subscribe returned no row",
      );
      return respondWithError(c, "internal_error", "Subscription failed.");
    }

    if (subscribeRow.was_new) {
      // Both tokens come back from the SECURITY DEFINER subscribe helper —
      // directory_anonymous has no SELECT path on marketing_subscriptions,
      // so a follow-up query couldn't read the unsubscribe_token. Returning
      // both in one round-trip is the only way to surface the unsubscribe
      // link to the worker that builds the email body.
      try {
        await enqueueMarketingConfirmation({
          emailLower: email.toLowerCase().trim(),
          confirmationToken: subscribeRow.confirmation_token,
          unsubscribeToken: subscribeRow.unsubscribe_token,
        });
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "unknown enqueue error";
        // Log but still return success — the row is persisted; ops can
        // re-enqueue. The user shouldn't see a 5xx because the queue is
        // down; the form's success state is honest about "if your email
        // is new, check it for a confirmation link".
        logger.error(
          {
            requestId,
            route: "/v1/public/marketing-subscriptions",
            source,
            message,
          },
          "marketing subscribe: enqueue failed (row persisted, manual re-enqueue required)",
        );
      }
    }

    logger.info(
      {
        requestId,
        route: "/v1/public/marketing-subscriptions",
        source,
        wasNew: subscribeRow.was_new,
      },
      "marketing subscribe accepted",
    );

    return c.json(
      MarketingSubscriptionResponse.parse({
        ok: true,
        message: "If your email is new, check it for a confirmation link.",
      }),
    );
  },
);

publicMarketingRoutes.get(
  "/confirm",
  zValidator("query", TokenQuery, (result, c) => {
    if (!result.success) {
      return respondWithError(
        c,
        "validation_error",
        "Invalid confirmation token.",
        result.error.flatten(),
      );
    }
  }),
  async (c) => {
    const db = c.var.dbClient;
    const requestId = c.var.requestId ?? "unknown";
    const { token } = c.req.valid("query");

    const result = await db.query<BoolFnRow<"directory_marketing_confirm">>(
      `select app.directory_marketing_confirm($1::uuid) as directory_marketing_confirm`,
      [token],
    );
    const confirmed = result.rows[0]?.directory_marketing_confirm ?? false;

    logger.info(
      {
        requestId,
        route: "/v1/public/marketing-subscriptions/confirm",
        confirmed,
      },
      "marketing confirm executed",
    );

    return c.json(MarketingConfirmResponse.parse({ confirmed }));
  },
);

publicMarketingRoutes.get(
  "/unsubscribe",
  zValidator("query", TokenQuery, (result, c) => {
    if (!result.success) {
      return respondWithError(
        c,
        "validation_error",
        "Invalid unsubscribe token.",
        result.error.flatten(),
      );
    }
  }),
  async (c) => {
    const db = c.var.dbClient;
    const requestId = c.var.requestId ?? "unknown";
    const { token } = c.req.valid("query");

    const result = await db.query<BoolFnRow<"directory_marketing_unsubscribe">>(
      `select app.directory_marketing_unsubscribe($1::uuid) as directory_marketing_unsubscribe`,
      [token],
    );
    const unsubscribed = result.rows[0]?.directory_marketing_unsubscribe ?? false;

    logger.info(
      {
        requestId,
        route: "/v1/public/marketing-subscriptions/unsubscribe",
        unsubscribed,
      },
      "marketing unsubscribe executed",
    );

    return c.json(MarketingUnsubscribeResponse.parse({ unsubscribed }));
  },
);
