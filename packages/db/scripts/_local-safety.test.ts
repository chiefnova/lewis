import { describe, expect, it } from "vitest";

import {
  ALLOWED_HOST_LITERALS,
  ALLOWED_NODE_ENVS,
  LocalSafetyError,
  assertLocalDatabaseSafe,
} from "./_local-safety.js";

describe("ALLOWED_NODE_ENVS", () => {
  it("contains exactly development and test", () => {
    expect([...ALLOWED_NODE_ENVS].sort()).toEqual(["development", "test"]);
  });
});

describe("ALLOWED_HOST_LITERALS", () => {
  it("includes the docker-compose hostname and the loopback addresses", () => {
    expect(ALLOWED_HOST_LITERALS.has("postgres")).toBe(true);
    expect(ALLOWED_HOST_LITERALS.has("127.0.0.1")).toBe(true);
    expect(ALLOWED_HOST_LITERALS.has("::1")).toBe(true);
    expect(ALLOWED_HOST_LITERALS.has("localhost")).toBe(true);
    expect(ALLOWED_HOST_LITERALS.has("host.docker.internal")).toBe(true);
  });

  it("does NOT include known unsafe hosts", () => {
    expect(ALLOWED_HOST_LITERALS.has("db.amazonaws.com")).toBe(false);
    expect(ALLOWED_HOST_LITERALS.has("supabase.co")).toBe(false);
  });
});

describe("assertLocalDatabaseSafe", () => {
  it("throws LocalSafetyError on production NODE_ENV", () => {
    expect(() =>
      assertLocalDatabaseSafe({
        connectionString: "postgres://x:y@127.0.0.1:5432/z",
        nodeEnv: "production",
        scriptName: "test",
      }),
    ).toThrow(LocalSafetyError);
  });

  it("includes the script name in the production error", () => {
    expect(() =>
      assertLocalDatabaseSafe({
        connectionString: "postgres://x:y@127.0.0.1:5432/z",
        nodeEnv: "production",
        scriptName: "my-script.ts",
      }),
    ).toThrow(/my-script\.ts refuses to run with NODE_ENV=production/);
  });

  it("accepts development against 127.0.0.1", () => {
    expect(() =>
      assertLocalDatabaseSafe({
        connectionString: "postgres://x:y@127.0.0.1:5432/z",
        nodeEnv: "development",
      }),
    ).not.toThrow();
  });

  it("accepts test against the docker-compose hostname", () => {
    expect(() =>
      assertLocalDatabaseSafe({
        connectionString: "postgres://x:y@postgres:5432/z",
        nodeEnv: "test",
      }),
    ).not.toThrow();
  });

  it("accepts bracketed IPv6 ::1", () => {
    expect(() =>
      assertLocalDatabaseSafe({
        connectionString: "postgres://x:y@[::1]:5432/z",
        nodeEnv: "test",
      }),
    ).not.toThrow();
  });

  it("rejects an RDS-style host", () => {
    expect(() =>
      assertLocalDatabaseSafe({
        connectionString: "postgres://x:y@db.cluster.us-east-1.rds.amazonaws.com:5432/z",
        nodeEnv: "test",
      }),
    ).toThrow(/refuses to run against host/);
  });

  it("rejects a malformed connection string clearly", () => {
    expect(() =>
      assertLocalDatabaseSafe({
        connectionString: "not a url",
        nodeEnv: "test",
      }),
    ).toThrow(/could not parse/);
  });

  it("uses 'this script' as default name when not provided", () => {
    expect(() =>
      assertLocalDatabaseSafe({
        connectionString: "postgres://x:y@aws.example.com:5432/z",
        nodeEnv: "test",
      }),
    ).toThrow(/refuses to run against host 'aws.example.com'/);
  });
});
