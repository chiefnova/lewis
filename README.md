# Corridor

Operating platform for Montana Experimental Treatment Center workflows.

## Local Development

Use the documented Docker-backed path:

```sh
mise install
mise run install
cp .env.local.example .env.local
mise run dev:infra
mise run db:migrate
mise run db:seed
mise run dev
```

`mise run dev` starts Docker Postgres + Redis first, then runs the API, workers, staff/business app, and patient app. See [docs/runbooks/local-development.md](docs/runbooks/local-development.md) for ports, reset commands, health checks, and local API docs.

Never put real secrets or PHI in `.env.local`, fixtures, logs, or generated artifacts.
