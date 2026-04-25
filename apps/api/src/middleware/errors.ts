import { buildErrorResponse, HTTP_STATUS_BY_CODE, type ErrorCode } from "@corridor/shared";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/**
 * Throw inside a handler/middleware to short-circuit with a canonical error
 * envelope. The Hono onError hook serializes it.
 */
export class ApiError extends HTTPException {
  readonly code: ErrorCode;
  readonly publicMessage: string;
  readonly publicDetails?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    // Every ErrorCode maps to a 4xx/5xx status which is always Contentful.
    super(HTTP_STATUS_BY_CODE[code] as ContentfulStatusCode, { message });
    this.code = code;
    this.publicMessage = message;
    this.publicDetails = details;
  }
}

export function respondWithError(
  c: Context,
  code: ErrorCode,
  message: string,
  details?: unknown,
): Response {
  const requestId = c.get("requestId") ?? "unknown";
  // All ErrorCode values map to >= 400 status codes per HTTP_STATUS_BY_CODE,
  // which are all valid ContentfulStatusCode values.
  const status = HTTP_STATUS_BY_CODE[code] as ContentfulStatusCode;
  return c.json(buildErrorResponse(code, message, requestId, details), status);
}
