import { randomUUID } from "node:crypto";

import { checkDatabaseReady } from "@lewis/db";
import { buildErrorResponse, HTTP_STATUS_BY_CODE, redactPhi, type ErrorCode } from "@lewis/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger as honoLogger } from "hono/logger";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { apiReference } from "@scalar/hono-api-reference";

import { sanitizeAccessLogMessage } from "./access-log-message.js";
import { boardRoutes } from "./domains/boards/routes.js";
import { etcRoutes } from "./domains/etcs/routes.js";
import { internalAdminRoutes } from "./domains/internal-admin/routes.js";
import { patientRoutes } from "./domains/patients/routes.js";
import { publicConditionsRoutes } from "./domains/public-conditions/routes.js";
import { publicSearchRoutes } from "./domains/public-search/routes.js";
import { searchRoutes } from "./domains/search/routes.js";
import { sponsorRoutes } from "./domains/sponsors/routes.js";
import { webhookRoutes } from "./domains/webhooks/routes.js";
import { logger as appLogger } from "./logger.js";
import { ApiError } from "./middleware/errors.js";
import { requireClerkAuth } from "./middleware/auth.js";
import { resolveTenant } from "./middleware/tenant.js";
import { withDbContext } from "./middleware/db-context.js";
import { withPublicDbContext } from "./middleware/public-context.js";
import { rateLimit } from "./middleware/rate-limit.js";
import {
  bodyLimitMiddleware,
  buildCorsMiddleware,
  secureHeadersMiddleware,
} from "./middleware/security-headers.js";
import { buildOpenApiDocument } from "./openapi.js";
import { checkRedisReady } from "./redis.js";

type ApiVariables = {
  requestId: string;
};

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

export const app = new Hono<{ Variables: ApiVariables }>();

// ---------------------------------------------------------------------------
// Foundation middleware (runs for every route, including /healthz and /readyz)
// ---------------------------------------------------------------------------
//
// Order matters:
//   1. request-id capture — every later middleware can rely on c.var.requestId
//   2. secure-headers + CORS — set on every response, including errors
//   3. body limit — block oversize requests before any handler reads them
//   4. access logging — runs after the request passes the cheap perimeter checks
// ---------------------------------------------------------------------------

app.use("*", async (c, next) => {
  const inbound = c.req.header("x-request-id");
  const requestId = inbound && REQUEST_ID_PATTERN.test(inbound) ? inbound : randomUUID();
  c.header("x-request-id", requestId);
  c.set("requestId", requestId);
  await next();
});

app.use("*", secureHeadersMiddleware);
app.use("*", buildCorsMiddleware());
app.use("*", bodyLimitMiddleware);

// hono/logger provides per-request access logging. Route the formatted
// message through pino at info level so it lands in the structured stream.
app.use(
  "*",
  honoLogger((message) =>
    appLogger.info({ source: "hono.logger" }, sanitizeAccessLogMessage(message)),
  ),
);

// ---------------------------------------------------------------------------
// Coarse public-surface rate limit. Hits everything; webhooks and
// authenticated routes get tighter buckets layered below.
// ---------------------------------------------------------------------------
app.use(
  "*",
  rateLimit({
    bucket: "public",
    max: 600, // 10 req/sec sustained per IP
    windowSeconds: 60,
  }),
);

app.onError((error, c) => {
  const requestId = c.get("requestId") ?? "unknown";

  if (error instanceof ApiError) {
    return c.json(
      buildErrorResponse(error.code, error.publicMessage, requestId, error.publicDetails),
      HTTP_STATUS_BY_CODE[error.code] as ContentfulStatusCode,
    );
  }

  if (error instanceof HTTPException) {
    // Hono's built-in HTTPException carries a status. Map the most common ones
    // back to our error vocabulary; default to internal_error.
    const status = error.status;
    let code: ErrorCode = "internal_error";
    if (status === 400) code = "validation_error";
    else if (status === 401) code = "unauthenticated";
    else if (status === 403) code = "forbidden";
    else if (status === 404) code = "not_found";
    else if (status === 409) code = "conflict";
    else if (status === 422) code = "unprocessable";
    else if (status === 429) code = "rate_limited";
    else if (status === 501) code = "not_implemented";
    else if (status === 503) code = "service_unavail";

    return c.json(
      buildErrorResponse(code, error.message, requestId),
      status as ContentfulStatusCode,
    );
  }

  // Unknown error. Log structured server-side, return opaque 500 to client.
  appLogger.error(
    {
      requestId,
      route: c.req.path,
      method: c.req.method,
      message: redactPhi(error instanceof Error ? error.message : "unknown error"),
      stack: error instanceof Error ? error.stack : undefined,
    },
    "unhandled error",
  );

  return c.json(buildErrorResponse("internal_error", "internal server error", requestId), 500);
});

// ---------------------------------------------------------------------------
// Liveness/readiness
//
// Convention: unversioned /healthz (cheap liveness, no I/O) and /readyz
// (deeper readiness, hits DB+Redis). Versioned /v1/health was removed —
// uptime checks and Railway probes hit the unversioned paths.
// ---------------------------------------------------------------------------
app.get("/healthz", (c) => c.json({ ok: true, service: "lewis-api" }));

// /readyz fans out to dependencies and is the most common abuse target on
// the public surface; tighten the bucket.
app.get("/readyz", rateLimit({ bucket: "readyz", max: 60, windowSeconds: 60 }), async (c) => {
  const [database, redis] = await Promise.all([checkDatabaseReady(), checkRedisReady()]);
  const ok = database.ok && redis.ok;

  return c.json(
    {
      ok,
      checks: {
        database,
        redis,
      },
    },
    ok ? 200 : 503,
  );
});

// ---------------------------------------------------------------------------
// /v1 — public sub-router (no auth required: webhooks, OpenAPI surface)
// ---------------------------------------------------------------------------
const v1Public = new Hono<{ Variables: ApiVariables }>();

// OpenAPI document. Built lazily on first request (the document is JSON-
// serializable; we avoid re-running zod-to-openapi per request by caching).
let cachedOpenApiDoc: ReturnType<typeof buildOpenApiDocument> | undefined;
v1Public.get("/openapi.json", (c) => {
  cachedOpenApiDoc ??= buildOpenApiDocument(
    process.env.PUBLIC_API_BASE_URL ?? "https://api.lewis.health",
  );
  return c.json(cachedOpenApiDoc);
});

v1Public.get(
  "/docs",
  apiReference({
    spec: { url: "/v1/openapi.json" },
    pageTitle: "Lewis API Reference",
  }),
);

// Webhooks: stricter per-IP bucket. Stripe/Plaid/Clerk usually deliver
// from a small set of source IPs, so this catches replay floods without
// limiting legitimate traffic.
v1Public.use("/webhooks/*", rateLimit({ bucket: "webhooks", max: 120, windowSeconds: 60 }));
v1Public.route("/webhooks", webhookRoutes);

// Public directory search — anonymous, condition-first, FTS over
// search_index_documents. See docs/directoryprd.md § 13 and
// plans/immutable-squishing-sprout.md.
//
// Per-IP rate limit (30/min/IP per § 28.5) layered on top of the coarse
// 600/min public bucket above. withPublicDbContext sets
// app.role = 'directory_anonymous' inside a transaction; the public-read
// RLS policies on search_index_documents/programs/conditions/etcs all
// gate on that role string. NOT a service-role bypass — runtime role
// stays app_api (NOBYPASSRLS, see migration 0011).
v1Public.use("/public/search", rateLimit({ bucket: "public_search", max: 30, windowSeconds: 60 }));
v1Public.use("/public/search", withPublicDbContext);
v1Public.route("/public/search", publicSearchRoutes);

// /v1/public/conditions — primary patient browse surface (per directoryprd.md
// § 14). Same anonymous-RLS posture as /public/search, separate rate-limit
// bucket so a search-spam burst doesn't lock out catalog browsing. 60/min/IP
// (twice search) — list + detail navigation produces more requests per
// session than search.
v1Public.use(
  "/public/conditions/*",
  rateLimit({ bucket: "public_conditions", max: 60, windowSeconds: 60 }),
);
v1Public.use("/public/conditions/*", withPublicDbContext);
v1Public.route("/public/conditions", publicConditionsRoutes);

// ---------------------------------------------------------------------------
// /v1 — authed sub-router (every route below this gate requires Clerk auth +
// active tenant membership + a per-request DB transaction with app.* RLS
// session vars set)
// ---------------------------------------------------------------------------
const v1Authed = new Hono<{ Variables: ApiVariables }>();

v1Authed.use("*", requireClerkAuth);
v1Authed.use("*", resolveTenant);
v1Authed.use("*", withDbContext);

// Per-tenant rate limit for authed traffic. Keyed off the resolved tenant
// id rather than IP so a busy tenant doesn't get throttled by a noisy
// neighbor on the same IP.
v1Authed.use(
  "*",
  rateLimit({
    bucket: "authed",
    max: 6000, // 100 req/sec sustained per tenant
    windowSeconds: 60,
    keyFn: (c) => {
      const ctx = c.get("appContext" as never) as { activeTenantId: string } | undefined;
      return ctx?.activeTenantId ?? "anon";
    },
  }),
);

v1Authed.route("/search", searchRoutes);
v1Authed.route("/sponsors", sponsorRoutes);
v1Authed.route("/etcs", etcRoutes);
v1Authed.route("/patients", patientRoutes);
v1Authed.route("/boards", boardRoutes);
v1Authed.route("/admin", internalAdminRoutes);

// Mount both sub-routers under /v1. v1Public's routes are registered before
// v1Authed's middleware, so webhook callers don't trigger Clerk verification.
const v1 = new Hono<{ Variables: ApiVariables }>();
v1.route("/", v1Public);
v1.route("/", v1Authed);

app.route("/v1", v1);
