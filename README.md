# Lewis

Operating platform for Montana Experimental Treatment Center workflows.

## Local Development

Use the documented Docker-backed path:

```sh
mise install
mise run install
cp env/.env.local.example .env.local
mise run dev:infra
mise run db:migrate
mise run db:seed
mise run dev
```

`mise run dev` starts Docker Postgres + Redis first, then runs the API, workers, staff/business app (`apps/app`), patient app (`apps/patient`), and the public directory (`apps/directory`). See [docs/runbooks/local-development.md](docs/runbooks/local-development.md) for ports, reset commands, health checks, and local API docs.

Local API and worker processes connect as non-owner `app_api`/`app_worker` DB roles. `mise run db:migrate` uses the local migration owner and provisions those runtime roles so RLS is enforced during development.

Never put real secrets or PHI in `.env.local`, fixtures, logs, or generated artifacts.

## Pre-launch password gate (temporary)

While the apps are being built, all three frontends are gated behind a Vercel Edge Middleware password challenge ([packages/gate/](packages/gate/)). Local dev mirrors production — the gate appears at `mise run dev:*` with a baked-in dev password. To bypass locally, set `LEWIS_GATE_DISABLED=true`. Production env-var setup, dashboard configuration, and the cleanup sequence (when the gate is removed before public launch) live in [packages/gate/README.md](packages/gate/README.md).
