# Local Development Runbook

Lewis local development uses Docker for infrastructure and host-run Node processes for the API, workers, and frontends.

## Prerequisites

1. Install Docker Desktop or another Docker Compose v2-compatible engine.
2. Install `mise`.
3. Run `mise install`.
4. Run `mise run install`.
5. Copy `env/.env.local.example` to `.env.local`.

`.env.local` is for safe local defaults only. Provider secrets still come from `fnox` profiles or hosting-provider env vars. Do not place production secrets or PHI in plaintext env files.

## Ports

| Service | URL |
| --- | --- |
| Staff/business app | `http://127.0.0.1:13000` |
| API | `http://127.0.0.1:13001` |
| Patient app | `http://127.0.0.1:13002` |
| Postgres | `127.0.0.1:15432` |
| Redis | `127.0.0.1:16379` |

Host-run processes use split DB roles so local development exercises the same RLS boundary as production:

- API runtime: `DATABASE_URL=postgres://app_api:lewis_app_api@127.0.0.1:15432/lewis_dev`
- Worker runtime: `WORKER_DATABASE_URL=postgres://app_worker:lewis_app_worker@127.0.0.1:15432/lewis_dev`
- Migration and seed: `MIGRATION_DATABASE_URL=postgres://lewis:lewis@127.0.0.1:15432/lewis_dev`
- Redis: `REDIS_URL=redis://127.0.0.1:16379`

`app_api` and `app_worker` are non-owner `NOBYPASSRLS` roles. `mise run db:migrate` applies SQL migrations as the local migration owner and then provisions local-only passwords for the runtime roles. If a future containerized API or worker is added, use Docker service hostnames through `DB_HOST=postgres` and `REDIS_HOST=redis`.

The default host ports intentionally avoid common local ports and the Navwise Broker defaults. If any are still occupied, set `LOCAL_POSTGRES_PORT` or `LOCAL_REDIS_PORT` in `.env.local` and update `DATABASE_URL` or `REDIS_URL` to match. `mise` loads `.env.local` before running Docker Compose tasks.

## First Boot

```sh
mise run dev:infra
mise run db:migrate
mise run db:seed
```

`dev:infra` starts Docker Postgres and Redis. `db:migrate` applies SQL migrations, creates/grants `app_api` and `app_worker`, and forces RLS on every RLS-enabled table. `db:seed` inserts synthetic local tenants, users, relationships, and a draft program through the migration connection, not an app runtime role.

## Run Services

Run everything:

```sh
mise run dev
```

Run individual processes:

```sh
mise run dev:api
mise run dev:workers
mise run dev:app
mise run dev:patient
```

The API and workers both verify Postgres and Redis at startup. The worker runtime registers `notifications`, `pdf`, and `compliance` BullMQ processors. These processors are scaffold handlers and are allowed by default only in local/test; non-local stub execution requires `ENABLE_STUB_WORKERS=true`.

## Verify Health

```sh
curl -sS http://127.0.0.1:13001/healthz
curl -sS http://127.0.0.1:13001/readyz
```

`/healthz` is liveness. `/readyz` checks Postgres with `select 1` and Redis with `PING`.

The generated API contract is available locally at `http://127.0.0.1:13001/v1/openapi.json`, with Scalar docs at `http://127.0.0.1:13001/v1/docs`.

## Reset Or Stop

Stop infrastructure and dev processes:

```sh
mise run down
```

Stop only Postgres:

```sh
mise run db:down
```

Wipe local Docker volumes, re-run migrations, and re-seed synthetic data:

```sh
mise run db:reset
```

## Adding A New Migration

Lewis uses raw SQL migrations under `packages/db/migrations/` (filenames `<NNNN>_<snake_name>.sql`, sequential). The local and cloud apply paths are deliberately different:

- **Local dev** (`mise run db:migrate`) wraps `pnpm --filter @lewis/db migrate:local`, which runs `migrate:sql` (a thin psql wrapper applying every file unconditionally) plus `setup:local-roles`. Designed for ephemeral Docker volumes — `db:reset` wipes and reapplies cleanly each time.
- **Staging / production** uses `drizzle-kit migrate` invoked from GitHub Actions (`deploy-staging.yml`, `deploy-prod.yml`). It tracks applied migrations in the `drizzle.__drizzle_migrations` table and skips ones already recorded. Idempotent across re-runs.

When you add a SQL file, both paths must stay in sync:

```sh
# 1. Author the new migration file
$EDITOR packages/db/migrations/0018_<feature>.sql

# 2. Regenerate the journal so drizzle-kit migrate sees the new entry
pnpm --filter @lewis/db migrate:journal

# 3. Apply locally to verify it parses + behaves as intended
mise run db:reset

# 4. Add an RLS test if the migration touches policies (CLAUDE.md security #1)
$EDITOR packages/db/test/rls/<NNNN>_<descriptive>.sql
mise run db:rls:test

# 5. Commit BOTH the SQL file and the regenerated journal
git add packages/db/migrations/0018_<feature>.sql packages/db/migrations/meta/_journal.json
```

CI gate `migrate:journal:check` (in `api-ci.yml`) compares the disk journal byte-for-byte against what the regenerator would produce. Skipping step 2 fails the PR with a one-command fix message — you cannot accidentally ship a migration that the cloud applier silently skips.

The migration command on staging/prod requires `MIGRATION_DATABASE_URL` (the Supabase session-pooler URL with the `postgres` schema-owner role). It is held only by the GitHub Actions runner via env-scoped secrets and is intentionally absent from every Railway service env per CLAUDE.md security #1.
