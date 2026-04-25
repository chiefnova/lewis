import type { MiddlewareHandler } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";

import { ApiError } from "./errors.js";

/**
 * Defense-in-depth security middleware. CLAUDE.md mandates TLS 1.3 and HIPAA
 * posture; even when the deploy platform terminates TLS and could in theory
 * inject the right headers, we set them at the app layer too — Belt and
 * suspenders, and easier to reason about with explicit code.
 *
 *   - secureHeaders: HSTS (2y, includeSubDomains, preload), no-referrer,
 *     X-Content-Type-Options nosniff, X-Frame-Options DENY, a strict CSP for
 *     API responses (no resources should ever be loaded from a JSON API).
 *
 *   - CORS: explicit allowlist sourced from CORS_ALLOWED_ORIGINS env (csv).
 *     Validated at boot — failure to set the env in non-test environments
 *     is a startup error, not a silent allow-everything default.
 *
 *   - bodyLimit: 1 MB default. Webhook routes can override if their provider
 *     can deliver larger payloads, but 1 MB is well above what any real
 *     production handler should accept by default.
 */

const DEFAULT_BODY_LIMIT = 1 * 1024 * 1024; // 1 MB

export const secureHeadersMiddleware = secureHeaders({
  strictTransportSecurity: "max-age=63072000; includeSubDomains; preload",
  referrerPolicy: "no-referrer",
  xContentTypeOptions: "nosniff",
  xFrameOptions: "DENY",
  // Strict CSP: API responses are JSON; clients should never execute or load
  // anything from these responses. Block all resource categories.
  contentSecurityPolicy: {
    defaultSrc: ["'none'"],
    frameAncestors: ["'none'"],
    baseUri: ["'none'"],
    formAction: ["'none'"],
  },
  // Disable Hono defaults we don't want.
  crossOriginEmbedderPolicy: false,
  xPermittedCrossDomainPolicies: "none",
});

export function buildCorsMiddleware(): MiddlewareHandler {
  const raw = process.env.CORS_ALLOWED_ORIGINS;
  // For test runs we allow anything to keep test setup ergonomic; for any
  // other environment, missing config is a hard error.
  if (!raw && process.env.NODE_ENV !== "test") {
    throw new Error(
      "CORS_ALLOWED_ORIGINS env var is required (csv of allowed origins). " +
        "Example: 'https://app.corridor.health,https://patient.corridor.health,http://localhost:5173'",
    );
  }
  const allowed = (raw ?? "*")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowAny = allowed.includes("*");

  return cors({
    origin: (origin) => {
      if (!origin) return null; // same-origin / non-browser callers — Hono allows them
      if (allowAny) return origin;
      return allowed.includes(origin) ? origin : null;
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Authorization",
      "Content-Type",
      "Idempotency-Key",
      "x-request-id",
      "x-corridor-tenant-id",
      "x-support-ticket-id",
    ],
    exposeHeaders: ["x-request-id"],
    credentials: true,
    maxAge: 600,
  });
}

export const bodyLimitMiddleware = bodyLimit({
  maxSize: DEFAULT_BODY_LIMIT,
  onError: () => {
    throw new ApiError(
      "unprocessable",
      `request body exceeds ${DEFAULT_BODY_LIMIT.toString()} bytes`,
    );
  },
});
