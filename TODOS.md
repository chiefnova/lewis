# TODOS

Backlog seeded by `/review` against the staged scaffold on `staging` (2026-04-25).
Originally 12 critical + 22 informational findings.

**Status update (2026-04-25, sixth pass — informational close-out):** Tooling and CI gates hardened end-to-end. `check-fnox-secret-boundaries.mjs` now uses TOML-key-boundary regex with section-header reset and a positive `workers_elevated_dev` assertion. `check-rls-coverage.ts` tracks DROP POLICY in textual order (caught and verified 5 same-file drop-then-create patterns). `check-openapi-route-drift.mjs` rewritten as a TypeScript-AST walker over `server.ts` + each `domains/*/routes.ts` + `openapi.ts`, with auto-discovery of domain dirs, zero-match assertions per route file, support for `.openapi(...)`, template literals, and Hono path edge cases. New CI gate `config:local-defaults:check` keeps `docker-compose.yml`, env examples, and CI workflow DSNs in lockstep with `packages/db/src/local-defaults.ts` (the new TS source of truth for `lewis_app_api`/`lewis_app_worker` passwords + ports 15432/16379). New `packages/db/src/runtime-role.ts` plus `assertRuntimeRole(...)` wired into both `apps/api/src/index.ts` and `apps/workers/src/index.ts` so each process refuses to start unless `current_user` is the expected non-superuser NOBYPASSRLS role. Shared `_local-safety.ts` extracted between `setup-local-runtime-roles.ts` and `seed-dev.ts` with 11 colocated unit tests. `StaffPortal` types + Clerk metadata constants moved to `@lewis/shared/clerk-metadata`. Test harness `throws_ok` now uses a private SQLSTATE class (XX900) and `is_empty` trims trailing semicolons. New RLS tests 0006 (every RLS table has SELECT/INSERT/UPDATE/DELETE grants for app_api + app_worker) and 0007 (helper hoisting regression — STABLE/IMMUTABLE markers preserved + multi-row UPDATE invokes `current_tenant_member_grants_action` ≤ 4 times). Worker `resolveWorkerDatabaseEnv` extracted with 10 precedence tests. Patient portal wired into a real `test:a11y` task using axe-core (component tests for `RequirePatientSession` + a11y assertions). CI workflows: dropped unconditional `docker compose down -v`, removed step-level `DATABASE_URL` duplication, normalized to mise invocation throughout. Component tests added: 6 for `RequireStaffPortal` (jsdom + `@testing-library/react` + Clerk mock), 4 for `RequirePatientSession`. Total: 76 vitest tests, 4 CI drift gates, 8 RLS test files all green.

**Status update (2026-04-25, fifth pass — same-class hardening close-out):** Migrations 0015 (extend `current_tenant_member_grants_action` requirement to `patients`, `patient_data_sharing_consents`, `patient_device_registry_entries`), 0016 (NULL-tenant writes on `notifications` + `feature_flags` require an active membership whose role grants the action — today lewis*admin only), and 0017 (partial indexes on `tenant_relationships`, `support_access_grants`, `tenant_memberships` to support hot policy expressions) close the same hardening class 0012 named. Migration 0012's new check constraint added as `NOT VALID` then `VALIDATE` for forward deploy safety. Migration 0011 documents the SECURITY DEFINER function-owner contract under FORCE RLS. New RLS test 0005 covers 0015 + 0016 (11 assertions); 0004 extended to 10 assertions (UPDATE/DELETE coverage, self-relationship signing bypass, cross-tenant negative); 0003 extended to 6 assertions (positive read case). Frontend portal access logic extracted to `apps/app/src/auth/portals.ts` with 16 unit tests; staff portals lazy-loaded via `React.lazy` + `<Suspense>`. `setup-local-runtime-roles.ts` now validates passwords against `/^[A-Za-z0-9*-]{8,128}$/`and exports the safety helpers; 25 unit tests cover them.`RequireStaffPortal` denied-redirect loop guard added.

**Status update (2026-04-25, fourth pass):** The foundation now includes CI-gated semantic RLS execution under runtime roles, representative/minor-assent write hardening, frontend Clerk route guards, an OpenAPI drift check, corrected local CORS defaults, and explicit documentation that the Sprint 1 worker queues are scaffold processors until their feature phases.

**Status update (2026-04-25, third pass):** All 12 critical AND all 18
remaining informational findings from the original /review have been
implemented. The scaffold now has full security middleware (CORS, secure-headers,
body-limit, rate-limit, idempotency-key), structured pino logging, OpenAPI
surface at `/v1/openapi.json` + `/v1/docs`, complete write-policy + retention

- audit-helper migrations (0006-0009), service-layer pattern across all
  domains, role enforcement on internal-admin, and 8 CI gates.

See `## Completed` at the bottom for the full list with file/migration
references.

**Open work after this batch:** Real query implementations behind every
`TODO(sprint-N)` marker in the service layer — the scaffold structure is
locked in but actual DB queries land sprint-by-sprint per the PRD.

Sections are organized by component. Within each section, items are sorted P0 first.

---

## Open from /review (sixth pass — residual deferrals, 2026-04-25)

The sixth-pass `/review` close-out (see status update at top) landed every CI/runtime hardening item the fifth-pass review left open: `check-fnox-secret-boundaries` hardening, `check-rls-coverage` DROP POLICY tracking, `assertRuntimeRole` startup checks for API + workers, AST-based OpenAPI drift gate with auto-discovery, `_local-safety.ts` extraction, centralized `local-defaults.ts` + drift gate, `StaffPortal` move to `@lewis/shared`, `throws_ok`/`is_empty` harness fixes, RLS test 0006 (grants assertion) + 0007 (helper hoisting regression), `resolveWorkerDatabaseEnv` extraction + tests, `test:a11y` axe-core scaffold, CI workflow cleanup, jsdom + `@testing-library/react` component tests for `RequireStaffPortal` + `RequirePatientSession`. Two items remain intentionally open:

### Document `publicMetadata.lewisPortals` Clerk metadata contract

**What:** Add a section to `docs/runbooks/developer-onboarding.md` (or a new doc) describing the Clerk publicMetadata shape: `lewisPortals: ('sponsor'|'etc'|'admin')[]` and `lewisDefaultPortal`. Reference the constants in `packages/shared/src/clerk-metadata.ts` and the parallel server-side check that the API will perform via `app.resolve_authenticated_membership`. Note that publicMetadata is server-trusted (Clerk admin only) and is defense-in-depth for UX routing only — backend RLS is the actual gate.

**Why:** The contract is now centralized in code (with JSDoc) but a runbook anchor still helps engineers wiring API tenant resolution off it.

**Effort:** S
**Priority:** P2

### Restrict `resolveMigrationDatabaseConnectionConfig` to migration tooling

**What:** Add an ESLint `no-restricted-imports` rule preventing `apps/api/**` and `apps/workers/**` from importing `resolveMigrationDatabaseConnectionConfig` from `@lewis/db`, OR move the migration helpers into `packages/db/scripts/_migration-config.ts` so they’re physically not in the package’s public exports.

**Why:** The export is module-level public; the new `assertRuntimeRole` startup check catches misconfigured connections, but a static lint rule is cheaper and prevents the wrong import from compiling in the first place.

**Effort:** S
**Priority:** P3

### Decide patient-portal `<Show>` behavior for Clerk pending sessions

**What:** When MFA is enforced on the patient portal (per [b2bprd.md § 18.3](docs/b2bprd.md) and SB 535-aligned posture for PHI handlers), evaluate passing `treatPendingAsSignedOut` on the `<Show when="signed-in">` gate in [apps/patient/src/auth/RequirePatientSession.tsx](apps/patient/src/auth/RequirePatientSession.tsx). Without it, a session that has authenticated but has an outstanding Clerk task (MFA challenge incomplete, account-completion task pending) renders as signed-in and the patient sees PHI before the task resolves.

**Why:** Clerk v6's `<Show>` defaults to treating pending sessions as signed-in for backward compatibility with v5's `<SignedIn>`. That default is fine today (MFA is not enforced yet), but once MFA gating is wired the defense-in-depth answer for PHI surfaces is to treat pending as signed-out. Staff portals (`apps/app`) likely take the same posture.

**Effort:** XS (one prop on each `<Show when="signed-in">` plus tests)
**Priority:** P3 — only matters once MFA is enforced; no PHI exposure today since no real auth flows exist yet.

---

## API (apps/api)

### Add Clerk auth + tenant resolution middleware on /v1

**What:** Build a middleware chain mounted at the `/v1` router that verifies the Clerk session JWT, loads the active Lewis user from `users`, requires an `active_tenant_id` (header or claim), checks `tenant_memberships` for an active membership, and calls `setAppContext({ userId, activeTenantId, requestId })` so RLS sees the right session variables.

**Why:** Right now `apps/api/src/server.ts:78-82` mounts every domain router (sponsors, etcs, patient, boards, admin) with no auth at all. Per `CLAUDE.md` "API requests must resolve an active Lewis tenant ... missing or invalid tenant context is a 401/403, never a silent service-role fallback." Without this middleware, the first real PHI handler that lands inherits zero tenant isolation.

**Context:** `setAppContext` already exists in `packages/db/src/context.ts`. Helpers `app.is_tenant_member`, `app.has_tenant_relationship`, `app.has_active_support_grant` exist in migration 0001 but are unused. Decide: header-based active tenant (`x-lewis-tenant-id`) vs JWT claim. Add a CI grep that fails the build if a `/v1` route is added that doesn't go through the auth-gated router.

**Effort:** L
**Priority:** P0
**Depends on:** None

### Verify webhook signatures on /v1/webhooks/{clerk,stripe,plaid,resend}

**What:** Add signature-verification middleware before each webhook handler (svix for Clerk, `Stripe.webhooks.constructEvent` for Stripe, `Plaid-Verification` header for Plaid, svix for Resend). Until real handlers exist, return `501 Not Implemented` after verification, not `202 ok`.

**Why:** `apps/api/src/server.ts:64-67` currently returns `202 ok` for every unsigned POST. CLAUDE.md gotcha: "Stripe and Plaid webhooks require signature verification before any state change." Even as scaffold stubs, returning success on unsigned requests sets a precedent that the first state-changing handler will inherit.

**Context:** Stripe SDK is in deps; svix and Plaid SDK need to be added. Define `verifyWebhook<T>(provider)` helper that returns the parsed event or throws a 400.

**Effort:** M
**Priority:** P0
**Depends on:** None

### Validate every external input with zod (route-level)

**What:** Wrap every Hono route with `@hono/zod-validator` for `param`, `query`, and `json` (where applicable). Define schemas in `packages/shared/src/api/<domain>/`. Branded UUID schemas for `SponsorId`, `EtcId`, `PatientId`, `BoardId`, `TenantId`.

**Why:** Path params, query strings, and bodies in `apps/api/src/domains/*/routes.ts` and `apps/api/src/server.ts:71` (the `/v1/search` `q` param) are all read with `c.req.param/query/json` without validation. CLAUDE.md "Validate every external input with zod (API requests, webhooks, env vars, form data). Shared schemas live in packages/shared."

**Context:** `@hono/zod-validator` and `zod` are already in deps. Pair this with the OpenAPI surface item below — `@hono/zod-openapi` collapses both into one move.

**Effort:** M
**Priority:** P0
**Depends on:** None

### Fix request_id log injection vector

**What:** `apps/api/src/server.ts` already validates the inbound `x-request-id` header with a regex (auto-fixed during /review). Confirm with a unit test that CR/LF or other control characters are rejected and replaced with `randomUUID()`.

**Why:** Defense-in-depth. The auto-fix patched the code; the test locks the behavior in.

**Context:** Already auto-fixed in this session. Test belongs in `apps/api/src/server.test.ts`.

**Effort:** S
**Priority:** P1
**Depends on:** None

### Define canonical ErrorResponse envelope in packages/shared

**What:** Define `ErrorResponse` zod schema (e.g. `{ code: ErrorCode, message: string, details?: unknown, requestId: string }`), an `ErrorCode` enum (`validation_error`, `unauthenticated`, `forbidden`, `not_found`, `conflict`, `unprocessable`, `rate_limited`, `internal_error`), and a helper that converts `HTTPException` to that shape. Use it in `app.onError`.

**Why:** Today `app.onError` returns `{ error, requestId }` while `HTTPException.getResponse()` returns Hono's default `{ message }` and route handlers return arbitrary success shapes. Without one envelope, the typed client SDK has to per-route narrow.

**Context:** `apps/api/src/server.ts:33-41`. Document HTTP-status-to-code mapping in `packages/shared/src/api/errors.ts`.

**Effort:** M
**Priority:** P1
**Depends on:** None

### Adopt @hono/zod-openapi for the OpenAPI surface

**What:** Migrate the Hono app to `OpenAPIHono`, define routes via `createRoute({ request, responses, ... })`, expose `/v1/openapi.json` and `/v1/docs`. Generates the full OpenAPI surface for free and gives `apps/app` and `apps/patient` a typed fetch client.

**Why:** Cheap to adopt at the scaffold stage with 0 routes; expensive to retrofit after dozens of routes exist with hand-written handlers. Pair with the zod-validation item above to do them together.

**Effort:** M
**Priority:** P1
**Depends on:** zod schemas in packages/shared

### Standardize cursor pagination contract

**What:** Define `CursorPage<T> = { items: T[], nextCursor: string | null, hasMore: boolean }` in `packages/shared`. Validate `?limit` (default 20, max 100) and `?cursor` (opaque string) on every list endpoint.

**Why:** List endpoints in `apps/api/src/domains/etcs/routes.ts:3` and across other domain routes return raw arrays today. Adding cursor pagination later is a breaking change for clients.

**Effort:** M
**Priority:** P1
**Depends on:** packages/shared API schemas

### Rate limiting on the public surface

**What:** Add `hono/rate-limiter` (or `@upstash/ratelimit` on the existing Redis) globally with stricter buckets on `/readyz` and `/v1/webhooks/*`. Token bucket per IP for unauthenticated routes, per tenant for authenticated routes.

**Why:** `/readyz` fans out to DB+Redis and is currently unauthenticated; `/v1/search` is unauthenticated; webhooks need per-provider limits keyed off signature subject. CLAUDE.md TLS+HIPAA posture argues for defense-in-depth.

**Context:** Redis connection already exists in `apps/api/src/redis.ts`.

**Effort:** M
**Priority:** P1
**Depends on:** Auth middleware (so we can key per-tenant)

### Mount CORS + secure-headers + body-size middleware

**What:** Mount `hono/cors` with explicit allowlist (`app.lewis.health`, `patient.lewis.health`, plus dev hosts) sourced from `CORS_ALLOWED_ORIGINS` env (validated with zod at boot). Mount `hono/secure-headers` for HSTS (`max-age=63072000; includeSubDomains; preload`), `Referrer-Policy: no-referrer`, `X-Content-Type-Options`, `X-Frame-Options DENY`. Add a body size limit (1MB default, override per route). Add explicit `Cache-Control: no-store` on every PHI route.

**Why:** `apps/app` and `apps/patient` are separate origins and will be blocked without CORS. HSTS + secure headers are HIPAA defense-in-depth. Body size limit prevents abuse.

**Effort:** M
**Priority:** P1
**Depends on:** None

### Idempotency-Key middleware

**What:** Read `Idempotency-Key` header (zod uuid), look up Redis (24h TTL) for prior response, replay on hit, lock on miss. Document as required on all regulated-write POSTs in the OpenAPI surface.

**Why:** AE reports, ETRB submissions, patient agreements, and payment POSTs MUST be idempotent (CLAUDE.md regulated-record posture). Setting the contract now is cheap.

**Effort:** M
**Priority:** P1
**Depends on:** Redis (already wired), OpenAPI surface

### Internal admin role gate + break-glass enforcement

**What:** Add `requireLewisInternal` middleware on `/v1/admin/*` that asserts `lewis_admin` role + a present `X-Support-Ticket-Id` header, records the access to `audit_log`, and returns 403 otherwise. Until real handlers exist, return 501.

**Why:** `apps/api/src/domains/internal-admin/routes.ts:3` mounts admin routes with no role guard. CLAUDE.md mandates ticket reference + audit log for break-glass admin access.

**Effort:** M
**Priority:** P1
**Depends on:** Auth middleware

### Structured logger + ban console.\* in apps/api and apps/workers

**What:** Adopt `pino` (already in deps) for structured logging that only accepts allow-listed fields (`tenant_id`, `request_id`, `object_type`, `object_id`). Add an eslint rule banning `console.*` in `apps/api` and `apps/workers`. Document that names/addresses must never reach the logger by construction.

**Why:** `redactPhi` (in `packages/shared/src/phi-redaction.ts:6`) only catches emails/phones/SSNs/ISO dates. It will not redact patient names, MRNs, free-text addresses, US-format dates, insurance IDs, or device identifiers. The current redaction wrapper around `hono/logger` and worker error logs gives a false sense of safety.

**Effort:** M
**Priority:** P1
**Depends on:** None

### onError: log stack/route/method server-side

**What:** In `app.onError` (`apps/api/src/server.ts:35`), log structured `{ requestId, route, method, message: redactPhi(error.message), stack }` via the structured logger, then return the redacted client envelope. Forward to Sentry with the requestId tag.

**Why:** Today the stack is dropped; impossible to correlate a 500 to its failing route.

**Effort:** S
**Priority:** P1
**Depends on:** Structured logger

### Service layer per domain

**What:** Add `apps/api/src/domains/<x>/service.ts` per domain that takes `AppContext` and returns typed shapes. Route handlers stay thin: validate → service → respond. Document the rule in `.claude/rules/api.md`.

**Why:** With no abstraction, the first real PHI handler will inline DB queries in routes. Establish the pattern before any feature ships.

**Effort:** M
**Priority:** P2
**Depends on:** None

### Pluralize /v1/patient → /v1/patients

**What:** Rename `v1.route('/patient', patientRoutes)` to `v1.route('/patients', patientRoutes)` in `apps/api/src/server.ts:80`. `patientRoutes.get('/me', ...)` stays.

**Why:** Inconsistent with `/v1/sponsors`, `/etcs`, `/boards`, `/admin`. One-line change now, breaking change after launch.

**Effort:** S
**Priority:** P2
**Depends on:** None

### Deduplicate /healthz and /v1/health

**What:** Remove `v1.get('/health', ...)` (`apps/api/src/server.ts:62`) and document `/healthz` + `/readyz` as the unversioned liveness/readiness contract for Railway and uptime checks.

**Why:** Two contracts diverge over time.

**Effort:** S
**Priority:** P3
**Depends on:** None

### Replace dataScope magic string with zod enum

**What:** Define `SponsorAeDataScope = z.enum(['aggregate', 'deidentified_line_level_safety', 'identified_with_authorization'])` in `packages/shared` and reference from `apps/api/src/domains/sponsors/routes.ts:13`.

**Why:** The current hard-coded `'aggregate_or_deidentified_line_level_safety'` literal will become an enum that the client must understand. Better to define once.

**Effort:** S
**Priority:** P3
**Depends on:** packages/shared API schemas

---

## DB / Migrations (packages/db)

### Fix recursive RLS on users_self_or_tenant_read

**What:** Introduce a SECURITY DEFINER helper `app.shares_tenant_with(target_user_id uuid) returns boolean` (joined against `tenant_memberships` with elevated privileges and a fixed search_path) and rewrite `users_self_or_tenant_read` (`packages/db/migrations/0001_security_primitives.sql:201`) to call it instead of joining `tenant_memberships` directly.

**Why:** The current policy queries `tenant_memberships` inside `USING(...)` without a SECURITY DEFINER helper. `tenant_memberships` itself has RLS, causing recursive policy evaluation. Worst case: silent denial of rows on the `users` table or recursion errors under concurrent access. Pattern matches `app.is_tenant_member` and `app.has_active_support_grant` already in 0001.

**Context:** Add a semantic SQL RLS test in `packages/db/test/rls/users.test.sql` that verifies a user can see other members of their own tenant but not unrelated users.

**Effort:** S
**Priority:** P0
**Depends on:** None

### Widen patients RLS to include ETC and consent-bearing sponsor reads

**What:** Replace the `patients_self_read` policy in `packages/db/migrations/0004_architecture_stubs.sql` with a union that includes `app.has_tenant_relationship(app.current_tenant_id(), tenant_id, 'care_team')` for ETCs and a consent-based predicate (`exists ... patient_data_sharing_consents where status = 'active' and starts_at <= now() and revoked_at is null`) for sponsors.

**Why:** Per the project model, ETCs treat patients (`care_team` relationship) and sponsors see consented data. The current policy `tenant_id = app.current_tenant_id() OR has_active_support_grant(...)` blocks both paths — the first patient view from an ETC dashboard returns zero rows.

**Context:** `app.has_tenant_relationship` already exists. Will need semantic RLS coverage for all three personas (patient self, ETC care team, sponsor consented).

**Effort:** M
**Priority:** P0
**Depends on:** None

### Widen programs RLS to include ETC visibility

**What:** Replace `programs_sponsor_read` (`packages/db/migrations/0004_architecture_stubs.sql:188`) with a union that includes `app.has_tenant_relationship(app.current_tenant_id(), sponsor_tenant_id, 'ppa')`.

**Why:** ETCs need to view sponsor programs to enroll patients. The current policy is sponsor-only.

**Effort:** S
**Priority:** P0
**Depends on:** None

### Establish the write-policy pattern for RLS-enabled tables

**What:** Define a helper `app.can_write_for_tenant(target_tenant_id uuid, action text) returns boolean` (SECURITY DEFINER) that encodes who can INSERT / UPDATE / DELETE per role. Add SELECT + INSERT + UPDATE + DELETE policies on every RLS-enabled table as it lands. Add a CI check (semantic SQL-driven, or a SQL meta-query) that any new RLS-enabled table without all four operations represented = fail.

**Why:** Migrations 0001/0002/0004/0005 enable RLS but only define SELECT policies. Default RLS denies every INSERT/UPDATE/DELETE. The first feature PR will need to invent the write-policy pattern under deadline pressure — ugly.

**Context:** Document the pattern in `.claude/rules/database.md`.

**Effort:** L
**Priority:** P0
**Depends on:** None

### Add retention enforcement primitives to file_storage_objects, audit_log, ETRB, QAPI

**What:** Add `retention_until timestamptz` to `file_storage_objects`, `audit_log`, and (as schemas land) ETRB and QAPI tables. Add a `BEFORE DELETE` trigger that raises if `retention_until > now()`. Provide a function `app.compute_retention(category text) returns interval` so insert-time triggers can populate `retention_until` from the object category. Add semantic SQL tests for the full retention matrix (patient files 5y, ETRB 5y, QAPI 3y, audit_log 7y).

**Why:** CLAUDE.md HIPAA #6 mandates retention IN the database. No primitives exist today.

**Effort:** L
**Priority:** P0
**Depends on:** None

### Tighten audit_log: NOT NULL tenant_id + enforced audit-write helper

**What:** Add `NOT NULL` on `audit_log.tenant_id` (with a documented sentinel UUID for system-wide events). Build `app.write_audit(tenant uuid, actor uuid, action text, target_type text, target_id uuid, before jsonb, after jsonb) returns void` and document that every domain mutation must call it in the same transaction. Add a pattern test that flags handlers performing INSERT/UPDATE/DELETE on PHI tables without a corresponding `audit_log` insert.

**Why:** Currently `audit_log.tenant_id` is nullable, so an audit row with NULL tenant is unreadable to any tenant — a hidden audit gap. Also there's no enforcement that every state change writes an audit row in the first place.

**Effort:** M
**Priority:** P1
**Depends on:** None

### tax_id_encrypted: pick a real encryption strategy or remove

**What:** Either remove `sponsor_organizations.tax_id_encrypted` until a key-management design exists, or wrap it in a `pgcrypto`-based helper (`pgp_sym_encrypt` with a key sourced from KMS, write-only by app role, read-only via a SECURITY DEFINER function). Document the key source and rotation procedure. Add a semantic SQL test that the raw column is unreadable without the helper.

**Why:** `packages/db/migrations/0004_architecture_stubs.sql:7` declares the column as `bytea` with no encryption helper, no key management, no KMS strategy. Will end up storing plaintext bytes called "encrypted" the first time someone writes to it.

**Effort:** M
**Priority:** P1
**Depends on:** Decision on KMS strategy

### Tighten notifications + feature_flags policies on NULL tenant_id

**What:** Rewrite policies in `packages/db/migrations/0001_security_primitives.sql:237` to:
`(tenant_id is null and app.current_user_id() is not null) or tenant_id = app.current_tenant_id()`. Document that NULL tenant_id rows are platform-wide and require an authenticated session.

**Why:** Today the policies allow read when `tenant_id IS NULL` regardless of session state. For a HIPAA posture, even global rows should require an authenticated session.

**Effort:** S
**Priority:** P2
**Depends on:** None

### Backfill missing search_index_documents indexes

**What:** Add an index on `(source_table, indexed_at)` to `search_index_documents` for incremental re-index queries. Add a unique partial index on `(source_table, source_id) WHERE processed_at IS NULL` to `search_index_jobs` to prevent duplicate enqueue races.

**Why:** Search workers will need both query patterns the moment indexing turns on.

**Effort:** S
**Priority:** P2
**Depends on:** None

---

## Workers (apps/workers)

### Hard-gate ENABLE_STUB_WORKERS on NODE_ENV !== 'production'

**What:** Rewrite `stubWorkersEnabled()` in `apps/workers/src/index.ts:18-23` so `ENABLE_STUB_WORKERS=true` is only honored when `NODE_ENV !== 'production'`. In `NODE_ENV=production`, refuse to start with a stub processor regardless of any other flag. Remove `ENABLE_STUB_WORKERS=true` from `.env.local.example` (or move it to a comment).

**Why:** Today `ENABLE_STUB_WORKERS=true` overrides the production gate. If accidentally set in Railway prod env (and `.env.local.example` ships it set to `true`, ready to copy-paste), every BullMQ job silently "succeeds" without doing the work — PDF rendering, AE notifications, compliance recalcs all no-op while marking jobs done.

**Effort:** S
**Priority:** P0
**Depends on:** None

---

## Shared Package (packages/shared)

### Add API schemas: errors, pagination, branded IDs, per-domain request/response

**What:** Add `packages/shared/src/api/` with: `errors.ts` (ErrorCode enum + ErrorResponse schema), `pagination.ts` (CursorPage helper), `ids.ts` (branded UUID schemas: SponsorId, EtcId, PatientId, BoardId, TenantId), and per-domain request/response schemas. Re-export from `packages/shared/src/index.ts`.

**Why:** `packages/shared/src/index.ts` currently exports env, phi-redaction, queues, redis-config, time, and types — but no API request/response schemas, no shared error envelope, no shared pagination/cursor schema. The package was set up specifically to host shared zod schemas (per CLAUDE.md) and currently doesn't.

**Effort:** L
**Priority:** P1
**Depends on:** None

### Validate AppContext shape before binding to Postgres session vars

**What:** Add zod validation to `setAppContext` in `packages/db/src/context.ts:7` so `userId` / `activeTenantId` are validated as UUIDs (z.string().uuid()) and `requestId` / `supportTicketId` against safe regex before being passed to `set_config`. Reject empty strings explicitly. Add a unit test that an invalid UUID raises before any DB call.

**Why:** Today, malformed values silently survive until `app.current_user_id()::uuid` throws inside a policy, manifesting as a confusing 500 deep in a query rather than a 400 at the trust boundary.

**Effort:** S
**Priority:** P2
**Depends on:** None

### Expand redactPhi pattern set + unit tests

**What:** Expand `redactPhi` (`packages/shared/src/phi-redaction.ts:6`) to also catch US-format dates, MRN-shaped IDs, and address-shaped strings. Add unit tests for each pattern. Add a JSDoc comment that redactPhi is a last-line defense, not a primary control — names/addresses must never reach the logger by construction.

**Why:** Current pattern set is incomplete and will not catch most real PHI in error messages or stack traces.

**Effort:** S
**Priority:** P2
**Depends on:** None

---

## Infrastructure / Tooling

### Add environment guard to seed-dev.ts

**What:** At the top of `main()` in `packages/db/scripts/seed-dev.ts:33`, refuse to run unless `NODE_ENV in {'development','test'}` AND the `DATABASE_URL` host matches an allowlist (`127.0.0.1`, `localhost`, `*.local`). Throw with a clear error otherwise. Add the same guard to `packages/db/scripts/run-psql-files.ts` when invoked against the rls test directory.

**Why:** CLAUDE.md says "mise run db:seed — NEVER against staging or prod" but the script doesn't enforce it. A misconfigured `DATABASE_URL` or copy-paste of a Railway URL would happily seed synthetic clerk_user_ids and tenants into production.

**Effort:** S
**Priority:** P0
**Depends on:** None

### Remove SUPABASE_SERVICE_ROLE_KEY from API + workers runtime env

**What:** Remove `SUPABASE_SERVICE_ROLE_KEY` from `env/.env.api.example` and `profiles.api_dev` / `profiles.workers_dev` in `fnox.toml`. The API and workers should connect to Postgres as a low-privilege application role bound by RLS. Any service-role-needing operation (e.g. Storage signed URLs) must run in a dedicated worker with its own profile and an explicit code-level guard that asserts no request context is active. Tighten the CI grep that bans the literal `service_role` to also ban `SUPABASE_SERVICE_ROLE_KEY` env reads in `apps/api`.

**Why:** CLAUDE.md security #1 explicitly bans user-facing code paths from using a service-role to bypass tenant RLS. Even having the key available to the API process invites accidental use.

**Effort:** M
**Priority:** P0
**Depends on:** Decision on which subprocess gets service-role access

### Replace fnox.toml placeholder recipients

**What:** Replace the literal placeholder public keys in `fnox.toml:10` (`age1placeholder000…`, `age1placeholder111…`) with the real maintainer + CI public keys before any secret is encrypted to this profile. Add a CI check that fails if any `[[recipients]].public_key` starts with `age1placeholder`. Document the bootstrap in `docs/runbooks/developer-onboarding.md`.

**Why:** Anyone running `fnox rekey` against the file today would produce ciphertexts that no one can decrypt; alternately, if a real key is added later without removing placeholders, fnox may silently encrypt to nobody for those slots.

**Effort:** S
**Priority:** P1
**Depends on:** Real maintainer + CI age public keys

### Remove temporary password gate before public launch

**What:** Two-step removal of the temporary password gate added in v0.0.6.2.
Step 1: set `LEWIS_GATE_DISABLED=true` on each Vercel project (lewis-directory-prod, lewis-app-prod, lewis-patient-prod) and redeploy; verify cold visits hit the apps directly. The kill switch stays in place as a safety net.
Step 2 (cleanup PR, after a few days of confirmed-public access): delete `apps/{app,directory,patient}/middleware.ts`, delete `packages/gate/`, remove `@lewis/gate: workspace:*` from each app's `package.json`, remove the `gateVitePlugin` import + plugin entry from each app's `vite.config.ts`, remove the `@lewis/gate` paths in `tsconfig.base.json`, remove the Edge-runtime globals block in `eslint.config.js`, remove the three `LEWIS_GATE_*` env vars on each Vercel project. The cleanup PR should explicitly note that the patient-portal copy concession against PRD principle #3 is now resolved.

**Why:** The gate is intentionally temporary deployment infrastructure. The patient portal copy ("Some treatments don't exist anywhere else") violates PRD principle #3 (no urgency/exclusivity in patient surfaces) — accepted because zero real patients see staging or pre-launch prod. Removing the gate before any real patient sees the portal is the resolution.

**Effort:** S
**Priority:** P2
**Depends on:** Public launch readiness

### Fix `run-psql-files.ts` ECONNRESET on first migration

**What:** `pnpm --filter @lewis/db migrate:sql` fails with `read ECONNRESET` when applying [packages/db/migrations/0001_security_primitives.sql](packages/db/migrations/0001_security_primitives.sql) via node-pg `pool.query`, even on a clean database. Direct `docker exec psql -f` applies the same file cleanly. Suspected cause: node-pg's simple-query protocol path tripping on something specific in 0001 (size, an embedded statement, or a default timeout). Investigate and fix so `mise run db:reset` works end-to-end without dropping to docker exec.

**Why:** `mise run db:reset` is the documented recovery path when local Postgres state goes bad. A solo dev hitting a broken DB has to manually `docker exec psql -f` each migration file in order, then `mise exec -- pnpm --filter @lewis/db setup:local-roles`. Recovery should be one command.

**Effort:** S
**Priority:** P2
**Depends on:** None

---

## PRD remediation backlog (per implementation.md § 2.1 + § 2.2)

These items come from the principal-engineer remediation backlog in
[docs/implementation.md](docs/implementation.md). The Sprint-1 portions
(§ 2.1.1 schema and § 2.2.1 semantic RLS coverage) were closed via migrations
0010 + semantic RLS 0002 — see Completed. The remaining items are tagged by the
sprint that owns them per implementation.md § 0.2. Each entry references
the canonical source in implementation.md so the spec stays the source of
truth and these entries stay short.

### Phase 0 / Parallel tracks (counsel + ops, runs alongside Sprint 1-2)

These items are NOT engineering-only — they need counsel or ops to start
NOW so they don't block downstream sprints.

#### AE 5-day clock basis decision (§ 2.1.5 Phase 0 portion)

**What:** Counsel defines the official reporting clock basis for RULE 17
(occurrence vs detection vs awareness). Engineering implementation lands
in Sprint 5; the decision gates that work.

**Why:** Until counsel decides, AE migrations can't pin a `clock_basis`
default and the warning-clock semantics are guess-work.

**Effort:** S (engineering); L (counsel)
**Priority:** P0
**Depends on:** Counsel engagement
**Source:** [implementation.md § 2.1.5](docs/implementation.md)

#### Legal content versioning — Phase 0 counsel workflow + early-Sprint-2 schema (§ 2.1.9)

**What:** Counsel review process for legal templates (P&P, informed consent,
patient agreement, 50-12-110, grievance policy, PPA data-sharing language,
DPHHS attestation). Engineering ships `legal_content_templates`,
`legal_content_template_versions`, and `rendered_legal_documents` early in
Sprint 2 so every regulated PDF can prove which counsel-approved text
produced it.

**Why:** Sprint 6 counsel review must validate evidence rather than discover
template gaps. Approved templates need to exist BEFORE Sprint 2-5 rendering
work depends on them.

**Effort:** M (engineering schema); L (counsel approval workflow)
**Priority:** P0
**Depends on:** Counsel engagement
**Source:** [implementation.md § 2.1.9](docs/implementation.md)

#### Subprocessor classification (§ 2.2.3 Phase 0 portion)

**What:** Inventory every operational tool that can receive telemetry,
logs, screenshots, evidence, test findings, or operational metadata
(Better Stack/Axiom, Checkly, PostHog, Vanta/Drata, pen-test vendors).
Classify each as `PHI allowed with BAA`, `No PHI by configuration`, or
`Synthetic data only` in `docs/subprocessors.md`.

**Why:** Required before any operational tool sees real data. Sprint 6
DB-backed subprocessor portal builds on this inventory.

**Effort:** M (ops/docs work; minimal engineering)
**Priority:** P0
**Depends on:** Subprocessor list
**Source:** [implementation.md § 2.2.3](docs/implementation.md)

### Sprint 2 — Sponsor + ETC onboarding

#### Legal content templates schema + first regulated renderers (§ 2.1.9 Sprint-2 portion)

**What:** Land the `legal_content_templates`, `legal_content_template_versions`,
`rendered_legal_documents` migrations. Move the first set of templates (PPA
data-sharing language, ETC P&P starter sections) into versioned templates.
Add a CI check that regulated document renderers reference approved template
versions.

**Effort:** M
**Priority:** P0 for Sprint 2
**Depends on:** Counsel approval workflow (Phase 0)
**Source:** [implementation.md § 2.1.9](docs/implementation.md)

#### Treatment plans + outcome measures — program config schema (§ 2.2.6 Sprint-2 portion)

**What:** Add `program_treatment_plan_templates`, `program_visit_schedule_templates`,
`program_outcome_measures` migrations. Sponsor wizard captures outcome
measure type, cadence, source, unit, expected direction, required/optional
status, reporting label per program.

**Effort:** M
**Priority:** P0 for Sprint 2
**Depends on:** None
**Source:** [implementation.md § 2.2.6](docs/implementation.md)

### Sprint 3 — ETC operational backbone

#### RULE 18/19 operational evidence (§ 2.1.7)

**What:** Add migrations for `infection_control_programs`, `cleaning_logs`,
`equipment_disinfection_logs`, `infection_surveillance_events`, `safety_reports`,
`expiring_products`. Build cleaning-log workflows, infection control officer
assignment, expiration monitoring. Route safety events into QAPI.

**Effort:** L
**Priority:** P0 for Sprint 3
**Depends on:** Sprint 1 staff/credential foundation
**Source:** [implementation.md § 2.1.7](docs/implementation.md)

#### Search implementation (§ 2.2.2)

**What:** Build the Postgres FTS surface on top of the `search_index_documents`

- `search_index_jobs` tables that already exist (migration 0005). Index
  patients, treatments, AEs, protocols, staff, documents, P&P sections, QAPI
  minutes, grievances, patient-file messages, and reports. Add `/v1/search`
  with `scope`, `type`, `q`, pagination, and result highlighting. Wire module
  mutation hooks to enqueue reindex jobs.

**Effort:** L
**Priority:** P0 for Sprint 3
**Depends on:** Sprint 1 search schema (done)
**Source:** [implementation.md § 2.2.2](docs/implementation.md)

#### Drug accountability — schema + product inventory (§ 2.2.5 Sprint-3 portion)

**What:** Add `drug_products`, `drug_lots`, `drug_inventory_locations`,
`drug_inventory_movements`, `drug_storage_condition_logs` migrations.
Capture lot/batch, expiration, received quantity, current quantity,
storage location, disposition, sponsor/program linkage.

**Effort:** M
**Priority:** P0 for Sprint 3
**Depends on:** Sprint 2 program config
**Source:** [implementation.md § 2.2.5](docs/implementation.md)

### Sprint 4 — Patient flow

#### Patient registration with representative path (§ 2.1.1 Sprint-4 portion)

**What:** Sprint 4 patient registration UI/API uses the `patient_representatives`
table (already shipped in migration 0010) to capture self-directed adult,
caregiver, legal guardian, or minor + parent paths. Authority verification
gate before any signing-permission representative can sign. Revocation
workflow that immediately invalidates portal access.

**Effort:** L
**Priority:** P0 for Sprint 4
**Depends on:** Migration 0010 (done)
**Source:** [implementation.md § 2.1.1](docs/implementation.md)

#### Central treatment authorization gate (§ 2.1.2)

**What:** Add `treatment_authorizations` migration with gate version,
pass/fail, evaluated_at, evaluated_by_user_id, source snapshot, failure
reasons. Implement `evaluateTreatmentAuthorization(enrollmentId, action)`
shared server-side. Gate `POST /visits`, check-in, and treatment
documentation through the same evaluator. Check license, PPA, ETRB,
protocol approval, RULE 16(6)(f), valid H&P, eligibility, consent,
agreement, payment/waiver, transfer agreement, provider credential, P&P.
Store every evaluation snapshot for audit.

**Effort:** L
**Priority:** P0 for Sprint 4
**Depends on:** Sprint 3 ETRB + protocol foundation
**Source:** [implementation.md § 2.1.2](docs/implementation.md)

#### Patient rights workflows — record + amendment requests (§ 2.1.3 Sprint-4 portion)

**What:** Add `record_requests`, `amendment_requests`, `disclosure_events`,
`privacy_restrictions` migrations. Patient endpoints for record requests,
amendment requests, restriction requests, disclosure accounting. Full-file
export job (patient-readable archive + machine-readable manifest).

**Effort:** L
**Priority:** P0 for Sprint 4
**Depends on:** Sprint 3 patient-file foundation
**Source:** [implementation.md § 2.1.3](docs/implementation.md)

#### Patient messages data model (§ 2.1.4)

**What:** Add `message_threads`, `message_thread_participants`, `messages`,
`message_attachments`, `message_read_receipts` migrations. Classify threads
as clinical/scheduling/billing/support. Persist emergency/urgent disclaimer
acceptance. Enforce representative messaging scope through RLS + app
validation. Route clinical/safety messages to ETC staff only. Link threads
to enrollment/patient file when contextual.

**Effort:** L
**Priority:** P0 for Sprint 4
**Depends on:** Sprint 1 representatives schema (done)
**Source:** [implementation.md § 2.1.4](docs/implementation.md)

#### Consent transcription — MVP (§ 2.1.6)

**What:** Activate basic consent recording transcription after recording
upload. Store transcript as `informed_consents.transcript_file_id`. Mark
unverified until provider review; provider accepts or annotates. Include
transcript link in patient Documents and patient-file export. Live
captions deferred to Phase 8.

**Effort:** M
**Priority:** P0 for Sprint 4 MVP (NOT Phase 8)
**Depends on:** Video provider decision (Phase 0)
**Source:** [implementation.md § 2.1.6](docs/implementation.md)

#### Patient-file retention locks — schema (§ 2.1.8 Sprint-4 portion)

**What:** Add `patient_file_retention_locks` migration. Foundation already
in 0007 (retention_until + BEFORE DELETE trigger pattern); this extends
the pattern to discharge/file/messages-classified-as-records/consent
artifacts/agreements/treatment docs/test results/AE links/PRO responses.

**Effort:** M
**Priority:** P0 for Sprint 4
**Depends on:** Sprint 4 enrollments + discharge schema
**Source:** [implementation.md § 2.1.8](docs/implementation.md)

### Sprint 5 — Treatment + AE + reporting

#### AE clock basis + timestamp model implementation (§ 2.1.5 Sprint-5 portion)

**What:** Add `occurred_at`, `detected_at`, `became_aware_at`, `reported_at`,
`clock_basis`, `dphhs_deadline_at` to `adverse_events`. Until counsel
finalizes, compute warning clocks from earliest-known of occurrence/
detection/awareness; store the formal selected basis separately. Require
users to explain unknown timestamps. Display all AE timestamps in UI and
generated DPHHS PDF. Escalation jobs use `dphhs_deadline_at`, not
`reported_at`. Tests for delayed-detection and delayed-reporting.

**Effort:** M
**Priority:** P0 for Sprint 5
**Depends on:** Counsel decision on clock basis (Phase 0)
**Source:** [implementation.md § 2.1.5](docs/implementation.md)

#### Patient-file retention locks — discharge flow (§ 2.1.8 Sprint-5 portion)

**What:** On discharge creation, compute `retain_until = discharge_date +
5 years` in America/Denver semantics. Attach locks to all patient-file
artifacts. Export manifest shows retention status per artifact.

**Effort:** M
**Priority:** P0 for Sprint 5
**Depends on:** Sprint 4 retention-lock schema + discharge flow
**Source:** [implementation.md § 2.1.8](docs/implementation.md)

#### Sponsor line-level data — de-identification + aggregates (§ 2.2.4)

**What:** Change PPA sharing levels to `aggregate_only` and
`deidentified_line_level_safety` (remove identified PHI from MVP UI). Add
de-identification/tokenization service for sponsor-facing line-level AE/
safety records. Emit `disclosure_events` for sponsor exports. K-anonymity
suppression for small cohorts. Sponsor RLS tests proving sponsor cannot
read identifiers, message bodies, documents, H&P, consents, agreements,
or raw treatment notes.

**Effort:** L
**Priority:** P0 for Sprint 5
**Depends on:** Sprint 4 enrollments + AE foundation
**Source:** [implementation.md § 2.2.4](docs/implementation.md)

#### Drug accountability — dispense + reconciliation (§ 2.2.5 Sprint-5 portion)

**What:** Add `drug_dispenses`, `drug_accountability_reconciliations`
migrations. Capture dispensing at treatment (enrollment, visit, provider,
quantity, lot, expiration check, patient-facing name). Block dispensing
expired lots. Include drug accountability in treatment documentation +
sponsor reports as de-identified operational data. Route expired/disposed
events to safety/QAPI.

**Effort:** M
**Priority:** P0 for Sprint 5
**Depends on:** Sprint 3 drug schema + Sprint 4 visit/treatment-doc tables
**Source:** [implementation.md § 2.2.5](docs/implementation.md)

#### Treatment plans + outcome capture (§ 2.2.6 Sprint-4/5 portion)

**What:** Sprint 4 enrollment instantiates the program treatment plan +
visit schedule into `patient_treatment_plans` + `patient_treatment_plan_milestones`.
Sprint 5 treatment documentation writes `outcome_measure_observations`.
PRO survey responses map to `program_outcome_measures` (not unstructured
blobs only). Sponsor aggregate reports + ETRB annual reports read from
outcome observations.

**Effort:** L
**Priority:** P0 for Sprint 4-5
**Depends on:** Sprint 2 program outcome measure schema
**Source:** [implementation.md § 2.2.6](docs/implementation.md)

### Sprint 6 — Hardening + launch

#### Patient rights workflows — polish + reporting (§ 2.1.3 Sprint-6 portion)

**What:** ETC/admin review screens for amendment + restriction decisions.
Disclosure-accounting reports generated from `disclosure_events`. Active
privacy restrictions enforced in future disclosure + export workflows.

**Effort:** M
**Priority:** P1 for Sprint 6
**Depends on:** Sprint 4-5 patient rights schema
**Source:** [implementation.md § 2.1.3](docs/implementation.md)

#### Subprocessor portal — DB-backed (§ 2.2.3 Sprint-6 portion)

**What:** Move the `docs/subprocessors.md` inventory into a DB-backed
admin portal so ops can manage classifications, BAA expirations, and
synthetic-data tenants without doc edits.

**Effort:** M
**Priority:** P2 for Sprint 6
**Depends on:** Phase 0 inventory
**Source:** [implementation.md § 2.2.3](docs/implementation.md)

---

## Completed

### Directory app launch (apps/directory) — lewis.health public patient directory

**What:** New Vite/React/TS SPA at [apps/directory/](apps/directory/) covering homepage, browse, treatment detail, ETC profile, eligibility self-screen, connect-request handoff, and supporting static pages. Anonymous-first (Clerk not in bundle). Bundle 109.96 KB gzipped (under 120 KB above-the-fold budget). Public-API contract module [packages/shared/src/api/public.ts](packages/shared/src/api/public.ts) defines the `/v1/public/*` Zod schemas. SEO infrastructure (per-route head meta, JSON-LD, robots.txt, build-time sitemap.xml). 24 vitest tests covering eligibility evaluator, anonymous-session round-trip, catalog lookups, schema validation, and axe-core a11y sweeps. Monorepo glue: `dev:directory` task, `frontend_directory_dev` fnox profile, eslint browser-globals block scoped to frontend apps, `.claude/rules/frontend.md` updated. Followed by `/review` (multi-specialist; quality_score 9.0) which auto-fixed 10 mechanical issues (SVG `id` collision, dead state, broken canonical URLs, etc.) and applied option-C polish (cards as Link, auto-advance removed for WCAG 2.2.1, mobile responsive, full a11y test suite).

**Followups (deferred per scope):**

- `packages/auth` scaffold for cross-subdomain `.lewis.health` Clerk session sharing — directory's connect-request flow will lazy-load Clerk through this package.
- SSG via `vite-plugin-ssr` for crawler coverage (Googlebot reads `useSeo` runtime tags today; SSG bakes them at build for non-JS crawlers).
- Hardcoded WST-057 detail content → catalog-driven (acceptable while WST-057 is the only available program; refactor when a second lands).
- React.lazy route splitting (bundle is under budget without it; revisit if budget tightens).
- Tailwind preset (the design source uses CSS variables AS IS; CSS variables are already token-based for a clean future migration).
- i18n externalization of inline strings to `react-intl` messages (en.json scaffold exists for chrome strings).

**Completed:** v0.0.4.0 (2026-04-26)

(Six mechanical fixes applied during /review on 2026-04-25.)

### audit_log: block TRUNCATE + revoke privilege

**What:** Added `BEFORE TRUNCATE` statement-level trigger using `audit_log_immutable()` and `REVOKE TRUNCATE ON audit_log FROM public` to `packages/db/migrations/0003_audit_immutable.sql`.

**Why:** Row-level triggers don't fire on TRUNCATE; without these, any role with truncate privilege could wipe audit history without firing the immutability trigger.

**Completed:** 2026-04-25 (in /review session)

### payment_obligations / payment_transactions: amount_cents → bigint

**What:** Changed `amount_cents` from `integer` to `bigint` on both tables in `packages/db/migrations/0004_architecture_stubs.sql`.

**Why:** Integer max = $21,474,836.47. Experimental therapies and HFAR allocations can exceed that; first overflow corrupts financial data.

**Completed:** 2026-04-25 (in /review session)

### patients: add jurisdiction_id NOT NULL

**What:** Added `jurisdiction_id uuid not null references regulatory_jurisdictions(id)` to `patients` in `packages/db/migrations/0004_architecture_stubs.sql`. Updated `packages/db/scripts/seed-dev.ts` to provide the US-MT jurisdiction id when inserting the local synthetic patient.

**Why:** Per `.claude/rules/database.md` rule 4, regulated tables must carry `jurisdiction_id`.

**Completed:** 2026-04-25 (in /review session)

### patient_data_sharing_consents: add jurisdiction_id NOT NULL

**What:** Added `jurisdiction_id uuid not null references regulatory_jurisdictions(id)` to `patient_data_sharing_consents` in `packages/db/migrations/0004_architecture_stubs.sql`.

**Why:** Same `.claude/rules/database.md` rule 4 — regulated tables carry `jurisdiction_id`.

**Completed:** 2026-04-25 (in /review session)

### apps/api: validate inbound x-request-id header

**What:** Added `REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/` validation to `apps/api/src/server.ts` request-id middleware. Inbound `x-request-id` headers that don't match are replaced with a fresh `randomUUID()`.

**Why:** Inbound `x-request-id` was echoed back into response headers and log lines unvalidated, allowing log injection via CR/LF.

**Completed:** 2026-04-25 (in /review session)

---

(Twelve critical findings implemented during second-pass principal-engineer fix on 2026-04-25.)

### Hard env+host guard on seed-dev.ts (Fix #5)

**What:** Added `assertSeedSafeOrExit()` to `packages/db/scripts/seed-dev.ts` that refuses to run unless `NODE_ENV in {development, test}` AND the `DATABASE_URL` host is in `{127.0.0.1, ::1, localhost, host.docker.internal, postgres}` or ends in `.local`/`.localhost`. Also rejects a fake `LEWIS_SEED_ALLOW_NON_LOCAL` escape hatch with an explicit error message — there is intentionally no override.

**Completed:** 2026-04-25

### ENABLE_STUB_WORKERS hard-gated on NODE_ENV (Fix #6)

**What:** `apps/workers/src/index.ts` `stubWorkersEnabled()` now early-returns `false` when `NODE_ENV === 'production'`, ignoring `ENABLE_STUB_WORKERS=true` with a console warning. Removed `ENABLE_STUB_WORKERS=true` from `.env.local.example`; replaced with a documented commented line explaining when (and only when) to set it.

**Completed:** 2026-04-25

### Migration 0006 — RLS recursion fix + patients widening + programs widening (Fixes #4, #7, #8)

**What:** `packages/db/migrations/0006_rls_relationship_helpers.sql` adds two SECURITY DEFINER helpers (`app.shares_tenant_with`, `app.has_active_consent_for_sponsor`) and DROP/CREATEs three policies:

1. `users_self_or_tenant_read` now calls `app.shares_tenant_with(id)` instead of joining `tenant_memberships` directly — eliminates recursive policy evaluation.
2. `patients_self_read` adds care_team relationship + active-consent paths so ETCs and consented sponsors can read patient records.
3. `programs_sponsor_read` adds `app.has_tenant_relationship(..., 'ppa')` so ETCs can view sponsor programs to enroll patients.

All three helpers pinned to `set search_path = public, app` to avoid search-path injection.

**Completed:** 2026-04-25

### Migration 0007 — Retention enforcement primitives (Fix #11)

**What:** `packages/db/migrations/0007_retention_enforcement.sql` adds:

- `app.compute_retention(category text) returns interval` — single source of truth for retention windows (audit_log 7y, patient_file 5y, etrb_record 5y, qapi_minutes 3y, etc.; default 10y for unknown categories so under-retention is impossible).
- `app.refuse_premature_delete()` and `app.refuse_truncate()` generic trigger functions.
- `audit_log.retention_until` column (NOT NULL, defaults to `now() + 7 years`), backfilled from existing `ts`. BEFORE INSERT trigger populates it; BEFORE DELETE trigger raises if not yet expired.
- `file_storage_objects.retention_category` + `retention_until` columns. BEFORE INSERT trigger infers category from `immutable_ref` (or accepts caller-set category) and computes `retention_until`. BEFORE DELETE + BEFORE TRUNCATE triggers + REVOKE TRUNCATE.
- Documented contract for ETRB / QAPI tables to follow when they land.

**Completed:** 2026-04-25

### Migration 0008 — Write-policy helper + INSERT/UPDATE/DELETE policies on every RLS table (Fix #12)

**What:** `packages/db/migrations/0008_write_policies.sql` adds:

- `app.role_grants_action(role_name text, action text) returns boolean` — single CASE table mapping role to allowed actions. Default-deny for unknown actions.
- `app.can_write_for_tenant(target_tenant_id uuid, action text) returns boolean` SECURITY DEFINER — authoritative gate combining (active membership with role grant) OR (active support grant for action).
- Write policies on every RLS-enabled table from migrations 0001/0002/0004/0005, using thin per-table policies that delegate to `can_write_for_tenant` with the right action constant. patients_write and consent_write also accept care_team relationship for ETC-managed patient onboarding.
- audit_log gets INSERT-only policy; UPDATE/DELETE physically blocked by 0003 immutability triggers.

The `vibility check` is now consistent: every RLS-enabled table has a SELECT policy AND at least one write policy. CI gate `pnpm --filter @lewis/db rls:coverage` enforces this.

**Completed:** 2026-04-25

### Shared API schemas package (`packages/shared/src/api/`)

**What:** Created shared package re-exports for: `errors.ts` (canonical `ErrorCode` enum + `ErrorResponse` schema + `HTTP_STATUS_BY_CODE` map + `buildErrorResponse` helper), `pagination.ts` (`CursorPageQuery`, `cursorPage<T>` builder), `ids.ts` (branded UUID types: `SponsorId`, `EtcId`, `PatientId`, `BoardId`, `TenantId`, `UserId`, `ProgramId`, plus `RequestId` and `SupportTicketId` regex schemas), and per-domain request/response schemas (sponsors, etcs, patients, boards, internal-admin, search). Wired through `packages/shared/src/index.ts`.

**Completed:** 2026-04-25

### Webhook signature verification (Fix #1)

**What:** Created `apps/api/src/webhooks/{clerk,stripe,plaid,resend}.ts` — each exports a `verify*Webhook(rawBody, headers)` function that returns the parsed verified event or throws `ApiError("forbidden", ...)`.

- **Clerk** + **Resend**: `svix` library, three-header signature scheme (`svix-id`, `svix-timestamp`, `svix-signature`).
- **Stripe**: official `stripe` SDK `webhooks.constructEvent`, `stripe-signature` header. Lazy client init.
- **Plaid**: full ES256 JWT verification of the `Plaid-Verification` header. Uses `plaid` SDK to fetch verification keys (cached in-memory by `kid`), `jose` library for JWK import + JWT signature verification, and `node:crypto.timingSafeEqual` for body-hash comparison. Replay-protection window of 5 minutes.

Webhook routes live in `apps/api/src/domains/webhooks/routes.ts` — each handler reads the raw body via `c.req.text()` (essential — `c.req.json()` would normalize whitespace and fail signatures), calls the matching verifier, then returns the canonical `not_implemented` (501) response until real handlers land.

**Completed:** 2026-04-25

### /v1 auth middleware: requireClerkAuth + resolveTenant + withDbContext (Fix #2)

**What:** Three composable middlewares in `apps/api/src/middleware/`:

- `auth.ts` — `requireClerkAuth` extracts the Clerk session JWT from `Authorization: Bearer ...` or the `__session` cookie, verifies via `@clerk/backend.verifyToken`, sets `c.var.clerkUserId`. Configurable via `CLERK_SECRET_KEY`, `CLERK_JWT_AUDIENCE`, `CLERK_AUTHORIZED_PARTIES` env.
- `tenant.ts` — `resolveTenant` reads `x-lewis-tenant-id` header, validates as UUID, looks up the matching `users.id` + active `tenant_memberships` row in a single query, sets `c.var.appContext = { userId, activeTenantId, requestId }`. Returns `403 forbidden` (deliberately not distinguishing "no Lewis user" from "no active membership" — that distinction is information disclosure).
- `db-context.ts` — `withDbContext` acquires a per-request `PoolClient`, BEGINs a transaction, calls `setAppContext(client, appContext)` to set `app.user_id` / `app.active_tenant_id` / `app.request_id` for RLS, exposes the client on `c.var.dbClient`. COMMITs on 2xx, ROLLBACKs on anything else (or on thrown exception). Defense-in-depth resolution tracker guarantees no leaked transactions.

`server.ts` restructured: `v1Public` sub-router (no auth: `/v1/health`, `/v1/webhooks/*`) is registered before the `v1Authed` sub-router whose `use("*", ...)` chain runs all three middlewares for `/v1/sponsors`, `/v1/etcs`, `/v1/patients`, `/v1/boards`, `/v1/admin`, `/v1/search`. Pluralized `/v1/patient` → `/v1/patients`. Internal-admin sub-router additionally requires `x-support-ticket-id` header per CLAUDE.md break-glass posture.

`onError` rewritten to serialize `ApiError` and `HTTPException` through the canonical envelope; unknown errors return opaque `internal_error` to client + structured stack/route/method log server-side.

**Completed:** 2026-04-25

### zod validators on every domain route (Fix #3)

**What:** Every Hono route in `apps/api/src/domains/*/routes.ts` and `apps/api/src/domains/search/routes.ts` now wraps with `@hono/zod-validator` against shared schemas (`SponsorPathParams`, `EtcPathParams`, `BoardPathParams`, `SearchQueryParams`, etc.). Path params, query strings, and request bodies are now validated at the trust boundary; handlers consume only `c.req.valid("param" | "query" | "json")`. Response shapes are typed against shared `*Response` schemas so client SDK consumers can infer types.

**Completed:** 2026-04-25

### CI gates

**What:** `.github/workflows/api-ci.yml` extended with five structural checks:

1. `Not Implemented` string scan in business logic (excluding `webhooks/` subtree where the canonical `not_implemented` envelope is allowed).
2. `auth.jwt()` ban (already present, kept).
3. `service_role` reference ban (already present, kept).
4. `SUPABASE_SERVICE_ROLE_KEY` env-read ban in `apps/api/src` and `apps/workers/src`.
5. Webhook routes must verify: every `.post(...)` handler under `apps/api/src/domains/webhooks/*.ts` must call a `verify*Webhook(...)` function.
6. `/v1` routes must be auth-gated: `server.ts` must mount `requireClerkAuth`, `resolveTenant`, `withDbContext` on the `v1Authed` sub-router.
7. RLS write-policy coverage: every `enable row level security` table must have a SELECT policy AND a write policy (INSERT/UPDATE/DELETE/ALL). Implemented as `packages/db/scripts/check-rls-coverage.ts`, exposed as `pnpm --filter @lewis/db rls:coverage` and `mise run db:rls:coverage`.

`mise.toml` `tasks.ci` now depends on `db:rls:coverage` so local pre-commit gates match CI.

**Completed:** 2026-04-25

---

(Eighteen informational findings implemented during third-pass principal-engineer fix on 2026-04-25.)

### Migration 0009 — audit_log NOT NULL + system sentinel + app.write_audit() helper

**What:** `packages/db/migrations/0009_audit_helpers_and_tightening.sql` adds:

- A fixed-UUID system-events sentinel tenant (`00000000-0000-4000-8000-00000000C0DE`) for audit rows with no natural tenant
- Backfills existing `audit_log` rows with the sentinel, then makes `audit_log.tenant_id` NOT NULL with sentinel default
- `app.write_audit(p_action, p_target_object_type, p_target_object_id?, p_tenant_id?, p_before?, p_after?, p_actor_user_id?, p_ip?, p_ua?, p_request_id?)` SECURITY DEFINER helper that pulls actor + request_id from session app.\* settings unless overridden
- Tightens `notifications_tenant_read` and `feature_flags_tenant_read` to require `app.current_user_id() IS NOT NULL` for NULL-tenant (global) rows
- Adds `search_index_jobs_pending_unique` partial unique index on `(source_table, source_id) WHERE processed_at IS NULL` for race protection
- Drops `sponsor_organizations.tax_id_encrypted` (no encryption helper exists; safer to remove than ship plaintext-as-encrypted)

**Completed:** 2026-04-25

### AppContextSchema + setAppContext UUID validation at trust boundary

**What:** `packages/shared/src/types.ts` now exports `AppContextSchema` (zod) with branded `UserId`/`TenantId` + `RequestId`/`SupportTicketId` regex types and a new `TenantRole` enum. `packages/db/src/context.ts` `setAppContext` validates AppContext through the schema before binding to Postgres session vars; throws `InvalidAppContextError` with the zod issues on failure.

**Completed:** 2026-04-25

### Role on AppContext + requireRole(...) middleware

**What:** `resolveTenant` middleware now captures the membership role and includes it in AppContext. New `apps/api/src/middleware/role.ts` exports `requireRole(...allowedRoles: TenantRole[])` factory that asserts the AppContext role is in the allowlist. Compile-time correctness via the `TenantRole` type — typo = type error.

**Completed:** 2026-04-25

### Internal-admin: lewis_admin role + audited break-glass access

**What:** `apps/api/src/domains/internal-admin/routes.ts` now uses `requireRole("lewis_admin")` and writes an `admin:access` audit_log row via `app.write_audit()` in the same transaction as the request, capturing the X-Support-Ticket-Id, path, and method. Per CLAUDE.md break-glass posture.

**Completed:** 2026-04-25

### Service / repository layer pattern

**What:** Every domain has `apps/api/src/domains/<x>/service.ts` exposing typed functions taking `(client: PoolClient, ctx: AppContext, params)`. Routes are now thin: validate → call service → respond. Each service function carries a `TODO(sprint-N)` marker naming the table(s) the eventual query will touch. Domains: sponsors, etcs, patients, boards, internal-admin.

**Completed:** 2026-04-25

### Structured pino logger + ESLint ban console.\* in apps/api + apps/workers

**What:** `apps/api/src/logger.ts` and `apps/workers/src/logger.ts` set up pino with PHI-aware formatters (last-line redactPhi pass on message field, structured field-based logging as the primary control). Pretty-print in dev, JSON in prod, silent in test. ESLint rule bans `console.*` in `apps/api/src/**` and `apps/workers/src/**` (scripts directories exempt). All existing `console.warn`/`console.error` calls in apps/api and apps/workers replaced with `logger.{info,warn,error,fatal,debug}` calls. CI step backstops the ESLint rule with a grep so a future eslint-config edit can't silently re-allow PHI-leaky log calls.

**Completed:** 2026-04-25

### Security headers + CORS + body-limit middleware

**What:** `apps/api/src/middleware/security-headers.ts` exports:

- `secureHeadersMiddleware` — HSTS (2y, includeSubDomains, preload), Referrer-Policy no-referrer, X-Content-Type-Options nosniff, X-Frame-Options DENY, strict CSP (default-src 'none', frame-ancestors 'none', base-uri 'none', form-action 'none'). API responses are JSON; nothing should ever load.
- `buildCorsMiddleware()` — allowlist sourced from `CORS_ALLOWED_ORIGINS` env (csv); throws at boot if missing in non-test environments. Allows credentials, exposes x-request-id, allows the canonical headers (Authorization, Idempotency-Key, x-lewis-tenant-id, x-support-ticket-id).
- `bodyLimitMiddleware` — 1 MB default, throws `unprocessable` ApiError on exceed.

All three mounted globally in `apps/api/src/server.ts` before the access logger.

**Completed:** 2026-04-25

### Rate-limit middleware (Redis-backed)

**What:** `apps/api/src/middleware/rate-limit.ts` exports `rateLimit({ bucket, max, windowSeconds, keyFn })`. Fixed-window via Redis INCR + EXPIRE; O(1) per request. Sets `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After` headers. Throws `rate_limited` ApiError → canonical 429 envelope on exceed. Three layered buckets in `server.ts`:

- Coarse `public` bucket: 600/min per IP across the whole app
- `readyz` bucket: 60/min per IP on the dependency-fanning-out probe
- `webhooks` bucket: 120/min per IP on the webhook subtree
- `authed` bucket on `/v1` authenticated routes: 6000/min keyed off resolved tenant id (not IP) so noisy neighbors on shared IPs don't throttle each other

**Completed:** 2026-04-25

### Idempotency-Key middleware (Redis-backed, 24h TTL)

**What:** `apps/api/src/middleware/idempotency.ts` exports `requireIdempotencyKey`. Fingerprints `(method, path, body sha256)`, claims via Redis SETNX (in-flight lock), runs handler, caches response (status + headers + body) on completion. Replays cached response on retry with `Idempotent-Replay: true` header. Returns 409 conflict on key reuse with different body or in-flight retry. 24-hour TTL.

**Completed:** 2026-04-25

### Pagination contract on every list endpoint

**What:** `packages/shared/src/api/pagination.ts` exports `CursorPageQuery` (validates `?cursor` + `?limit`) and `cursorPage(itemSchema)` builder. Every list endpoint response schema is now `{ items, nextCursor, hasMore, ...optional metadata }`. Every list route uses `zValidator("query", CursorPageQuery)`. Service layer functions take `CursorPageQuery` parameters. Endpoints updated: sponsors (programs, etcs, adverse-events), etcs (messages, drug-inventory/lots), patients (messages, documents), boards (protocol-reviews), admin (tenants, compliance, audit-log), search.

**Completed:** 2026-04-25

### Dedup /healthz vs /v1/health

**What:** `/v1/health` removed. Convention: unversioned `/healthz` (cheap liveness, no I/O) and `/readyz` (deeper readiness, hits DB+Redis). Documented inline in server.ts.

**Completed:** 2026-04-25

### OpenAPI surface (/v1/openapi.json + /v1/docs)

**What:** `apps/api/src/openapi.ts` registers all shared zod schemas via `@asteasolutions/zod-to-openapi`, builds an OpenAPI 3.1 document with hand-authored paths block covering every current endpoint (security: ClerkBearer, parameters: tenantHeader/limit/cursor, responses: standard error envelope refs). `/v1/openapi.json` serves the spec (cached after first build); `/v1/docs` serves the Scalar API reference UI. New routes should adopt OpenAPIHono's `createRoute` pattern when they land — that's the only way to get auto-paths.

**Completed:** 2026-04-25

### CI gate: fnox.toml placeholder recipients ban

**What:** `.github/workflows/api-ci.yml` step greps `fnox.toml` for `age1placeholder` strings and fails the build if any are present. Forces the project ops team to replace the placeholder keys with real maintainer + CI age public keys before any secret can be encrypted to a profile. Currently FAILS until those keys are populated — that's the intentional contract.

**Completed:** 2026-04-25

### CI gate: console.\* backstop in apps/api/src + apps/workers/src

**What:** `.github/workflows/api-ci.yml` step greps for `console.{log,warn,error,info,debug,trace}(` in `apps/api/src` and `apps/workers/src` (excluding `scripts/`) and fails the build if any are found. Belt-and-suspenders to the ESLint rule.

**Completed:** 2026-04-25

### Remove SUPABASE_SERVICE_ROLE_KEY from env/.env.api.example + create elevated-worker profile

**What:** `env/.env.api.example` no longer lists `SUPABASE_SERVICE_ROLE_KEY`. New `env/.env.workers-elevated.example` documents the dedicated elevated-worker profile that holds the service-role key for narrow bypass operations (signed Storage URLs, cross-tenant indexers). The CI grep ban on `service_role` env reads in `apps/api/src` and `apps/workers/src` (existing) ensures nothing in user-facing or regular-worker code can read it.

`env/.env.api.example` also expanded with the full env vocabulary needed by the new middleware: `CORS_ALLOWED_ORIGINS`, `PUBLIC_API_BASE_URL`, `LOG_LEVEL`, `RESEND_WEBHOOK_SECRET`, `PLAID_ENV`, optional `CLERK_JWT_AUDIENCE` + `CLERK_AUTHORIZED_PARTIES`.

**Completed:** 2026-04-25

---

(Two Sprint-1 stragglers from the principal-engineer remediation backlog
landed on 2026-04-25.)

### Migration 0010 — patient_representatives + minor_assents schema (§ 2.1.1 Sprint-1 portion)

**What:** `packages/db/migrations/0010_patient_representatives_and_minor_assents.sql` adds:

- `patient_representatives` — patient_tenant_id, jurisdiction_id, user_id, relationship_type (constrained to self|caregiver|legal_guardian|parent_guardian|provider_proxy), authority_basis, authority_document_file_id, access_scope text array, signing_permission, messaging_permission, effective/expires/revoked timestamps, verified_by_user_id + verified_at. Check constraint refuses `signing_permission=true` for non-self relationships unless verified. Partial unique index on `(patient_tenant_id, user_id) WHERE revoked_at IS NULL` so revocation + re-add creates a new row.
- `minor_assents` — patient_tenant_id, jurisdiction_id, enrollment_id (nullable forward-compat for Sprint 4), assent_status (constrained to collected|declined|waived|not_applicable), waiver_reason + waiver_medical_director_user_id (check constraint: required when status=waived), assented_at, recorded_by_user_id, recording_file_id.
- RLS read policies: patient self, ETC care_team, support grant for both tables.
- Two new write actions in `app.role_grants_action`: `representative:write` (patient/etc_admin/etc_clinician/lewis_admin) and `minor_assent:write` (etc_admin/etc_clinician/lewis_admin only).
- RLS write policies: `can_write_for_tenant` + care_team relationship.

**Why:** Per implementation.md § 2.1.1 the patient representative + minor assent model is Sprint-1 schema foundation. Without these tables, Sprint 4 patient registration would either bolt on the model under deadline pressure (rushed RLS, missing tests) or silently model "patient = tenant member with a single role" — which can't represent caregiver-vs-guardian authority distinctions.

**Completed:** 2026-04-25

### Semantic RLS 0002 — comprehensive RLS coverage (§ 2.2.1 Sprint-1 portion)

**What:** `packages/db/test/rls/0002_helpers_policies_retention.sql` (38 plan items) covers:

- All new helper functions: `app.shares_tenant_with`, `app.has_active_consent_for_sponsor`, `app.role_grants_action`, `app.can_write_for_tenant`, `app.write_audit`, `app.compute_retention`.
- Audit-log immutability: UPDATE, DELETE, AND TRUNCATE blocked (the TRUNCATE coverage closes the gap fixed in 0003).
- `patients_self_read` rewritten policy: patient self reads, ETC care_team reads, sponsor-with-active-consent reads, unrelated tenant denied.
- `programs_sponsor_read` rewritten policy: sponsor self reads, ETC with PPA reads, unrelated tenant denied.
- `users_self_or_tenant_read` recursion fix verified: self read works, unrelated user denied (no recursion bug).
- `patient_representatives` RLS + `signing_permission` requires-verification check + relationship_type enum check.
- `minor_assents` RLS + waived-requires-reason+medical-director check.
- Retention triggers: `compute_retention` returns expected interval; `file_storage_objects` BEFORE INSERT auto-populates `retention_until`; BEFORE DELETE blocks premature delete.
- `notifications` + `feature_flags` NULL-tenant policies require authenticated session (validates the 0009 tightening).

`packages/db/package.json` `rls:test` script runs the entire `test/rls/` directory so any new semantic SQL test file added later picks up automatically.

**Why:** CLAUDE.md mandates "Every PHI table needs an RLS test in `packages/db/test/rls`." Before 0002 we had 25 RLS-enabled tables and only 6 plan items in `0001_foundation.sql` — under-covered against our own contract. The static check (`pnpm rls:coverage`) verifies every table HAS policies; the semantic SQL file verifies the policies actually deny cross-tenant access for a representative sample of tables.

**Completed:** 2026-04-25

---

(Fourth-pass foundation hardening landed on 2026-04-25.)

### Semantic RLS harness + CI execution gate

**What:** Added `packages/db/test/rls/0000_semantic_test_harness.sql` so RLS tests run with in-repo assertion helpers instead of depending on a host `pgTAP` extension. `pr.yml` and `api-ci.yml` now run `mise run db:rls:test` against Docker Postgres with runtime-role connection strings, not only static policy coverage.

**Why:** Static coverage proves policies exist; it does not prove the policies authorize correctly. This gate also caught and fixed two real policy bugs: reversed PPA program-read direction and `FOR ALL` write policies that could widen global-row SELECT visibility.

**Completed:** 2026-04-25

### Migration 0012 — representative/minor-assent write hardening

**What:** `packages/db/migrations/0012_representative_write_hardening.sql` adds a role/action helper, rewrites representative and minor-assent write policies to require both a care-team relationship and the relevant ETC role grant, splits write authority into command-specific INSERT/UPDATE/DELETE policies so write grants do not widen SELECT visibility, and requires a verified authority-document file before a non-self representative can hold signing authority. `packages/db/test/rls/0004_representative_write_hardening.sql` proves the semantic behavior.

**Completed:** 2026-04-25

### Migration 0013/0014 — policy bugs found by semantic RLS

**What:** `0013_ppa_program_read_direction.sql` corrects sponsor/ETC PPA direction for program reads. `0014_global_write_policy_command_scope.sql` replaces `FOR ALL` notification and feature-flag write policies with command-specific INSERT/UPDATE/DELETE policies.

**Completed:** 2026-04-25

### Frontend Clerk route guard scaffold

**What:** `apps/app` and `apps/patient` now use `@clerk/clerk-react`, wrap with `ClerkProvider`, and gate staff/patient portal routes before rendering protected shells. Staff `/` redirects by Clerk public metadata portal hints; missing Clerk publishable keys fail closed with a configuration message.

**Completed:** 2026-04-25

### OpenAPI route drift gate

**What:** Added `scripts/check-openapi-route-drift.mjs`, `pnpm run contracts:openapi:check`, and CI steps so documented OpenAPI path/method coverage cannot drift silently from Hono route files.

**Completed:** 2026-04-25
