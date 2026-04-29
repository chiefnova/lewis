/**
 * CI gate: assert `migrations/meta/_journal.json` is in sync with the
 * on-disk SQL files.
 *
 * Why this exists: someone adds `migrations/0018_<feature>.sql` but
 * forgets to run `pnpm --filter @lewis/db migrate:journal`. Without
 * this check, the journal stays at 17 entries, the `drizzle-kit
 * migrate` step in CI silently ignores 0018, and the schema change
 * never lands in staging or prod. That's exactly the silent-failure
 * mode this whole migration pipeline is supposed to prevent — we want
 * a loud failure at PR time.
 *
 * Run via: `pnpm --filter @lewis/db migrate:journal:check`
 * Wired into: api-ci.yml (TODO when this lands)
 */

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildJournal, serializeJournal } from "./regenerate-migration-journal.js";

// Anchor to this script's location so cwd doesn't matter — works the
// same when invoked via `pnpm --filter @lewis/db migrate:journal:check`
// (cwd=packages/db) or directly via tsx from any other cwd.
const scriptDir = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  const migrationsDir = resolve(scriptDir, "..", "migrations");
  const journalPath = join(migrationsDir, "meta", "_journal.json");

  const expected = serializeJournal(await buildJournal(migrationsDir));

  let actual: string;
  try {
    actual = await readFile(journalPath, "utf8");
  } catch {
    console.error(
      `migrations/meta/_journal.json is missing.\n` +
        `Run: pnpm --filter @lewis/db migrate:journal\n` +
        `Then commit migrations/meta/_journal.json.`,
    );
    process.exit(1);
  }

  if (actual !== expected) {
    console.error(
      `migrations/meta/_journal.json is out of sync with migrations/*.sql.\n\n` +
        `This usually means a new SQL migration file was added without\n` +
        `regenerating the journal. Fix:\n\n` +
        `  pnpm --filter @lewis/db migrate:journal\n` +
        `  git add packages/db/migrations/meta/_journal.json\n\n` +
        `If you intentionally edited the journal by hand, the regenerator\n` +
        `is the source of truth — re-run it and commit the result.`,
    );
    process.exit(1);
  }

  console.warn(
    `migrations/meta/_journal.json is in sync (${expected.split("\n").length - 2} lines).`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`check-migration-journal failed: ${message}`);
  process.exit(1);
});
