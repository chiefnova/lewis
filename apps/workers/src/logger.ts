import { redactPhi } from "@corridor/shared";
import pino, { type Logger } from "pino";

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
  base: {
    service: "corridor-workers",
    pid: process.pid,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ["*.password", "*.token", "*.secret", "*.authorization"],
    censor: "[REDACTED]",
  },
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
  formatters: {
    log(object: Record<string, unknown>) {
      if (typeof object.message === "string") {
        return { ...object, message: redactPhi(object.message) };
      }
      return object;
    },
  },
});
