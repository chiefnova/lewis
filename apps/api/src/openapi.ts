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
