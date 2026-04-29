import { redactPhi } from "@lewis/shared";

/**
 * Pure-function PHI hardening for access-log lines.
 *
 * Lives in its own module (no app/middleware imports, no `process.env`
 * reads) so unit tests can import it without triggering the full server
 * bootstrap chain — buildCorsMiddleware in particular fails-closed when
 * CORS_ALLOWED_ORIGINS is unset, which would crash any test that
 * accidentally evaluated server.ts at module-load time.
 *
 * Strips the `?…` query string from `<--`/`-->` access-log lines that
 * hono/logger emits ("<-- GET /v1/public/search?q=…" or
 * "--> GET /v1/public/search?q=… 200 12ms"), then runs the result through
 * redactPhi as defense in depth. The query-string strip is the primary
 * fix; redactPhi catches anything that hits the message via a different
 * path (e.g. error messages embedded in the access log).
 */

const HTTP_METHOD_WITH_URL_PATTERN =
  /\b(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+([^\s?]+)\?[^\s]*/g;

export function sanitizeAccessLogMessage(message: string): string {
  const withoutQueryStrings = message.replace(HTTP_METHOD_WITH_URL_PATTERN, "$1 $2");
  return redactPhi(withoutQueryStrings);
}
