import { redactPhi } from "@lewis/shared";
import pino, { type Logger } from "pino";

/**
 * Structured logger for the API. Pino-backed; production output is JSON
 * for log aggregators (Datadog, Logtail, etc.) and dev output is
 * pretty-printed for developer eyes.
 *
 * Why structured: redactPhi is a last-line defense — it only matches a
 * limited set of patterns. The right discipline is to never log free-form
 * strings that might contain PHI. The logger surface here intentionally
 * does NOT expose a `info(message: string)` shape. Callers pass typed
 * fields (tenantId, requestId, action, objectId) and the logger composes
 * the structured event.
 *
 * The redactPhi pass at message-formatting time is belt-and-suspenders;
 * we leave it on for the synthetic message field where unavoidable
 * (errors with .message strings, etc.) but prefer field-based logging.
 */

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

const baseLogger: Logger = pino({
  level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
  // Tag every log line with the application name so multi-service log
  // aggregation can route correctly.
  base: {
    service: "lewis-api",
    pid: process.pid,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Redact a small set of obviously-sensitive fields if a caller
  // accidentally passes them. This does NOT replace careful field design.
  redact: {
    paths: [
      "*.password",
      "*.token",
      "*.secret",
      "*.authorization",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[REDACTED]",
  },
  // Pretty-print in dev for human readability. In test mode silence noise.
  ...(isProduction
    ? {}
    : isTest
      ? { level: "silent" }
      : {
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss.l",
              ignore: "pid,service",
            },
          },
        }),
  // Format error messages through redactPhi as a last-line defense.
  formatters: {
    log(object: Record<string, unknown>) {
      if (typeof object.message === "string") {
        return { ...object, message: redactPhi(object.message) };
      }
      return object;
    },
  },
});

export const logger = baseLogger;

/**
 * Create a child logger bound to per-request context. Every log line emitted
 * from the returned logger automatically includes requestId + tenantId.
 */
export function requestLogger(bindings: {
  requestId: string;
  tenantId?: string;
  userId?: string;
}): Logger {
  return baseLogger.child(bindings);
}
