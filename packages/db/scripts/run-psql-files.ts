import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

import { Pool } from "pg";

import { databaseUrlFromConfig, resolveMigrationDatabaseConnectionConfig } from "../src/config.js";

const databaseUrl = databaseUrlFromConfig(resolveMigrationDatabaseConnectionConfig());

async function expandSqlTargets(targets: string[]): Promise<string[]> {
  const files: string[] = [];

  for (const target of targets) {
    const absoluteTarget = resolve(target);
    const targetStat = await stat(absoluteTarget);

    if (targetStat.isDirectory()) {
      const directoryFiles = await readdir(absoluteTarget);
      files.push(
        ...directoryFiles
          .filter((file) => file.endsWith(".sql"))
          .sort()
          .map((file) => join(absoluteTarget, file)),
      );
      continue;
    }

    files.push(absoluteTarget);
  }

  return files;
}

async function runSqlFile(pool: Pool, file: string): Promise<void> {
  console.warn(`Applying SQL file: ${file}`);
  const sql = await readFile(file, "utf8");
  await pool.query(sql);
}

async function main(): Promise<void> {
  const targets = process.argv.slice(2);
  if (targets.length === 0) {
    throw new Error("Pass at least one SQL file or directory.");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const files = await expandSqlTargets(targets);

  try {
    for (const file of files) {
      await runSqlFile(pool, file);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown SQL runner error";
  console.error(message);
  process.exit(1);
});
