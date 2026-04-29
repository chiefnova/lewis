import { describe, expect, it } from "vitest";

import { checkCloudMigrationEnv } from "./cloud-migration-preflight.js";

describe("checkCloudMigrationEnv", () => {
  it("rejects when MIGRATION_DATABASE_URL is unset", () => {
    const result = checkCloudMigrationEnv({});

    expect(result.ok).toBe(false);
    if (result.ok) return; // narrow for TS
    expect(result.reason).toMatch(/MIGRATION_DATABASE_URL is not set/);
  });

  it("rejects when MIGRATION_DATABASE_URL is the empty string", () => {
    const result = checkCloudMigrationEnv({ MIGRATION_DATABASE_URL: "" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/empty/);
  });

  it("rejects when MIGRATION_DATABASE_URL is whitespace-only", () => {
    const result = checkCloudMigrationEnv({ MIGRATION_DATABASE_URL: "   \t\n" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/empty/);
  });

  it("does NOT fall back to DATABASE_URL when MIGRATION_DATABASE_URL is unset", () => {
    // The whole point of the preflight: even if DATABASE_URL is set with a
    // valid-looking connection string, the script must refuse without an
    // explicit MIGRATION_DATABASE_URL. This locks in the CLAUDE.md security
    // #1 intent that schema-owner credentials are never held under the
    // runtime env-var name.
    const result = checkCloudMigrationEnv({
      DATABASE_URL: "postgres://schema_owner:secret@db.example.com:5432/lewis",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/MIGRATION_DATABASE_URL is not set/);
  });

  it("accepts when MIGRATION_DATABASE_URL is a non-empty string", () => {
    const result = checkCloudMigrationEnv({
      MIGRATION_DATABASE_URL:
        "postgres://postgres:redacted@aws-1-us-west-2.pooler.supabase.com:5432/postgres",
    });

    expect(result.ok).toBe(true);
  });
});
