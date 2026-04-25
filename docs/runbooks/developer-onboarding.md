# Developer Onboarding Runbook

1. Install `mise`.
2. Install Docker Desktop or another Docker Compose v2-compatible engine.
3. Run `mise install`.
4. Generate an age key: `age-keygen -o ~/.config/age/key.txt`.
5. Share the public key with the founding product owner for `fnox.toml`.
6. Run `mise run install`.
7. Copy `.env.local.example` to `.env.local`.
8. Start local infrastructure with `mise run dev:infra`.
9. Run `mise run db:migrate` and `mise run db:seed`.
10. Use `mise run dev` for the full local stack or run individual `dev:*` tasks.
11. Run `mise run ci` before opening a PR.

Do not create plaintext `.env` files containing secrets. Use `fnox` profiles for local and CI secrets; staging and production secrets live in the hosting providers.

See [local-development.md](local-development.md) for ports, health checks, reset commands, and the API/worker startup model.
