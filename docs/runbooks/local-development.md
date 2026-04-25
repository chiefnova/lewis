# Local Development Runbook

Corridor local development uses Docker for infrastructure and host-run Node processes for the API, workers, and frontends.

## Prerequisites

1. Install Docker Desktop or another Docker Compose v2-compatible engine.
2. Install `mise`.
3. Run `mise install`.
4. Run `mise run install`.
5. Copy `.env.local.example` to `.env.local`.

`.env.local` is for safe local defaults only. Provider secrets still come from `fnox` profiles or hosting-provider env vars. Do not place production secrets or PHI in plaintext env files.

## Ports

| Service | URL |
| --- | --- |
| Staff/business app | `http://127.0.0.1:13000` |
| API | `http://127.0.0.1:13001` |
| Patient app | `http://127.0.0.1:13002` |
| Postgres | `127.0.0.1:15432` |
| Redis | `127.0.0.1:16379` |

Host-run processes use `DATABASE_URL=postgres://corridor:corridor@127.0.0.1:15432/corridor_dev` and `REDIS_URL=redis://127.0.0.1:16379`. If a future containerized API or worker is added, use Docker service hostnames through `DB_HOST=postgres` and `REDIS_HOST=redis`.

The default host ports intentionally avoid common local ports and the Navwise Broker defaults. If any are still occupied, set `LOCAL_POSTGRES_PORT` or `LOCAL_REDIS_PORT` in `.env.local` and update `DATABASE_URL` or `REDIS_URL` to match. `mise` loads `.env.local` before running Docker Compose tasks.

## First Boot

```sh
mise run dev:infra
mise run db:migrate
mise run db:seed
```

`dev:infra` starts Docker Postgres and Redis. `db:migrate` applies SQL migrations. `db:seed` inserts synthetic local tenants, users, relationships, and a draft program.

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
