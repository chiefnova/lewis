import { ConnectRequestPayload, ConnectRequestResponse } from "@lewis/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { respondWithError } from "../../middleware/errors.js";
import type { PublicDbContextVars } from "../../middleware/public-context.js";
import { logger } from "../../logger.js";
import { enqueueConnectRequestSend } from "./enqueue.js";

/**
 * Anonymous connect-request endpoint (slice 5 § 18.1 / 18.2).
 *
 *   POST /v1/public/connect-requests → submit + enqueue ETC email
 *
 * Mirrors slice 4's public-marketing pattern: SECURITY DEFINER write
 * helper (app.directory_connect_request_create), worker-side email send
 * via BullMQ, no SELECT path for directory_anonymous on connect_requests.
 *
 * § 18.2 critical line: account creation is post-conversion, not
 * pre-conversion. The response always returns needsAccount=false /
 * signupUrl=null — the /connect/confirmed page offers Clerk signup as an
 * optional follow-up, never as a gate to submission.
 *
 * Rate limit: 5 req/min/IP on a dedicated public_connect bucket. Tighter
 * than marketing (10) because each successful submission triggers an
 * email to a real ETC inbox — the abuse blast radius is higher than a
 * stray confirmation-email blip.
 */

const TRUST_REMOTE_ADDR_HEADERS = ["cf-connecting-ip", "x-forwarded-for", "x-real-ip"] as const;

function captureClientIp(headers: Headers): string | null {
  for (const headerName of TRUST_REMOTE_ADDR_HEADERS) {
    const v = headers.get(headerName);
    if (!v) continue;
    const first = v.split(",")[0]?.trim();
    if (first && first.length > 0) return first;
  }
  return null;
}

function captureUserAgent(headers: Headers): string | null {
  const ua = headers.get("user-agent");
  if (!ua) return null;
  return ua.slice(0, 500);
}

type CreateRow = {
  directory_connect_request_create: string;
};

export const publicConnectRoutes = new Hono<{ Variables: PublicDbContextVars }>();

publicConnectRoutes.post(
  "/",
  zValidator("json", ConnectRequestPayload, (result, c) => {
    if (!result.success) {
      return respondWithError(
        c,
        "validation_error",
        "Invalid connect request.",
        result.error.flatten(),
      );
    }
  }),
  async (c) => {
    const db = c.var.dbClient;
    const requestId = c.var.requestId ?? "unknown";
    const payload = c.req.valid("json");

    const ip = captureClientIp(c.req.raw.headers);
    const ua = captureUserAgent(c.req.raw.headers);

    let connectRequestId: string | undefined;
    try {
      const result = await db.query<CreateRow>(
        `select app.directory_connect_request_create(
           $1, $2::uuid, $3, $4, $5, $6, $7, $8::inet, $9
         ) as directory_connect_request_create`,
        [
          payload.programSlug,
          payload.eligibilitySessionToken,
          payload.name,
          payload.email,
          payload.phone,
          payload.bestTimeToContact,
          payload.situation,
          ip,
          ua,
        ],
      );
      connectRequestId = result.rows[0]?.directory_connect_request_create;
    } catch (caught) {
      // P0001 with one of the helper-specific messages → 400. Everything
      // else (connection drop, RLS denial, query timeout) → 500. Same
      // posture as the marketing flow's classifier — never misclassify
      // an outage as a 400 "Invalid request".
      const code = (caught as { code?: unknown } | null)?.code;
      const rawMessage = caught instanceof Error ? caught.message : "unknown create error";
      const helperValidationCodes = [
        "invalid_email",
        "invalid_name",
        "unknown_program",
        "no_offering_etc",
      ];
      const isHelperValidation =
        code === "P0001" && helperValidationCodes.some((m) => rawMessage.includes(m));

      if (isHelperValidation) {
        logger.warn(
          {
            requestId,
            route: "/v1/public/connect-requests",
            programSlug: payload.programSlug,
            // Patient name + email are PII; never log them.
            helperMessage: rawMessage,
          },
          "connect-request rejected by db helper validation",
        );
        return respondWithError(c, "validation_error", "Invalid connect request.");
      }

      logger.error(
        {
          requestId,
          route: "/v1/public/connect-requests",
          programSlug: payload.programSlug,
          pgCode: code,
          message: rawMessage,
        },
        "connect-request failed (non-validation db error)",
      );
      return respondWithError(c, "internal_error", "Connect request failed.");
    }

    if (!connectRequestId) {
      logger.error(
        { requestId, route: "/v1/public/connect-requests", programSlug: payload.programSlug },
        "connect-request returned no id",
      );
      return respondWithError(c, "internal_error", "Connect request failed.");
    }

    // Enqueue the ETC email. Failure here doesn't fail the request — the
    // row is persisted; ops can re-enqueue from the admin console. The
    // user gets the same "you're connected" UX either way.
    try {
      await enqueueConnectRequestSend({ connectRequestId });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "unknown enqueue error";
      logger.error(
        {
          requestId,
          route: "/v1/public/connect-requests",
          programSlug: payload.programSlug,
          connectRequestId,
          message,
        },
        "connect-request enqueue failed (row persisted, manual re-enqueue required)",
      );
    }

    logger.info(
      {
        requestId,
        route: "/v1/public/connect-requests",
        programSlug: payload.programSlug,
        connectRequestId,
        eligibilityAttached: payload.eligibilitySessionToken !== null,
      },
      "connect-request accepted",
    );

    return c.json(
      ConnectRequestResponse.parse({
        connectRequestId,
        // § 18.2 — account creation is post-conversion, not pre-conversion.
        // Both fields are reserved for forward compatibility with the
        // patient-portal account-linking flow, but the directory itself
        // never triggers it from this endpoint.
        signupUrl: null,
        needsAccount: false,
      }),
    );
  },
);
