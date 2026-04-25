/**
 * CI gate: every table that runs `enable row level security` in any migration
 * must also have at least one SELECT policy AND at least one
 * INSERT/UPDATE/DELETE/ALL policy.
 *
 * Naive grep would miss policies declared FOR ALL or use FOR INSERT/UPDATE
 * variants. This script parses each .sql file in packages/db/migrations/,
 * collects the set of RLS-enabled tables, and the set of (table, operation)
 * tuples from `create policy ... ON <table> ... FOR <op>` (or ALL) statements.
 *
 * A table with RLS enabled but missing SELECT, or missing all of
 * {INSERT, UPDATE, DELETE, ALL}, fails the build.
 *
 * Run via: tsx packages/db/scripts/check-rls-coverage.ts
 */
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Anchor on the script file so it works no matter what cwd it's invoked from
// (pnpm --filter sets cwd to packages/db, mise runs sets it to repo root).
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(SCRIPT_DIR, "..", "migrations");

const RLS_ENABLE = /alter\s+table\s+(\w+)\s+enable\s+row\s+level\s+security/gi;
const RLS_DISABLE = /alter\s+table\s+(\w+)\s+disable\s+row\s+level\s+security/gi;
// `create policy NAME on TABLE [as ...] for OP ...`. OP defaults to ALL if omitted.
const POLICY_DECL =
  /create\s+policy\s+\w+\s+on\s+(\w+)(?:\s+as\s+\w+)?(?:\s+for\s+(select|insert|update|delete|all))?/gi;

type PolicyOp = "select" | "insert" | "update" | "delete" | "all";

async function loadMigrations(): Promise<{ file: string; sql: string }[]> {
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  return Promise.all(
    files.map(async (f) => ({
      file: f,
      sql: await readFile(join(MIGRATIONS_DIR, f), "utf8"),
    })),
  );
}

async function main(): Promise<void> {
  const migrations = await loadMigrations();
  const rlsEnabled = new Set<string>();
  const policyOps = new Map<string, Set<PolicyOp>>();

  for (const { sql } of migrations) {
    // Strip line comments to avoid commented-out statements polluting the scan.
    const stripped = sql.replace(/--[^\n]*/g, "");

    for (const match of stripped.matchAll(RLS_ENABLE)) {
      const table = match[1];
      if (table) rlsEnabled.add(table.toLowerCase());
    }
    for (const match of stripped.matchAll(RLS_DISABLE)) {
      const table = match[1];
      if (table) rlsEnabled.delete(table.toLowerCase());
    }

    for (const match of stripped.matchAll(POLICY_DECL)) {
      const table = match[1]?.toLowerCase();
      if (!table) continue;
      const op = (match[2]?.toLowerCase() ?? "all") as PolicyOp;
      if (!policyOps.has(table)) policyOps.set(table, new Set());
      policyOps.get(table)!.add(op);
    }
  }

  const failures: string[] = [];
  for (const table of rlsEnabled) {
    const ops = policyOps.get(table) ?? new Set<PolicyOp>();
    const hasSelect = ops.has("select") || ops.has("all");
    const hasWrite = ops.has("insert") || ops.has("update") || ops.has("delete") || ops.has("all");
    if (!hasSelect) {
      failures.push(`  ${table}: missing SELECT policy (or FOR ALL)`);
    }
    if (!hasWrite) {
      failures.push(`  ${table}: missing INSERT/UPDATE/DELETE policy (or FOR ALL)`);
    }
  }

  if (failures.length > 0) {
    console.error("RLS coverage check FAILED:");
    for (const f of failures) console.error(f);
    console.error(
      "\nEvery RLS-enabled table must have at least one SELECT policy AND at least one INSERT/UPDATE/DELETE/ALL policy. Add the missing policies in a forward migration.",
    );
    process.exit(1);
  }

  console.warn(
    `RLS coverage check PASSED: ${rlsEnabled.size} RLS-enabled tables, all have SELECT and at least one write policy.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});
