/**
 * CI gate: keep the bundled local-development defaults in lockstep across
 * docker-compose.yml, the env/.env.* examples, the GitHub Actions workflows,
 * and packages/db/src/local-defaults.ts. The TypeScript module is the source
 * of truth; this script reads each non-TS consumer and asserts the canonical
 * port + credential pair appears verbatim.
 *
 * Run via: node scripts/check-local-defaults.mjs
 */

import { readFileSync } from "node:fs";

// Mirror packages/db/src/local-defaults.ts. Keep these in sync when the TS
// source changes — the assertion below catches any drift in consumers.
const CANONICAL = {
  postgresPort: 15432,
  redisPort: 16379,
  bootstrapUser: "corridor",
  bootstrapPassword: "corridor",
  dbName: "corridor_dev",
  apiUser: "app_api",
  apiPassword: "corridor_app_api",
  workerUser: "app_worker",
  workerPassword: "corridor_app_worker",
};

const apiUrl = `postgres://${CANONICAL.apiUser}:${CANONICAL.apiPassword}@127.0.0.1:${CANONICAL.postgresPort}/${CANONICAL.dbName}`;
const migrationUrl = `postgres://${CANONICAL.bootstrapUser}:${CANONICAL.bootstrapPassword}@127.0.0.1:${CANONICAL.postgresPort}/${CANONICAL.dbName}`;
const redisUrl = `redis://127.0.0.1:${CANONICAL.redisPort}`;

const checks = [
  // The TS source of truth itself — verify the CANONICAL above hasn't drifted.
  {
    file: "packages/db/src/local-defaults.ts",
    mustContain: [
      `LOCAL_POSTGRES_PORT_DEFAULT = ${CANONICAL.postgresPort}`,
      `LOCAL_REDIS_PORT_DEFAULT = ${CANONICAL.redisPort}`,
      `LOCAL_APP_API_DB_PASSWORD_DEFAULT = "${CANONICAL.apiPassword}"`,
      `LOCAL_APP_WORKER_DB_PASSWORD_DEFAULT = "${CANONICAL.workerPassword}"`,
      `LOCAL_DB_NAME = "${CANONICAL.dbName}"`,
    ],
  },
  // docker-compose.yml: bootstrap credentials + port mapping. Ports are
  // parametrized via LOCAL_POSTGRES_PORT / LOCAL_REDIS_PORT with defaults that
  // must equal the TS canonical values.
  {
    file: "docker-compose.yml",
    mustContain: [
      `POSTGRES_USER: ${CANONICAL.bootstrapUser}`,
      `POSTGRES_PASSWORD: ${CANONICAL.bootstrapPassword}`,
      `POSTGRES_DB: ${CANONICAL.dbName}`,
      `LOCAL_POSTGRES_PORT:-${CANONICAL.postgresPort}`,
      `LOCAL_REDIS_PORT:-${CANONICAL.redisPort}`,
    ],
  },
  // env/.env.api.example: API runtime DSN matches CANONICAL.
  {
    file: "env/.env.api.example",
    mustContain: [`DATABASE_URL=${apiUrl}`, `MIGRATION_DATABASE_URL=${migrationUrl}`],
  },
  // env/.env.workers.example: regular-worker DSN.
  {
    file: "env/.env.workers.example",
    mustContain: [
      `${CANONICAL.workerUser}:${CANONICAL.workerPassword}@127.0.0.1:${CANONICAL.postgresPort}/${CANONICAL.dbName}`,
    ],
  },
  // GitHub Actions workflows: job-level env DSN.
  {
    file: ".github/workflows/api-ci.yml",
    mustContain: [
      `DATABASE_URL: ${apiUrl}`,
      `MIGRATION_DATABASE_URL: ${migrationUrl}`,
      `REDIS_URL: ${redisUrl}`,
    ],
  },
  {
    file: ".github/workflows/pr.yml",
    mustContain: [
      `DATABASE_URL: ${apiUrl}`,
      `MIGRATION_DATABASE_URL: ${migrationUrl}`,
      `REDIS_URL: ${redisUrl}`,
    ],
  },
];

const failures = [];

for (const check of checks) {
  let content;
  try {
    content = readFileSync(check.file, "utf8");
  } catch (error) {
    failures.push(
      `${check.file}: could not read (${error instanceof Error ? error.message : error})`,
    );
    continue;
  }

  for (const needle of check.mustContain) {
    if (!content.includes(needle)) {
      failures.push(`${check.file}: missing canonical literal:\n      ${needle}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Local defaults drift check FAILED:");
  for (const f of failures) console.error(`  ${f}`);
  console.error(
    "\nThe canonical defaults live in packages/db/src/local-defaults.ts. Update consumers (env/.env.* examples, docker-compose.yml, .github/workflows/*.yml) to match, then update CANONICAL in scripts/check-local-defaults.mjs to match the TS source.",
  );
  process.exit(1);
}

console.warn(
  `Local defaults drift check PASSED: ${checks.length} files in lockstep with packages/db/src/local-defaults.ts.`,
);
