# Developer Onboarding Runbook

1. Install `mise`.
2. Install Docker Desktop or another Docker Compose v2-compatible engine.
3. Install `fnox` and `age` (`brew install fnox age` on macOS).
4. Run `mise install`.
5. Generate an age key: `age-keygen -o ~/.config/lewis-age-maintainer.key`.
6. Share the public key with the founding product owner for `fnox.toml`.
7. Run `mise run install`.
8. Copy `env/.env.local.example` to `.env.local`.
9. Start local infrastructure with `mise run dev:infra`.
10. Run `mise run db:migrate` and `mise run db:seed`. This applies migrations as the local migration owner, then configures the `app_api` and `app_worker` runtime roles used by the API and workers.
11. Use `mise run dev` for the full local stack or run individual `dev:*` tasks.
12. Run `mise run ci` before opening a PR.

Do not create plaintext `.env` files containing secrets. Use `fnox` profiles for local and CI secrets; staging and production secrets live in the hosting providers.

See [local-development.md](local-development.md) for ports, health checks, reset commands, and the API/worker startup model.
