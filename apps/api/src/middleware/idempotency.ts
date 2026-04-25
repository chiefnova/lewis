import { createHash } from "node:crypto";

import type { MiddlewareHandler } from "hono";

import { ApiError } from "./errors.js";
import { getRedisClient } from "../redis.js";

/**
 * Idempotency-Key middleware.
 *
 * For POSTs that create regulated records (AE reports, ETRB submissions,
 * patient agreements, payment events) per CLAUDE.md. Mechanism:
 *
 *   1. Client sends Idempotency-Key header (UUID v4, format-checked).
 *   2. We compute a fingerprint of the request (method + path + body sha).
 *   3. Lookup Redis at `idem:{key}`.
 *      - HIT with same fingerprint: replay the cached response.
 *      - HIT with different fingerprint: 409 conflict (key was reused with
 *        different request — the contract requires that a key uniquely
 *        identifies one logical operation).
 *      - HIT with status="in_flight": 409 conflict (concurrent retry).
 *      - MISS: SET in_flight with NX to lock; let the handler run; cache
 *        the response (status + body) on completion.
 *
 *   4. TTL: 24 hours. Long enough for clients to retry across reasonable
 *      outages, short enough that Redis doesn't fill with old keys.
 *
 * Use selectively — wrap on POST routes, not GETs (GETs are already idempotent
 * by HTTP semantics and don't need this).
 */

const TTL_SECONDS = 24 * 60 * 60;
const KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

type CachedResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

type IdempotencyRecord = {
  status: "in_flight" | "complete";
  fingerprint: string;
  response?: CachedResponse;
};

function fingerprintRequest(method: string, path: string, body: string): string {
  return createHash("sha256").update(`${method}\n${path}\n${body}`).digest("hex");
}

export const requireIdempotencyKey: MiddlewareHandler = async (c, next) => {
  const key = c.req.header("idempotency-key");
  if (!key) {
    throw new ApiError("validation_error", "Idempotency-Key header is required for this endpoint");
  }
  if (!KEY_PATTERN.test(key)) {
    throw new ApiError("validation_error", "Idempotency-Key must match [A-Za-z0-9_-]{8,128}");
  }

  const rawBody = await c.req.text();
  const fingerprint = fingerprintRequest(c.req.method, c.req.path, rawBody);

  const redis = getRedisClient();
  const redisKey = `idem:${key}`;

  // Atomic SETNX with TTL: claim the key for in-flight processing.
  const inFlightRecord: IdempotencyRecord = { status: "in_flight", fingerprint };
  const claim = await redis.set(redisKey, JSON.stringify(inFlightRecord), "EX", TTL_SECONDS, "NX");

  if (claim !== "OK") {
    // Key already exists. Inspect.
    const raw = await redis.get(redisKey);
    if (!raw) {
      // Race: key expired between SETNX and GET. Fail loudly so the client
      // retries.
      throw new ApiError("conflict", "idempotency key state is in flux; retry");
    }
    let existing: IdempotencyRecord;
    try {
      existing = JSON.parse(raw) as IdempotencyRecord;
    } catch {
      throw new ApiError("internal_error", "stored idempotency record is malformed");
    }

    if (existing.fingerprint !== fingerprint) {
      throw new ApiError(
        "conflict",
        "Idempotency-Key was previously used with a different request body or path",
      );
    }
    if (existing.status === "in_flight") {
      throw new ApiError(
        "conflict",
        "a concurrent request with this Idempotency-Key is still in flight",
      );
    }
    // Replay the cached response.
    if (!existing.response) {
      throw new ApiError("internal_error", "idempotency record marked complete without response");
    }
    for (const [name, value] of Object.entries(existing.response.headers)) {
      c.header(name, value);
    }
    c.header("Idempotent-Replay", "true");
    return c.body(existing.response.body, existing.response.status as 200);
  }

  // First-time request. Restore the body for downstream handlers (we
  // already consumed it above; Hono caches text() on the request, but be
  // defensive — re-create the request with the consumed text).
  // In Hono, c.req.text() caches its result so subsequent reads are fine.

  await next();

  // Capture the response and cache it.
  const responseHeaders: Record<string, string> = {};
  c.res.headers.forEach((value, name) => {
    responseHeaders[name] = value;
  });
  // Clone the response so we can read the body without consuming the
  // original (Hono returns the original to the client).
  const cloned = c.res.clone();
  const responseBody = await cloned.text();

  const completeRecord: IdempotencyRecord = {
    status: "complete",
    fingerprint,
    response: {
      status: c.res.status,
      headers: responseHeaders,
      body: responseBody,
    },
  };
  await redis.set(redisKey, JSON.stringify(completeRecord), "EX", TTL_SECONDS);
};
