/**
 * CI gate: every table that runs `enable row level security` in any migration
 * must also have `force row level security`, at least one SELECT policy, AND
 * at least one INSERT/UPDATE/DELETE/ALL policy that is STILL DEFINED after
 * the full migration sequence has run.
 *
 * Naive grep would miss policies declared FOR ALL or use FOR INSERT/UPDATE
 * variants AND would falsely accept a policy that was dropped without a
 * replacement. This script parses each .sql file in packages/db/migrations/
 * in lexicographic order and tracks the set of LIVE policies as
 * (name, table, operation) triples. CREATE adds an entry; DROP removes the
 * entry by name. The final coverage check is computed against the set of
 * policies that survived.
 *
 * A table with RLS enabled but missing FORCE RLS, missing SELECT, or missing
 * all of {INSERT, UPDATE, DELETE, ALL}, fails the build.
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

const RLS_ENABLE = /alter\s+table\s+(?:if\s+exists\s+)?(\w+)\s+enable\s+row\s+level\s+security/gi;
const RLS_DISABLE = /alter\s+table\s+(?:if\s+exists\s+)?(\w+)\s+disable\s+row\s+level\s+security/gi;
const RLS_FORCE = /alter\s+table\s+(?:if\s+exists\s+)?(\w+)\s+force\s+row\s+level\s+security/gi;
const RLS_NO_FORCE =
  /alter\s+table\s+(?:if\s+exists\s+)?(\w+)\s+no\s+force\s+row\s+level\s+security/gi;
// `create policy NAME on TABLE [as ...] for OP ...`. OP defaults to ALL if omitted.
const POLICY_DECL =
  /create\s+policy\s+(\w+)\s+on\s+(\w+)(?:\s+as\s+\w+)?(?:\s+for\s+(select|insert|update|delete|all))?/gi;
// `drop policy [if exists] NAME on TABLE [cascade|restrict]`.
const POLICY_DROP = /drop\s+policy\s+(?:if\s+exists\s+)?(\w+)\s+on\s+(\w+)/gi;

type PolicyOp = "select" | "insert" | "update" | "delete" | "all";

type LivePolicy = { table: string; op: PolicyOp };

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
  const rlsForced = new Set<string>();
  // Live policies keyed by (table, name) — Postgres allows the same policy
  // name on different tables, so the key must include the table.
  const livePolicies = new Map<string, LivePolicy>();
  const policyKey = (table: string, name: string): string => `${table}::${name}`;

  for (const { sql } of migrations) {
    // Strip line comments AND block comments to avoid commented-out
    // statements polluting the scan.
    const stripped = sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");

    for (const match of stripped.matchAll(RLS_ENABLE)) {
      const table = match[1];
      if (table) rlsEnabled.add(table.toLowerCase());
    }
    for (const match of stripped.matchAll(RLS_DISABLE)) {
      const table = match[1];
      if (table) rlsEnabled.delete(table.toLowerCase());
    }
    for (const match of stripped.matchAll(RLS_FORCE)) {
      const table = match[1];
      if (table) rlsForced.add(table.toLowerCase());
    }
    for (const match of stripped.matchAll(RLS_NO_FORCE)) {
      const table = match[1];
      if (table) rlsForced.delete(table.toLowerCase());
    }

    // Policy CREATE and DROP must be processed in textual order — a single
    // migration commonly drops a policy then re-creates it with refined
    // semantics (see 0012 / 0014 / 0016). matchAll iterates per-regex in match
    // order, but we need cross-regex order, so merge both and sort by index.
    type PolicyEvent =
      | { kind: "create"; index: number; table: string; name: string; op: PolicyOp }
      | { kind: "drop"; index: number; table: string; name: string };

    const events: PolicyEvent[] = [];

    for (const match of stripped.matchAll(POLICY_DECL)) {
      const name = match[1]?.toLowerCase();
      const table = match[2]?.toLowerCase();
      if (!name || !table || match.index === undefined) continue;
      const op = (match[3]?.toLowerCase() ?? "all") as PolicyOp;
      events.push({ kind: "create", index: match.index, table, name, op });
    }
    for (const match of stripped.matchAll(POLICY_DROP)) {
      const name = match[1]?.toLowerCase();
      const table = match[2]?.toLowerCase();
      if (!name || !table || match.index === undefined) continue;
      events.push({ kind: "drop", index: match.index, table, name });
    }

    events.sort((a, b) => a.index - b.index);

    for (const event of events) {
      if (event.kind === "create") {
        livePolicies.set(policyKey(event.table, event.name), {
          table: event.table,
          op: event.op,
        });
      } else {
        livePolicies.delete(policyKey(event.table, event.name));
      }
    }
  }

  // Aggregate live (table, op) coverage from surviving policies only.
  const policyOps = new Map<string, Set<PolicyOp>>();
  for (const { table, op } of livePolicies.values()) {
    if (!policyOps.has(table)) policyOps.set(table, new Set());
    policyOps.get(table)!.add(op);
  }

  const failures: string[] = [];
  for (const table of rlsEnabled) {
    const ops = policyOps.get(table) ?? new Set<PolicyOp>();
    const hasSelect = ops.has("select") || ops.has("all");
    const hasWrite = ops.has("insert") || ops.has("update") || ops.has("delete") || ops.has("all");
    if (!rlsForced.has(table)) {
      failures.push(`  ${table}: missing FORCE ROW LEVEL SECURITY`);
    }
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
      "\nEvery RLS-enabled table must have FORCE ROW LEVEL SECURITY, at least one SELECT policy, AND at least one INSERT/UPDATE/DELETE/ALL policy. Add the missing policies or FORCE RLS in a forward migration.",
    );
    process.exit(1);
  }

  console.warn(
    `RLS coverage check PASSED: ${rlsEnabled.size} RLS-enabled tables, all have FORCE RLS, SELECT, and at least one write policy. ${livePolicies.size} live policies tracked across ${migrations.length} migration files.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});
