# Changelog

All notable changes to Corridor are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to a 4-digit version format: `MAJOR.MINOR.PATCH.MICRO`.

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
