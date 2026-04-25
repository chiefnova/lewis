import type { MiddlewareHandler } from "hono";

import { ApiError } from "./errors.js";
import { getRedisClient } from "../redis.js";

/**
 * Token-bucket rate limiter backed by Redis.
 *
 * Implementation: fixed window via INCR + EXPIRE in a single Redis pipeline.
 * O(1) per request. Cheap and good enough for protecting handlers against
 * abuse; for finer-grained control (sliding window, leaky bucket) we'd
 * adopt @upstash/ratelimit later, but this avoids another runtime dep.
 *
 * The `keyFn` allows callers to choose the identity surface — IP for
 * anonymous traffic, tenant id for authenticated traffic, or a tuple of
 * (provider, signature subject) for webhooks.
 *
 * On limit exceeded: throws ApiError("rate_limited"), which the canonical
 * error envelope serializes to 429 with the right code.
 */

export type RateLimitOptions = {
  /** Window length in seconds. Default 60. */
  windowSeconds?: number;
  /** Max events per window per key. Required. */
  max: number;
  /**
   * Build the rate-limit key for the request. Default: client IP from
   * x-forwarded-for, falling back to a constant (so unauthenticated traffic
   * with no IP all shares one bucket — pessimistic by design).
   */
  keyFn?: (c: Parameters<MiddlewareHandler>[0]) => string;
  /** Tag attached to the key namespace so different limiters don't collide. */
  bucket: string;
};

function defaultKeyFn(c: Parameters<MiddlewareHandler>[0]): string {
  const xff = c.req.header("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  // Fall back to a coarse "anonymous" bucket. In real prod, your platform
  // (Railway/Fly/Vercel) populates x-forwarded-for; if not, this still
  // bounds total throughput safely.
  return "anonymous";
}

export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  const windowSeconds = options.windowSeconds ?? 60;
  const keyFn = options.keyFn ?? defaultKeyFn;
  const bucket = options.bucket;
  const limit = options.max;

  return async (c, next) => {
    const id = keyFn(c);
    const redis = getRedisClient();
    const key = `rl:${bucket}:${id}`;

    // INCR returns the new count after increment. If it's 1, this is the
    // first hit in the current window — set EXPIRE so the bucket resets.
    // The two-call sequence is racy (the EXPIRE could be set on the wrong
    // window if many requests pile up), but Redis INCR + EXPIRE in this
    // pattern is the standard cheap fixed-window limiter; the worst case
    // is one window where the limit effectively doubles, which is
    // acceptable for abuse-prevention.
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    if (count > limit) {
      const ttl = await redis.ttl(key);
      c.header("Retry-After", String(Math.max(ttl, 1)));
      throw new ApiError(
        "rate_limited",
        `rate limit exceeded: ${limit.toString()} per ${windowSeconds.toString()}s`,
      );
    }

    // Useful headers for clients with adaptive backoff.
    c.header("X-RateLimit-Limit", String(limit));
    c.header("X-RateLimit-Remaining", String(Math.max(0, limit - count)));

    await next();
  };
}
