import { z } from "zod";

/**
 * Canonical error code vocabulary for all Corridor API responses.
 *
 * Mapping to HTTP status:
 *   validation_error  → 400
 *   unauthenticated   → 401
 *   forbidden         → 403
 *   not_found         → 404
 *   conflict          → 409
 *   unprocessable     → 422
 *   rate_limited      → 429
 *   internal_error    → 500
 *   not_implemented   → 501
 *   service_unavail   → 503
 */
export const ErrorCode = z.enum([
  "validation_error",
  "unauthenticated",
  "forbidden",
  "not_found",
  "conflict",
  "unprocessable",
  "rate_limited",
  "internal_error",
  "not_implemented",
  "service_unavail",
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ErrorResponse = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    details: z.unknown().optional(),
  }),
  requestId: z.string(),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;

export const HTTP_STATUS_BY_CODE: Record<ErrorCode, number> = {
  validation_error: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  unprocessable: 422,
  rate_limited: 429,
  internal_error: 500,
  not_implemented: 501,
  service_unavail: 503,
};

export function buildErrorResponse(
  code: ErrorCode,
  message: string,
  requestId: string,
  details?: unknown,
): ErrorResponse {
  return {
    error: { code, message, ...(details === undefined ? {} : { details }) },
    requestId,
  };
}
