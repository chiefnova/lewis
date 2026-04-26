# Changelog

All notable changes to Corridor are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to a 4-digit version format: `MAJOR.MINOR.PATCH.MICRO`.

## [0.0.3.0] - 2026-04-25

Clerk React SDK upgrade from `@clerk/clerk-react@5.61.3` to `@clerk/react@6.4.5`
across both frontends. Pure dependency migration — no new functionality and no
change to PHI gating semantics.

### Changed

- **Clerk React SDK upgraded to v6.** `apps/app` and `apps/patient` both moved from `@clerk/clerk-react@5.61.3` to `@clerk/react@6.4.5`. Imports renamed across [apps/app/src/main.tsx](apps/app/src/main.tsx), [apps/app/src/auth/RequireStaffPortal.tsx](apps/app/src/auth/RequireStaffPortal.tsx), [apps/app/src/auth/StaffHomeRedirect.tsx](apps/app/src/auth/StaffHomeRedirect.tsx), [apps/app/src/auth/NoAssignedPortal.tsx](apps/app/src/auth/NoAssignedPortal.tsx), [apps/patient/src/main.tsx](apps/patient/src/main.tsx), and [apps/patient/src/auth/RequirePatientSession.tsx](apps/patient/src/auth/RequirePatientSession.tsx).
- **`<SignedIn>` / `<SignedOut>` replaced by `<Show when="...">`.** v6 retired the boolean-gate components in favor of a single `<Show>` with a `when` discriminator. Loading-state semantics are identical (`<Show>` returns `null` while Clerk hydrates per its JSDoc), so the patient portal's PHI gate in [RequirePatientSession.tsx](apps/patient/src/auth/RequirePatientSession.tsx) keeps the same safe default.
- **`afterSignOutUrl="/"` consolidated on `<ClerkProvider>`.** Removed from individual `<UserButton>` instances in `RequireStaffPortal` and `NoAssignedPortal`. One source of truth for sign-out destination across both apps.
- **Vitest mocks updated.** `vi.mock("@clerk/clerk-react", ...)` → `vi.mock("@clerk/react", ...)` in [RequireStaffPortal.test.tsx](apps/app/src/auth/RequireStaffPortal.test.tsx), [RequirePatientSession.test.tsx](apps/patient/src/auth/RequirePatientSession.test.tsx), and [RequirePatientSession.a11y.test.tsx](apps/patient/src/auth/RequirePatientSession.a11y.test.tsx). The new mocks render `<Show>` based on a `when` prop discriminator, mirroring the runtime behavior. All 39 frontend unit + a11y tests pass.

### Notes

- `publishableKey` is still passed explicitly to `<ClerkProvider>` because `@clerk/react@6.4.5`'s TypeScript types declare it required, even though the runtime falls back to `import.meta.env.VITE_CLERK_PUBLISHABLE_KEY` via `withEnvFallback`. Strict TS would otherwise reject the omission.
- `<Show>` exposes a new `treatPendingAsSignedOut` prop for handling pending sessions (MFA-required, tasks-incomplete). This migration does not opt in, preserving v5 default behavior. Revisit when MFA is enforced on the patient portal — see TODOS.md.

## [0.0.2.0] - 2026-04-25

Foundation hardening + Sprint 2 auth start. Closes the runtime-role posture
called for in [CLAUDE.md security #1](CLAUDE.md), tightens the RLS surface,
wires Clerk authentication on both frontends, and lands three new CI gates.
Tracks [docs/implementation.md § 2.1](docs/implementation.md) RLS hardening
backlog and the env-vars audit captured in [docs/env-vars.md](docs/env-vars.md).

### Added

- **Runtime DB role enforcement.** `app_api` and `app_worker` non-owner roles created in migration `0011` with `FORCE ROW LEVEL SECURITY` everywhere a tenant-scoped policy lives. `apps/api` and `apps/workers` now assert at boot that they're connected as the expected role; staging and production refuse to start if the role is wrong. `WORKER_ELEVATED=true` selects the privileged worker posture. Test escape hatches `API_RUNTIME_ROLE_OPT_OUT` / `WORKER_RUNTIME_ROLE_OPT_OUT` exist for unit tests only and are documented as never-set-in-prod.
- **RLS hardening migrations 0011-0017.** Patient representative write hardening (0012), corrected PPA program read direction for ETCs (0013), narrowed global write policy to command scope (0014), patient-table write hardening (0015), global writes restricted to admins (0016), supporting indexes for RLS predicates (0017). Each migration paired with semantic SQL coverage in `packages/db/test/rls/` (new harness `0000` + `0003`-`0007`). `0001`/`0002`/`0008` rewritten in place to match the tightened policies and the new `app.can_write_for_tenant` signature.
- **Clerk authentication on both frontends.** `apps/app` and `apps/patient` now render `ClerkProvider` and gate routes through portal-aware guards. `apps/app/src/auth/RequireStaffPortal.tsx` resolves the active portal from JWT `publicMetadata`, with redirect helpers (`StaffHomeRedirect`, `NoAssignedPortal`). `apps/patient/src/auth/RequirePatientSession.tsx` gates the patient experience and ships an a11y test alongside the unit test. Both apps gain `vite-env.d.ts` so `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_BASE_URL`, and friends are type-checked at compile time.
- **Shared Clerk metadata schemas.** `packages/shared/src/clerk-metadata.ts` defines zod schemas for the `publicMetadata` / `privateMetadata` shape Corridor stores on Clerk users (`active_tenant_id`, `role`, `support_ticket_id`). One source of truth for JWT-claim validation across API and frontends.
- **Three CI drift gates.** `secrets:profiles:check` asserts `SUPABASE_SERVICE_ROLE_KEY` lives only in `workers_elevated_dev`. `contracts:openapi:check` asserts `apps/api/src/openapi.ts` paths match the live Hono route graph. `config:local-defaults:check` asserts `env/.env.local.example`, `docker-compose.yml` ports, and the database client defaults all agree. All three wire into [api-ci.yml](.github/workflows/api-ci.yml) and [pr.yml](.github/workflows/pr.yml).
- **End-to-end env-var tracker.** [docs/env-vars.md](docs/env-vars.md) documents every env var across `apps/api`, `apps/workers`, `apps/workers-elevated`, `apps/app`, `apps/patient`, `packages/db`, and CI. Includes sprint-timing matrix, gap closure log, source-code reference table, and onboarding/offboarding playbook for fnox recipients.
- **Local runtime-role provisioning.** `packages/db/scripts/setup-local-runtime-roles.ts` provisions `app_api` and `app_worker` against a local Postgres with the right grants. `packages/db/scripts/_local-safety.ts` gates seed/reset operations behind a hard "is this localhost" check; `CORRIDOR_SEED_ALLOW_NON_LOCAL` is documented as a deliberate trap, not an override.
- **`apps/workers/src/database-env.ts`** centralizes worker DB env parsing with `.test.ts` coverage so `WORKER_DATABASE_URL` / `WORKER_DB_*` semantics live in one place.

### Changed

- **fnox.toml restructured to 2.x format.** Migrated from legacy `[[recipients]]` + `[profiles.*] secrets = [...]` to `[providers.age]` + per-profile `[profiles.*.secrets]` per-key. Restored `RESEND_WEBHOOK_SECRET` to the `api_dev` profile (it was dropped mid-restructure; re-aligned with `env/.env.api.example` for Sprint 4 wiring).
- **Env templates moved to `env/`.** The six `.env.*.example` templates now live in `env/` with documented headers explaining what each is, who reads it (fnox profile vs `.env.local` vs Vercel/Railway), and where the real values come from. The redundant `env/.env.example` (a 3-line subset of `.env.local.example` with no consumers) was deleted.
- **CI workflow Postgres URL.** `.github/workflows/api-ci.yml` and `.github/workflows/pr.yml` switched from the old `54322`-port `DATABASE_URL` to the matching `app_api`/`15432` runtime URL plus `MIGRATION_DATABASE_URL` and `REDIS_URL`. RLS semantic tests now run on CI against the same Docker Postgres that `db:up` brings up, replacing the previous "skipped on CI" workaround.
- **OpenAPI spec regenerated.** `apps/api/src/openapi.ts` re-emitted from the current Hono route graph; `contracts:openapi:check` now keeps it honest going forward.

### Fixed

- **Five env-var code-vs-config gaps.** `WORKER_ELEVATED`, `WORKER_RUNTIME_ROLE_OPT_OUT`, `API_RUNTIME_ROLE_OPT_OUT`, `CORRIDOR_SEED_ALLOW_NON_LOCAL`, and `RESEND_WEBHOOK_SECRET` were referenced in source but undeclared in any template or fnox profile. All five are now documented in their respective `env/.env.*.example` files and (where applicable) the matching fnox profile.

## [0.0.1.0] - 2026-04-25

Sprint 1 (Foundation) per [docs/implementation.md § 0.2](docs/implementation.md).
Establishes tenancy, RLS, audit, auth, storage, and the API security backbone.
Closes the original `/review` pass (12 critical + 18 informational findings) and
the principal-engineer remediation backlog Sprint-1 items (§ 2.1.1 patient
representatives + minor assents schema, § 2.2.1 pgTAP coverage).

### Added

- **Multi-tenant foundation.** Postgres 15+ schema with 27 RLS-enabled tables. Transaction-local `app.user_id` / `app.active_tenant_id` / `app.request_id` / `app.role` / `app.support_ticket_id` session variables drive every read/write policy. Helpers: `app.is_tenant_member`, `app.has_tenant_relationship`, `app.has_active_support_grant`, `app.shares_tenant_with`, `app.has_active_consent_for_sponsor`, `app.role_grants_action`, `app.can_write_for_tenant`, `app.write_audit`, `app.compute_retention`, `app.refuse_premature_delete`, `app.refuse_truncate`, `app.current_role`.
- **Append-only audit log.** `audit_log` table with row-level UPDATE/DELETE triggers AND statement-level TRUNCATE trigger AND `REVOKE TRUNCATE FROM PUBLIC`. NOT NULL `tenant_id` with system-events sentinel (`00000000-0000-4000-8000-00000000C0DE`) for system rows. `app.write_audit()` SECURITY DEFINER helper is the authoritative write path.
- **Retention enforcement in the database.** `retention_until` columns on `audit_log` (7y) and `file_storage_objects` (5y for regulated, 90d for transient). BEFORE INSERT triggers auto-populate; BEFORE DELETE triggers raise on premature delete; BEFORE TRUNCATE blocks truncate. Pattern documented for ETRB (5y) + QAPI (3y) tables when they land.
- **Patient representatives + minor assents.** `patient_representatives` table with relationship_type enum (self / caregiver / legal_guardian / parent_guardian / provider_proxy), authority_basis + verification, granular access_scope text array, signing/messaging permissions, effective/expires/revoked dates. `minor_assents` table with assent_status (collected / declined / waived / not_applicable), waiver_reason + medical_director check constraint. Sprint 1 schema foundation per implementation.md § 2.1.1.
- **Hono API server with Clerk auth + tenant resolution.** Three composable middlewares: `requireClerkAuth` (verifies Clerk session JWT), `resolveTenant` (looks up Corridor user_id + role from `tenant_memberships` against `x-corridor-tenant-id` header), `withDbContext` (per-request transaction with `app.*` session vars set, COMMIT on 2xx, ROLLBACK otherwise).
- **Webhook signature verification.** `/v1/webhooks/{clerk,stripe,plaid,resend}` reject unsigned requests. Clerk + Resend use Svix three-header scheme; Stripe uses official SDK `webhooks.constructEvent`; Plaid implements full ES256 JWT verification with cached verification keys, body-hash check via `timingSafeEqual`, and 5-minute replay window.
- **API security middleware stack.** `secureHeaders` (HSTS, strict CSP, X-Frame-Options DENY, Referrer-Policy no-referrer), CORS allowlist sourced from `CORS_ALLOWED_ORIGINS` env (boot-fails if missing in non-test), 1MB body limit, Redis-backed rate limiter with four layered scopes (public 600/min/IP, readyz 60/min/IP, webhooks 120/min/IP, authed 6000/min/tenant), Redis-backed `Idempotency-Key` middleware (24h TTL, fingerprints `(method, path, body sha256)`, 409 on key reuse with different body).
- **Role enforcement on internal-admin.** `requireRole("corridor_admin")` middleware + `X-Support-Ticket-Id` header validation + `app.write_audit()` row written in the same transaction per CLAUDE.md break-glass posture.
- **OpenAPI 3.1 surface.** `/v1/openapi.json` (cached after first build) + `/v1/docs` (Scalar API reference UI). Schemas registered via `@asteasolutions/zod-to-openapi`; paths block hand-authored covering every current endpoint with `ClerkBearer` security, tenant header, pagination params, standard error envelope refs.
- **Cursor pagination contract.** `CursorPageQuery` + `cursorPage<T>` helpers in `packages/shared`. Every list endpoint validates `?cursor` + `?limit` and returns `{ items, nextCursor, hasMore }`.
- **Shared API schema package.** `packages/shared/src/api/`: errors (canonical `ErrorResponse` envelope + `ErrorCode` enum + `HTTP_STATUS_BY_CODE` map), pagination, branded UUID types (`SponsorId`, `EtcId`, `PatientId`, `BoardId`, `TenantId`, `UserId`, `ProgramId`), `RequestId` + `SupportTicketId` regex schemas, per-domain request/response schemas, `AppContextSchema` with branded UUIDs + `TenantRole` enum.
- **Service layer pattern.** Every domain has `apps/api/src/domains/<x>/service.ts` taking `(client: PoolClient, ctx: AppContext, params)`. Routes are thin: validate → service → respond. Sprint markers reference `docs/implementation.md § 0.2`.
- **Structured pino logger.** `apps/api/src/logger.ts` + `apps/workers/src/logger.ts` with PHI-aware formatters (`redactPhi` last-line defense, structured field-based logging primary). Pretty-print in dev, JSON in prod, silent in test. ESLint rule + CI gate ban `console.*` in `apps/api/src/**` and `apps/workers/src/**`.
- **Stripe/Plaid/Clerk/Resend webhook scaffolding.** Routes verify signatures and return canonical `not_implemented` (501) until handlers land in later sprints.
- **TODOS.md backlog.** Full PRD remediation backlog (implementation.md § 2.1 + § 2.2) folded in, organized by sprint phase. Phase 0 / parallel tracks (counsel + ops) flagged.
- **Migrations 0001-0010** establishing the foundation: security primitives, regulatory primitives, audit immutability, architecture stubs, search foundation, RLS relationship helpers, retention enforcement, write policies, audit helpers + tightening, patient representatives + minor assents.
- **pgTAP coverage.** `0001_foundation.sql` (basic) + `0002_helpers_policies_retention.sql` (38 plan items) covering all helpers, rewritten policies, retention triggers, new tables, and NULL-tenant tightening. `pnpm rls:coverage` static check verifies every RLS-enabled table has SELECT + write policies.
- **CI gates.** `.github/workflows/api-ci.yml` extended with: `Not Implemented` ban (webhooks exempt), `auth.jwt()` ban, `service_role` ban, `SUPABASE_SERVICE_ROLE_KEY` ban in app code, webhooks-must-verify, `/v1`-must-have-auth, RLS write-policy coverage, `fnox.toml` placeholder ban, `console.*` backstop.
- **Environment hygiene.** `.env.api.example` expanded with full middleware vocabulary; `SUPABASE_SERVICE_ROLE_KEY` removed from API runtime env. `.env.workers-elevated.example` documents the dedicated elevated-worker profile that holds the service-role key for narrow bypass operations.

### Changed

- **Patient RLS policies widened.** `patients_self_read` now includes ETC care-team relationship and consented-sponsor predicate. `programs_sponsor_read` now includes ETCs with PPA. `users_self_or_tenant_read` rewritten to use SECURITY DEFINER helper (eliminates recursive policy evaluation).
- **`payment_obligations.amount_cents` and `payment_transactions.amount_cents`** changed from `integer` (max ~$21.4M) to `bigint` so experimental therapies and HFAR allocations don't overflow.
- **`/v1/patient` → `/v1/patients`** for plural consistency with sibling routes.
- **`onError` handler** uses canonical `ErrorResponse` envelope and logs structured `{requestId, route, method, message, stack}` server-side.
- **`notifications` + `feature_flags` NULL-tenant policies** tightened to require `app.current_user_id() IS NOT NULL` for global rows.

### Removed

- **`sponsor_organizations.tax_id_encrypted`** column dropped. No KMS strategy exists yet; safer to remove than to ship plaintext bytes labeled "encrypted." Re-add via forward migration when KMS lands.
- **`/v1/health`** removed. Convention: unversioned `/healthz` (cheap liveness) + `/readyz` (DB+Redis check).

### Fixed

- **Inbound `x-request-id` header validated** with `^[A-Za-z0-9_-]{8,128}$` regex (eliminates CR/LF log injection vector).
- **`audit_log` TRUNCATE protection** added (row-level triggers don't fire on TRUNCATE in Postgres — separate statement-level trigger needed).
- **`patients` and `patient_data_sharing_consents`** missing `jurisdiction_id` (regulated tables per `.claude/rules/database.md` rule 4).
- **`ENABLE_STUB_WORKERS`** hard-gated on `NODE_ENV !== 'production'` so a misconfigured prod env can't silently no-op every BullMQ job.
- **`seed-dev.ts`** refuses to run unless `NODE_ENV in {development, test}` AND `DATABASE_URL` host is in the local-only allowlist.

### Known follow-ups

- Real query implementations behind every `TODO(sprint-N)` marker in service files land sprint-by-sprint per the PRD plan (Sprint 2 sponsor onboarding next).
- `fnox.toml` `[[recipients]]` placeholder keys must be replaced with real maintainer + CI age public keys before any secret is encrypted (CI gate enforces).
- `pgTAP 0002` requires Docker postgres up to execute (`mise run db:rls:test`); static `rls:coverage` check passes in CI without it.
- Phase 0 / parallel tracks (counsel for AE clock basis + legal content versioning, ops for subprocessor classification) are tracked in `TODOS.md` and need to be moving in parallel with Sprint 2 engineering.
