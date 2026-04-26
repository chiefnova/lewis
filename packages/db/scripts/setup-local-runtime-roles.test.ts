import { describe, expect, it } from "vitest";

import {
  assertLocalRoleSetupSafe,
  assertSafeRolePassword,
  sqlStringLiteral,
} from "./setup-local-runtime-roles.js";

describe("assertLocalRoleSetupSafe", () => {
  it("rejects production NODE_ENV", () => {
    expect(() => assertLocalRoleSetupSafe("postgres://x:y@127.0.0.1:5432/z", "production")).toThrow(
      /NODE_ENV=production/,
    );
  });

  it("rejects staging NODE_ENV", () => {
    expect(() => assertLocalRoleSetupSafe("postgres://x:y@127.0.0.1:5432/z", "staging")).toThrow(
      /NODE_ENV=staging/,
    );
  });

  it("rejects unknown NODE_ENV", () => {
    expect(() => assertLocalRoleSetupSafe("postgres://x:y@127.0.0.1:5432/z", "preview")).toThrow(
      /NODE_ENV=preview/,
    );
  });

  it("accepts development NODE_ENV against 127.0.0.1", () => {
    expect(() =>
      assertLocalRoleSetupSafe("postgres://x:y@127.0.0.1:5432/z", "development"),
    ).not.toThrow();
  });

  it("accepts test NODE_ENV against localhost", () => {
    expect(() => assertLocalRoleSetupSafe("postgres://x:y@localhost:5432/z", "test")).not.toThrow();
  });

  it("accepts host.docker.internal", () => {
    expect(() =>
      assertLocalRoleSetupSafe("postgres://x:y@host.docker.internal:5432/z", "test"),
    ).not.toThrow();
  });

  it("accepts the docker-compose hostname 'postgres'", () => {
    expect(() => assertLocalRoleSetupSafe("postgres://x:y@postgres:5432/z", "test")).not.toThrow();
  });

  it("accepts hosts ending in .local", () => {
    expect(() => assertLocalRoleSetupSafe("postgres://x:y@dev.local:5432/z", "test")).not.toThrow();
  });

  it("accepts hosts ending in .localhost", () => {
    expect(() =>
      assertLocalRoleSetupSafe("postgres://x:y@db.dev.localhost:5432/z", "test"),
    ).not.toThrow();
  });

  it("accepts bracketed IPv6 ::1", () => {
    expect(() => assertLocalRoleSetupSafe("postgres://x:y@[::1]:5432/z", "test")).not.toThrow();
  });

  it("rejects RDS-style staging hosts", () => {
    expect(() =>
      assertLocalRoleSetupSafe(
        "postgres://x:y@db-staging.cluster-xyz.us-east-1.rds.amazonaws.com:5432/z",
        "test",
      ),
    ).toThrow(/refuses to run against host/);
  });

  it("rejects Supabase pooler hosts", () => {
    expect(() =>
      assertLocalRoleSetupSafe("postgres://x:y@db.example.supabase.co:6543/z", "test"),
    ).toThrow(/refuses to run against host/);
  });

  it("rejects malformed connection strings clearly", () => {
    expect(() => assertLocalRoleSetupSafe("not-a-url", "test")).toThrow(/could not parse/);
  });
});

describe("assertSafeRolePassword", () => {
  it("accepts the bundled defaults", () => {
    expect(() => assertSafeRolePassword("corridor_app_api", "X")).not.toThrow();
    expect(() => assertSafeRolePassword("corridor_app_worker", "X")).not.toThrow();
  });

  it("accepts alphanumeric + dash + underscore", () => {
    expect(() => assertSafeRolePassword("My-Secret_123", "X")).not.toThrow();
  });

  it("rejects passwords with single quotes (would break interpolation)", () => {
    expect(() => assertSafeRolePassword("hax'or", "PWD")).toThrow(/PWD must match/);
  });

  it("rejects passwords with backslashes", () => {
    expect(() => assertSafeRolePassword("hax\\or", "PWD")).toThrow(/PWD must match/);
  });

  it("rejects passwords with spaces", () => {
    expect(() => assertSafeRolePassword("has space", "PWD")).toThrow(/PWD must match/);
  });

  it("rejects empty passwords", () => {
    expect(() => assertSafeRolePassword("", "PWD")).toThrow(/PWD must match/);
  });

  it("rejects passwords shorter than 8 characters", () => {
    expect(() => assertSafeRolePassword("abc", "PWD")).toThrow(/PWD must match/);
  });

  it("rejects unicode confusables (smart quotes)", () => {
    expect(() => assertSafeRolePassword("normalish‘", "PWD")).toThrow(/PWD must match/);
  });
});

describe("sqlStringLiteral", () => {
  it("wraps in single quotes", () => {
    expect(sqlStringLiteral("hello")).toBe("'hello'");
  });

  it("doubles single quotes per Postgres standard_conforming_strings", () => {
    expect(sqlStringLiteral("o'reilly")).toBe("'o''reilly'");
  });

  it("preserves backslashes (non-escape under standard_conforming_strings)", () => {
    expect(sqlStringLiteral("a\\b")).toBe("'a\\b'");
  });
});
