import { describe, expect, it } from "vitest";

import { hasWorkerDatabaseConfig, resolveWorkerDatabaseEnv } from "./database-env.js";

describe("hasWorkerDatabaseConfig", () => {
  it("returns false when no WORKER_* keys are set", () => {
    expect(hasWorkerDatabaseConfig({})).toBe(false);
    expect(hasWorkerDatabaseConfig({ DATABASE_URL: "postgres://x" })).toBe(false);
  });

  it("returns true when WORKER_DATABASE_URL is set", () => {
    expect(hasWorkerDatabaseConfig({ WORKER_DATABASE_URL: "postgres://x" })).toBe(true);
  });

  it("returns true when only a single WORKER_DB_* key is set", () => {
    expect(hasWorkerDatabaseConfig({ WORKER_DB_HOST: "h" })).toBe(true);
    expect(hasWorkerDatabaseConfig({ WORKER_DB_PORT: "5432" })).toBe(true);
    expect(hasWorkerDatabaseConfig({ WORKER_DB_DATABASE: "db" })).toBe(true);
    expect(hasWorkerDatabaseConfig({ WORKER_DB_USERNAME: "u" })).toBe(true);
    expect(hasWorkerDatabaseConfig({ WORKER_DB_PASSWORD: "p" })).toBe(true);
  });

  it("treats empty strings as set (env-var present but empty)", () => {
    expect(hasWorkerDatabaseConfig({ WORKER_DATABASE_URL: "" })).toBe(true);
  });
});

describe("resolveWorkerDatabaseEnv", () => {
  it("returns the input env unchanged when no WORKER_* override is present", () => {
    const input = { DATABASE_URL: "postgres://api@h/db", FOO: "bar" };
    expect(resolveWorkerDatabaseEnv(input)).toBe(input);
  });

  it("overrides DATABASE_URL when WORKER_DATABASE_URL is set", () => {
    const result = resolveWorkerDatabaseEnv({
      DATABASE_URL: "postgres://api@h/db",
      WORKER_DATABASE_URL: "postgres://worker@h/db",
    });
    expect(result.DATABASE_URL).toBe("postgres://worker@h/db");
  });

  it("preserves DATABASE_URL when only a WORKER_DB_* component override is set", () => {
    const result = resolveWorkerDatabaseEnv({
      DATABASE_URL: "postgres://api@h/db",
      DB_USERNAME: "api",
      WORKER_DB_USERNAME: "app_worker",
    });
    expect(result.DATABASE_URL).toBe("postgres://api@h/db");
    expect(result.DB_USERNAME).toBe("app_worker");
  });

  it("falls back to DB_* when WORKER_DB_* is unset for that field", () => {
    const result = resolveWorkerDatabaseEnv({
      DB_HOST: "127.0.0.1",
      DB_PORT: "15432",
      DB_DATABASE: "lewis_dev",
      DB_USERNAME: "app_api",
      DB_PASSWORD: "lewis_app_api",
      WORKER_DB_USERNAME: "app_worker",
      WORKER_DB_PASSWORD: "lewis_app_worker",
    });
    expect(result.DB_HOST).toBe("127.0.0.1");
    expect(result.DB_PORT).toBe("15432");
    expect(result.DB_DATABASE).toBe("lewis_dev");
    expect(result.DB_USERNAME).toBe("app_worker");
    expect(result.DB_PASSWORD).toBe("lewis_app_worker");
  });

  it("WORKER_DATABASE_URL alone does NOT override DB_HOST", () => {
    const result = resolveWorkerDatabaseEnv({
      DB_HOST: "h.api",
      WORKER_DATABASE_URL: "postgres://worker@h.worker/db",
    });
    expect(result.DATABASE_URL).toBe("postgres://worker@h.worker/db");
    expect(result.DB_HOST).toBe("h.api");
  });

  it("does not mutate the input env object", () => {
    const input = { DATABASE_URL: "x", WORKER_DATABASE_URL: "y" };
    const snapshot = { ...input };
    resolveWorkerDatabaseEnv(input);
    expect(input).toEqual(snapshot);
  });
});
