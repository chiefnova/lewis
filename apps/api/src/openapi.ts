import {
  CursorPageQuery,
  ErrorResponse,
  SponsorAdverseEventsResponse,
  SponsorEtcsResponse,
  SponsorPathParams,
  SponsorProgramsResponse,
  EtcComplianceResponse,
  EtcDashboardResponse,
  EtcDrugInventoryLotsResponse,
  EtcMessagesResponse,
  EtcPathParams,
  PatientDocumentsResponse,
  PatientMeResponse,
  PatientMessagesResponse,
  BoardAnnualReportResponse,
  BoardPathParams,
  BoardProtocolReviewsResponse,
  AdminAuditLogResponse,
  AdminComplianceResponse,
  AdminTenantsResponse,
  SearchQueryParams,
  SearchResponse,
  PublicSearchQueryParams,
  PublicSearchResponse,
  ConditionSlug,
  EtcSlug,
  MarketingConfirmResponse,
  MarketingSubscriptionRequest,
  MarketingSubscriptionResponse,
  MarketingUnsubscribeResponse,
  MedicalDirectorContact,
  ProgramSlug,
  PublicConditionDetail,
  PublicConditionListResponse,
  PublicConditionSummary,
  PublicEtcDetail,
  PublicEtcListResponse,
  PublicEtcOfferedProgram,
  PublicEtcSummary,
  PublicProgramDetail,
  PublicProgramEtrb,
  PublicProgramFacets,
  PublicProgramListResponse,
  PublicProgramPublishedPaper,
  PublicProgramSummary,
} from "@lewis/shared";
import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

/**
 * Build the Lewis OpenAPI 3.1 document from registered zod schemas + a
 * hand-authored paths block. The paths block is intentionally hand-written
 * so we don't have to refactor every Hono route to OpenAPIHono today.
 * `mise run contracts:openapi:check` guards this scaffold against route/path
 * drift until routes move to OpenAPIHono's createRoute pattern.
 *
 * Served at /v1/openapi.json with a Scalar UI at /v1/docs.
 */
export function buildOpenApiDocument(baseUrl: string) {
  const registry = new OpenAPIRegistry();

  // -- Components -----------------------------------------------------------

  registry.register("ErrorResponse", ErrorResponse);
  registry.register("CursorPageQuery", CursorPageQuery);

  registry.register("SponsorPathParams", SponsorPathParams);
  registry.register("SponsorProgramsResponse", SponsorProgramsResponse);
  registry.register("SponsorEtcsResponse", SponsorEtcsResponse);
  registry.register("SponsorAdverseEventsResponse", SponsorAdverseEventsResponse);

  registry.register("EtcPathParams", EtcPathParams);
  registry.register("EtcDashboardResponse", EtcDashboardResponse);
  registry.register("EtcComplianceResponse", EtcComplianceResponse);
  registry.register("EtcMessagesResponse", EtcMessagesResponse);
  registry.register("EtcDrugInventoryLotsResponse", EtcDrugInventoryLotsResponse);

  registry.register("PatientMeResponse", PatientMeResponse);
  registry.register("PatientMessagesResponse", PatientMessagesResponse);
  registry.register("PatientDocumentsResponse", PatientDocumentsResponse);

  registry.register("BoardPathParams", BoardPathParams);
  registry.register("BoardProtocolReviewsResponse", BoardProtocolReviewsResponse);
  registry.register("BoardAnnualReportResponse", BoardAnnualReportResponse);

  registry.register("AdminTenantsResponse", AdminTenantsResponse);
  registry.register("AdminComplianceResponse", AdminComplianceResponse);
  registry.register("AdminAuditLogResponse", AdminAuditLogResponse);

  registry.register("SearchQueryParams", SearchQueryParams);
  registry.register("SearchResponse", SearchResponse);
  registry.register("PublicSearchQueryParams", PublicSearchQueryParams);
  registry.register("PublicSearchResponse", PublicSearchResponse);
  registry.register("ConditionSlug", ConditionSlug);
  registry.register("PublicConditionSummary", PublicConditionSummary);
  registry.register("PublicConditionDetail", PublicConditionDetail);
  registry.register("PublicConditionListResponse", PublicConditionListResponse);
  registry.register("ProgramSlug", ProgramSlug);
  registry.register("PublicProgramSummary", PublicProgramSummary);
  registry.register("PublicProgramPublishedPaper", PublicProgramPublishedPaper);
  registry.register("PublicProgramEtrb", PublicProgramEtrb);
  registry.register("PublicProgramDetail", PublicProgramDetail);
  registry.register("PublicProgramListResponse", PublicProgramListResponse);
  registry.register("PublicProgramFacets", PublicProgramFacets);
  registry.register("EtcSlug", EtcSlug);
  registry.register("MedicalDirectorContact", MedicalDirectorContact);
  registry.register("PublicEtcSummary", PublicEtcSummary);
  registry.register("PublicEtcDetail", PublicEtcDetail);
  registry.register("PublicEtcOfferedProgram", PublicEtcOfferedProgram);
  registry.register("PublicEtcListResponse", PublicEtcListResponse);
  registry.register("MarketingSubscriptionRequest", MarketingSubscriptionRequest);
  registry.register("MarketingSubscriptionResponse", MarketingSubscriptionResponse);
  registry.register("MarketingConfirmResponse", MarketingConfirmResponse);
  registry.register("MarketingUnsubscribeResponse", MarketingUnsubscribeResponse);

  // -- Security schemes -----------------------------------------------------

  registry.registerComponent("securitySchemes", "ClerkBearer", {
    type: "http",
    scheme: "bearer",
    description:
      "Clerk session token. Either Authorization: Bearer <token> or the __session cookie.",
  });

  // -- Paths (hand-authored; new routes should use OpenAPIHono.createRoute) -

  const ok = (componentName: string) => ({
    description: "OK",
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${componentName}` },
      },
    },
  });
  const errors = {
    400: { $ref: "#/components/responses/ValidationError" },
    401: { $ref: "#/components/responses/Unauthenticated" },
    403: { $ref: "#/components/responses/Forbidden" },
    429: { $ref: "#/components/responses/RateLimited" },
    500: { $ref: "#/components/responses/InternalError" },
  };
  const tenantHeader = {
    name: "x-lewis-tenant-id",
    in: "header" as const,
    required: true,
    schema: { type: "string", format: "uuid" } as const,
  };
  const limitParam = {
    name: "limit",
    in: "query" as const,
    required: false,
    schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } as const,
  };
  const cursorParam = {
    name: "cursor",
    in: "query" as const,
    required: false,
    schema: { type: "string", minLength: 1, maxLength: 512 } as const,
  };

  const document = registry.definitions.length
    ? new OpenApiGeneratorV31(registry.definitions).generateDocument({
        openapi: "3.1.0",
        info: {
          title: "Lewis API",
          version: "0.1.0",
          description:
            "Operating platform for Montana's Experimental Treatment Center (ETC) regime under SB 535 + MAR 2026-427.1.",
        },
        servers: [{ url: baseUrl }],
      })
    : {
        openapi: "3.1.0",
        info: { title: "Lewis API", version: "0.1.0" },
        paths: {},
        components: {},
      };

  document.components ??= {};
  // Augment registered components with hand-authored response shapes.
  document.components.responses = {
    ValidationError: {
      description: "Validation error",
      content: {
        "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
      },
    },
    Unauthenticated: {
      description: "Missing or invalid Clerk session",
      content: {
        "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
      },
    },
    Forbidden: {
      description: "Authenticated but not allowed",
      content: {
        "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
      },
    },
    NotFound: {
      description: "Resource not found",
      content: {
        "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
      },
    },
    RateLimited: {
      description: "Rate limit exceeded",
      content: {
        "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
      },
    },
    InternalError: {
      description: "Internal server error",
      content: {
        "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
      },
    },
    ServiceUnavailable: {
      description: "Temporarily unavailable",
      content: {
        "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
      },
    },
  };

  document.paths = {
    "/healthz": {
      get: {
        summary: "Liveness probe",
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { ok: { type: "boolean" }, service: { type: "string" } },
                },
              },
            },
          },
        },
      },
    },
    "/readyz": {
      get: {
        summary: "Readiness probe (checks DB + Redis)",
        responses: {
          200: { description: "Ready" },
          503: { description: "Not ready" },
        },
      },
    },
    "/v1/webhooks/clerk": {
      post: {
        summary: "Clerk webhook (Svix-signed)",
        responses: { 501: { description: "Verified, no handler yet" } },
      },
    },
    "/v1/webhooks/stripe": {
      post: {
        summary: "Stripe webhook",
        responses: { 501: { description: "Verified, no handler yet" } },
      },
    },
    "/v1/webhooks/plaid": {
      post: {
        summary: "Plaid webhook (JWT-signed)",
        responses: { 501: { description: "Verified, no handler yet" } },
      },
    },
    "/v1/webhooks/resend": {
      post: {
        summary: "Resend webhook (Svix-signed)",
        responses: { 501: { description: "Verified, no handler yet" } },
      },
    },
    "/v1/search": {
      get: {
        summary: "Full-text search across all visible Lewis content",
        security: [{ ClerkBearer: [] }],
        parameters: [
          tenantHeader,
          {
            name: "q",
            in: "query",
            required: true,
            schema: { type: "string", minLength: 1, maxLength: 200 },
          },
          limitParam,
          cursorParam,
        ],
        responses: { 200: ok("SearchResponse"), ...errors },
      },
    },
    "/v1/public/search": {
      get: {
        summary: "Anonymous public directory search (condition-first)",
        description:
          "Sectioned response: conditions, treatments, ETCs in that order. Off-topic queries (e.g. 'ALS') do NOT promote unrelated live programs as primary matches. Rate limited at 30 req/min/IP. See docs/directoryprd.md § 13.",
        parameters: [
          {
            name: "q",
            in: "query",
            required: true,
            schema: { type: "string", minLength: 1, maxLength: 200 },
          },
          {
            name: "type",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["treatment", "condition", "etc"] },
          },
        ],
        responses: {
          200: ok("PublicSearchResponse"),
          400: { $ref: "#/components/responses/ValidationError" },
          429: { $ref: "#/components/responses/RateLimited" },
          500: { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/v1/public/conditions": {
      get: {
        summary: "Anonymous public conditions catalog (list)",
        description:
          "Returns every published condition in the directory with summary metadata and a count of directory_published linked programs. Grouped by state in the UI per § 14.1; alphabetical within each group. Rate limited at 60 req/min/IP. See docs/directoryprd.md § 14.",
        responses: {
          200: ok("PublicConditionListResponse"),
          429: { $ref: "#/components/responses/RateLimited" },
          500: { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/v1/public/conditions/{slug}": {
      get: {
        summary: "Anonymous public condition detail",
        description:
          "Returns a single published condition with linked directory_published programs hydrated. Three states: live (programs listed), coming_soon (program expected, email-signup placeholder), not_offered (graceful fallback to clinicaltrials.gov). See docs/directoryprd.md § 14.2.",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { $ref: "#/components/schemas/ConditionSlug" },
          },
        ],
        responses: {
          200: ok("PublicConditionDetail"),
          400: { $ref: "#/components/responses/ValidationError" },
          404: { $ref: "#/components/responses/NotFound" },
          429: { $ref: "#/components/responses/RateLimited" },
          500: { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/v1/public/programs": {
      get: {
        summary: "Anonymous public programs catalog (list, faceted)",
        description:
          "Returns directory_published programs with summary metadata and a count of ETCs offering each (via active sponsor↔ETC PPAs). Slice 4: accepts repeated query params for filtering — `condition`, `form`, `phase`, `etc`, `manufacturer` — multiple values OR-within a key, AND across keys. `manufacturer` is parsed but currently a no-op (deferred to slice 5+ when the public sponsor display-name path lands). `sort` accepts alphabetical (default) | recent | etc_count. Rate limited at 60 req/min/IP. See docs/directoryprd.md § 15 + § 33.1.",
        parameters: [
          {
            name: "condition",
            in: "query",
            required: false,
            schema: {
              oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
            },
            description: "Filter by condition slug. Repeat for multiple (OR).",
          },
          {
            name: "form",
            in: "query",
            required: false,
            schema: {
              oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
            },
            description:
              "Filter by treatment form (Topical/Oral/Injection/Infusion/Device). Repeat for multiple (OR).",
          },
          {
            name: "phase",
            in: "query",
            required: false,
            schema: {
              oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
            },
            description:
              "Filter by trial phase (Phase 1 / Phase 2 / Phase 3). Repeat for multiple (OR).",
          },
          {
            name: "etc",
            in: "query",
            required: false,
            schema: {
              oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
            },
            description:
              "Filter by ETC slug — programs offered (via active PPA) at any of the listed ETCs.",
          },
          {
            name: "manufacturer",
            in: "query",
            required: false,
            schema: {
              oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
            },
            description:
              "Filter by manufacturer slug. Accepted but server-side wiring deferred to slice 5+.",
          },
          {
            name: "sort",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: ["alphabetical", "recent", "etc_count"],
              default: "alphabetical",
            },
          },
        ],
        responses: {
          200: ok("PublicProgramListResponse"),
          400: { $ref: "#/components/responses/ValidationError" },
          429: { $ref: "#/components/responses/RateLimited" },
          500: { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/v1/public/programs/facets": {
      get: {
        summary: "Anonymous public programs facet counts (Amazon-style)",
        description:
          "Returns count buckets for each filterable facet (conditions / forms / phases / etcs / manufacturers). Each facet's count is computed against the active filter MINUS that facet's own filter, so the count reflects 'what would the result count be if I added this value to the active filter'. Same query params as /v1/public/programs. Manufacturers facet is always empty until the sponsor display-name path lands (slice 5+).",
        parameters: [
          { name: "condition", in: "query", required: false, schema: { type: "string" } },
          { name: "form", in: "query", required: false, schema: { type: "string" } },
          { name: "phase", in: "query", required: false, schema: { type: "string" } },
          { name: "etc", in: "query", required: false, schema: { type: "string" } },
          { name: "manufacturer", in: "query", required: false, schema: { type: "string" } },
        ],
        responses: {
          200: ok("PublicProgramFacets"),
          400: { $ref: "#/components/responses/ValidationError" },
          429: { $ref: "#/components/responses/RateLimited" },
          500: { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/v1/public/programs/{slug}": {
      get: {
        summary: "Anonymous public program detail",
        description:
          "Returns a single published program with full clinical-evidence block (ClinicalTrials.gov ID, IND number, published paper citation + DOI, ETRB approval, mechanism summary, key safety findings) and cost range. See docs/directoryprd.md § 15.3.",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { $ref: "#/components/schemas/ProgramSlug" },
          },
        ],
        responses: {
          200: ok("PublicProgramDetail"),
          400: { $ref: "#/components/responses/ValidationError" },
          404: { $ref: "#/components/responses/NotFound" },
          429: { $ref: "#/components/responses/RateLimited" },
          500: { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/v1/public/programs/{slug}/brief.pdf": {
      get: {
        summary: "Server-rendered single-page clinical brief PDF",
        description:
          "Synchronous Puppeteer render of a 1-page clinician brief PDF (8.5×11, restrained serif, fax-friendly). Cached at the edge for 1 hour with 24h stale-while-revalidate; tighter rate-limit bucket (30 req/min/IP) than the JSON endpoints because Puppeteer is the most expensive operation in the system. Filename: lewis-brief-{slug}-{yyyymmdd}.pdf. See docs/directoryprd.md § 15.6 + § 28.4.",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { $ref: "#/components/schemas/ProgramSlug" },
          },
        ],
        responses: {
          200: {
            description: "PDF document",
            content: {
              "application/pdf": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          404: { $ref: "#/components/responses/NotFound" },
          429: { $ref: "#/components/responses/RateLimited" },
          503: { $ref: "#/components/responses/ServiceUnavailable" },
          500: { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/v1/public/etcs": {
      get: {
        summary: "Anonymous public ETCs catalog (list)",
        description:
          "Returns every directory_published ETC with city, license number, accepting-new-patients flag, lat/lng (for the Mapbox map on /etcs), and a programCount derived from the SECURITY DEFINER directory_etc_program_offerings helper. Rate limited at 60 req/min/IP. See docs/directoryprd.md § 16.",
        responses: {
          200: ok("PublicEtcListResponse"),
          429: { $ref: "#/components/responses/RateLimited" },
          500: { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/v1/public/etcs/{slug}": {
      get: {
        summary: "Anonymous public ETC detail",
        description:
          "Returns a single directory_published ETC plus its medical-director clinical contact, address lines, hours, and offered programs (joined via active sponsor↔ETC PPA). See docs/directoryprd.md § 16.2.",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { $ref: "#/components/schemas/EtcSlug" },
          },
        ],
        responses: {
          200: ok("PublicEtcDetail"),
          400: { $ref: "#/components/responses/ValidationError" },
          404: { $ref: "#/components/responses/NotFound" },
          429: { $ref: "#/components/responses/RateLimited" },
          500: { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/v1/public/marketing-subscriptions": {
      post: {
        summary: "Anonymous marketing subscription (slice 4 § 11.2 / 11.9)",
        description:
          "Records an email signup against one of three sources (announcement_strip, homepage_beginning, browse_bottom). Idempotent on email — a second submission for an existing email is a no-op (no duplicate confirmation email). Always returns 200 { ok: true } regardless of new-vs-existing to defeat email-existence timing attacks. The Resend confirmation email is sent asynchronously via the notifications worker queue. Rate limited at 10 req/min/IP.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MarketingSubscriptionRequest" },
            },
          },
        },
        responses: {
          200: ok("MarketingSubscriptionResponse"),
          400: { $ref: "#/components/responses/ValidationError" },
          429: { $ref: "#/components/responses/RateLimited" },
          500: { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/v1/public/marketing-subscriptions/confirm": {
      get: {
        summary: "Confirm an anonymous marketing subscription via token",
        description:
          "Flips a pending subscription to confirmed. Returns { confirmed: false } for unknown tokens, already-confirmed rows, and unsubscribed rows alike — no token-validity oracle.",
        parameters: [
          {
            name: "token",
            in: "query",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: ok("MarketingConfirmResponse"),
          400: { $ref: "#/components/responses/ValidationError" },
          429: { $ref: "#/components/responses/RateLimited" },
          500: { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/v1/public/marketing-subscriptions/unsubscribe": {
      get: {
        summary: "Unsubscribe from anonymous marketing via token",
        description:
          "Flips a pending or confirmed subscription to unsubscribed. Returns { unsubscribed: false } for unknown tokens or already-unsubscribed rows.",
        parameters: [
          {
            name: "token",
            in: "query",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MarketingUnsubscribeResponse" },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          429: { $ref: "#/components/responses/RateLimited" },
          500: { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/v1/sponsors/{sponsorId}/programs": {
      get: {
        summary: "List programs owned by a sponsor",
        security: [{ ClerkBearer: [] }],
        parameters: [
          tenantHeader,
          {
            name: "sponsorId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          limitParam,
          cursorParam,
        ],
        responses: { 200: ok("SponsorProgramsResponse"), ...errors },
      },
    },
    "/v1/sponsors/{sponsorId}/etcs": {
      get: {
        summary: "List ETCs in active PPA with this sponsor",
        security: [{ ClerkBearer: [] }],
        parameters: [
          tenantHeader,
          {
            name: "sponsorId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          limitParam,
          cursorParam,
        ],
        responses: { 200: ok("SponsorEtcsResponse"), ...errors },
      },
    },
    "/v1/sponsors/{sponsorId}/adverse-events": {
      get: {
        summary: "List adverse events visible to this sponsor (consent-scoped)",
        security: [{ ClerkBearer: [] }],
        parameters: [
          tenantHeader,
          {
            name: "sponsorId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          limitParam,
          cursorParam,
        ],
        responses: { 200: ok("SponsorAdverseEventsResponse"), ...errors },
      },
    },
    "/v1/etcs/{etcId}/dashboard": {
      get: {
        summary: "ETC dashboard summary",
        security: [{ ClerkBearer: [] }],
        parameters: [
          tenantHeader,
          {
            name: "etcId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { 200: ok("EtcDashboardResponse"), ...errors },
      },
    },
    "/v1/etcs/{etcId}/compliance": {
      get: {
        summary: "ETC compliance health and obligations",
        security: [{ ClerkBearer: [] }],
        parameters: [
          tenantHeader,
          {
            name: "etcId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { 200: ok("EtcComplianceResponse"), ...errors },
      },
    },
    "/v1/etcs/{etcId}/messages": {
      get: {
        summary: "ETC message threads",
        security: [{ ClerkBearer: [] }],
        parameters: [
          tenantHeader,
          {
            name: "etcId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          limitParam,
          cursorParam,
        ],
        responses: { 200: ok("EtcMessagesResponse"), ...errors },
      },
    },
    "/v1/etcs/{etcId}/drug-inventory/lots": {
      get: {
        summary: "ETC drug inventory lots",
        security: [{ ClerkBearer: [] }],
        parameters: [
          tenantHeader,
          {
            name: "etcId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          limitParam,
          cursorParam,
        ],
        responses: { 200: ok("EtcDrugInventoryLotsResponse"), ...errors },
      },
    },
    "/v1/patients/me": {
      get: {
        summary: "Patient self-profile",
        security: [{ ClerkBearer: [] }],
        parameters: [tenantHeader],
        responses: { 200: ok("PatientMeResponse"), ...errors },
      },
    },
    "/v1/patients/me/messages": {
      get: {
        summary: "Patient message threads",
        security: [{ ClerkBearer: [] }],
        parameters: [tenantHeader, limitParam, cursorParam],
        responses: { 200: ok("PatientMessagesResponse"), ...errors },
      },
    },
    "/v1/patients/me/documents": {
      get: {
        summary: "Patient documents",
        security: [{ ClerkBearer: [] }],
        parameters: [tenantHeader, limitParam, cursorParam],
        responses: { 200: ok("PatientDocumentsResponse"), ...errors },
      },
    },
    "/v1/boards/{boardId}/protocol-reviews": {
      get: {
        summary: "Review board protocol-review queue",
        security: [{ ClerkBearer: [] }],
        parameters: [
          tenantHeader,
          {
            name: "boardId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          limitParam,
          cursorParam,
        ],
        responses: { 200: ok("BoardProtocolReviewsResponse"), ...errors },
      },
    },
    "/v1/boards/{boardId}/annual-report": {
      get: {
        summary: "Review board annual (Jan 31) report",
        security: [{ ClerkBearer: [] }],
        parameters: [
          tenantHeader,
          {
            name: "boardId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { 200: ok("BoardAnnualReportResponse"), ...errors },
      },
    },
    "/v1/admin/tenants": {
      get: {
        summary: "Internal admin: list tenants",
        description: "Requires lewis_admin role and X-Support-Ticket-Id header. Audit-logged.",
        security: [{ ClerkBearer: [] }],
        parameters: [
          tenantHeader,
          {
            name: "x-support-ticket-id",
            in: "header",
            required: true,
            schema: { type: "string", minLength: 1, maxLength: 128 },
          },
          limitParam,
          cursorParam,
        ],
        responses: { 200: ok("AdminTenantsResponse"), ...errors },
      },
    },
    "/v1/admin/compliance": {
      get: {
        summary: "Internal admin: compliance watchlist",
        security: [{ ClerkBearer: [] }],
        parameters: [
          tenantHeader,
          {
            name: "x-support-ticket-id",
            in: "header",
            required: true,
            schema: { type: "string", minLength: 1, maxLength: 128 },
          },
          limitParam,
          cursorParam,
        ],
        responses: { 200: ok("AdminComplianceResponse"), ...errors },
      },
    },
    "/v1/admin/audit-log": {
      get: {
        summary: "Internal admin: audit log",
        security: [{ ClerkBearer: [] }],
        parameters: [
          tenantHeader,
          {
            name: "x-support-ticket-id",
            in: "header",
            required: true,
            schema: { type: "string", minLength: 1, maxLength: 128 },
          },
          limitParam,
          cursorParam,
        ],
        responses: { 200: ok("AdminAuditLogResponse"), ...errors },
      },
    },
  };

  return document;
}
