import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildJournal, serializeJournal } from "./regenerate-migration-journal.js";

let workDir = "";

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), "lewis-journal-test-"));
});

afterEach(async () => {
  if (workDir) {
    await rm(workDir, { recursive: true, force: true });
    workDir = "";
  }
});

async function writeMigration(name: string, body = "-- noop\n"): Promise<void> {
  await mkdir(workDir, { recursive: true });
  await writeFile(join(workDir, name), body, "utf8");
}

describe("buildJournal", () => {
  it("produces one entry per .sql file in filename order", async () => {
    await writeMigration("0001_alpha.sql");
    await writeMigration("0002_beta.sql");
    await writeMigration("0003_gamma.sql");

    const journal = await buildJournal(workDir);

    expect(journal.version).toBe("7");
    expect(journal.dialect).toBe("postgresql");
    expect(journal.entries.map((e) => e.tag)).toEqual(["0001_alpha", "0002_beta", "0003_gamma"]);
    expect(journal.entries.map((e) => e.idx)).toEqual([0, 1, 2]);
    for (const entry of journal.entries) {
      expect(entry.version).toBe("7");
      expect(entry.breakpoints).toBe(true);
    }
  });

  it("emits monotonically increasing 'when' timestamps", async () => {
    await writeMigration("0001_a.sql");
    await writeMigration("0002_b.sql");
    await writeMigration("0003_c.sql");

    const journal = await buildJournal(workDir);
    const whens = journal.entries.map((e) => e.when);

    for (let i = 1; i < whens.length; i++) {
      const prev = whens[i - 1];
      const curr = whens[i];
      expect(prev).toBeDefined();
      expect(curr).toBeDefined();
      expect(curr).toBeGreaterThan(prev as number);
    }
  });

  it("is deterministic — repeated runs produce byte-identical output", async () => {
    await writeMigration("0001_a.sql");
    await writeMigration("0002_b.sql");

    const first = serializeJournal(await buildJournal(workDir));
    const second = serializeJournal(await buildJournal(workDir));

    expect(first).toBe(second);
  });

  it("preserves earlier entries when a new migration is appended", async () => {
    await writeMigration("0001_a.sql");
    await writeMigration("0002_b.sql");
    const before = await buildJournal(workDir);

    await writeMigration("0003_c.sql");
    const after = await buildJournal(workDir);

    // The first two entries must be byte-identical to the first run, so
    // adding a migration never changes the journal entry of an
    // already-applied migration (which would either churn the diff or,
    // worse, suggest to drizzle that the migration is "new" again).
    expect(after.entries.slice(0, 2)).toEqual(before.entries);
    expect(after.entries[2]?.tag).toBe("0003_c");
  });

  it("ignores non-.sql files in the migrations directory", async () => {
    await writeMigration("0001_a.sql");
    await writeMigration("README.md");
    await writeMigration(".gitkeep", "");

    const journal = await buildJournal(workDir);

    expect(journal.entries.map((e) => e.tag)).toEqual(["0001_a"]);
  });

  it("rejects malformed filenames", async () => {
    await writeMigration("not_a_migration.sql");

    await expect(buildJournal(workDir)).rejects.toThrow(/expected.*<NNNN>_<snake_name>\.sql/);
  });

  it("rejects gaps in the migration sequence", async () => {
    await writeMigration("0001_a.sql");
    await writeMigration("0003_c.sql");

    await expect(buildJournal(workDir)).rejects.toThrow(/ordering broken/);
  });

  it("rejects empty migrations directory", async () => {
    await mkdir(workDir, { recursive: true });

    await expect(buildJournal(workDir)).rejects.toThrow(/No \.sql files found/);
  });
});

describe("serializeJournal", () => {
  it("ends with a trailing newline (matches drizzle-kit generate)", async () => {
    await writeMigration("0001_a.sql");
    const journal = await buildJournal(workDir);

    const serialized = serializeJournal(journal);

    expect(serialized.endsWith("\n")).toBe(true);
  });

  it("uses two-space indentation", async () => {
    await writeMigration("0001_a.sql");
    const journal = await buildJournal(workDir);

    const serialized = serializeJournal(journal);

    // First nested level is the entry under "entries" — should be 4 spaces
    // (two levels deep at 2-space indent each).
    expect(serialized).toContain('\n  "version":');
    expect(serialized).toContain('\n  "dialect":');
    expect(serialized).toContain('\n  "entries":');
  });
});
