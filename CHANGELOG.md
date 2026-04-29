# Changelog

All notable changes to Lewis are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to a 4-digit version format: `MAJOR.MINOR.PATCH.MICRO`.

## [0.0.7.0] - 2026-04-29

First user-facing slice of the public directory at `lewis.health`: anonymous, condition-first search with a sectioned overlay (Conditions → Treatments → ETCs) plus a `/search?q=…` results page. A patient typing "neuropathy" sees the four PN conditions before any drug name; an off-topic query like "ALS" surfaces the ALS condition with a graceful "no Montana programs yet" framing and never promotes WST-057 as a primary match. Backed by Postgres FTS over `search_index_documents` with a new anonymous DB context (`app.role = 'directory_anonymous'`) — not a service-role bypass. Plus the v1.1 condition-first PRD reframe (PRD split into `b2bprd.md` + `directoryprd.md`), wordmark + typography tightening across all three apps, and the underlying data model the Sprint 2 conditions index will compose on top of.

### Added

- **Anonymous directory search end-to-end** — `GET /v1/public/search?q=…&type=…` returning sectioned response (`{ conditions, treatments, etcs, totals }`) with condition-first ordering enforced server-side. FTS via `websearch_to_tsquery('english', $1)` + `ts_rank_cd` over `search_index_documents`; `MIN_RANK = 0.05` floor mathematically excludes off-topic matches per [docs/directoryprd.md § 13.5](docs/directoryprd.md). 30 req/min/IP rate limit, `Cache-Control: public, max-age=60, stale-while-revalidate=600`. Implementation at [apps/api/src/domains/public-search/routes.ts](apps/api/src/domains/public-search/routes.ts).
- **`withPublicDbContext` middleware** ([apps/api/src/middleware/public-context.ts](apps/api/src/middleware/public-context.ts)) — opens a per-request transaction with `app.role = 'directory_anonymous'` set via `set_config(..., true)`. Sibling of `withDbContext` for the anonymous `/v1/public/*` surface; runtime role stays `app_api` (NOBYPASSRLS per migration 0011). Connection lifecycle mirrors `withDbContext` — try/catch/finally with explicit release on every path.
- **`@lewis/shared/api/search`** — `PublicSearchQueryParams`, `PublicSearchResponse`, `PublicSearchConditionHit`, `PublicSearchTreatmentHit`, `PublicSearchEtcHit` schemas. Zod-validated on both the API response and the directory client.
- **Migration `0018_directory_public_search`** ([packages/db/migrations/0018_directory_public_search.sql](packages/db/migrations/0018_directory_public_search.sql)) — `conditions` table + `program_conditions` join (1 program → N indications, modeling WST-057 across 4 PN conditions per [§ 2.4](docs/directoryprd.md)). New `directory_published`/`directory_slug`/`directory_summary`/`directory_city` columns on `programs` and `etcs`. Public-read RLS policies on `conditions`, `program_conditions`, `programs`, `etcs`, and `search_index_documents` keyed off `current_setting('app.role', true) = 'directory_anonymous' AND <published flag>` — additive to existing tenant-scoped policies, default-deny on missing role context. Lewis-admin write policies on the new catalog tables (matches `regulatory:write` posture from 0008). Phase 1 catalog seed: WinSanTor sponsor + Big Sky ETC tenants, WST-057 program, 9 conditions per [§ 27.3](docs/directoryprd.md), and the WinSanTor↔Big Sky PPA `tenant_relationships` row that drives ETC catalog-term aggregation.
- **Trigger architecture** — three SECURITY DEFINER `*_by_id` helpers (`app.directory_search_upsert_program_by_id`, `…_condition_by_id`, `…_etc_by_id`) are the single source of truth per source table. Two cascade helpers: `app.directory_search_touch_related_etcs(sponsor_tenant_id)` refreshes every ETC with an active PPA when its sponsor's program changes, and `app.directory_search_touch_program_conditions(program_id)` re-aggregates every linked condition's tsvector when a program publishes/unpublishes/renames. Trigger functions are thin wrappers around the helpers; cascade paths call helpers directly so program/condition/etc edits stay on a fully audited row-state path even if other AFTER triggers (audit_log, retention) land later — no `UPDATE x SET col = col` no-ops.
- **RLS semantic test** ([packages/db/test/rls/0018_directory_public_search.sql](packages/db/test/rls/0018_directory_public_search.sql)) — 16 assertions covering default-deny without role context, anonymous published reads, unpublished invisibility, on-topic neuropathy reaches WST-057 + Big Sky via aggregations, and off-topic ALS surfaces zero treatments + zero ETCs.
- **`SearchOverlay`** ([apps/directory/src/search/SearchOverlay.tsx](apps/directory/src/search/SearchOverlay.tsx)) — Radix Dialog primitive (focus trap, scroll lock, ARIA), 150ms debounced live-suggest, AbortController on each new request, ArrowUp/Down keyboard nav, aria-live polite count announcements, sectioned suggestions (Conditions → Treatments → ETCs server-shipped order). Lazy-loaded via `<Suspense>` from `SearchOverlayProvider` so the chunk only ships on first magnifier press — verified at 12.86 kB gzipped, separate from the initial bundle.
- **`SearchPage`** ([apps/directory/src/pages/SearchPage.tsx](apps/directory/src/pages/SearchPage.tsx)) — Surface 2 at `/search?q=…`. Three states per [§ 13.2](docs/directoryprd.md): query+results (sectioned, `noindex, follow`), query+no-results (graceful "try one of these" + curated list), empty query (indexable "Recent on Lewis"). Canonical strips the query string so Google never indexes the long tail of `?q=…` variants.
- **`SearchOverlayProvider` + `useSearchOverlay`** ([apps/directory/src/search/SearchContext.tsx](apps/directory/src/search/SearchContext.tsx)) — context owns `{ isOpen, open, close }` at the layout level so the overlay persists across client-side navigation.
- **`ConditionDetailPage` placeholder** ([apps/directory/src/pages/conditions/ConditionDetailPage.tsx](apps/directory/src/pages/conditions/ConditionDetailPage.tsx)) — minimal `/conditions/:slug` so condition click targets resolve to a real route. Sprint 2 fills out the three-state UI per [§ 14.2](docs/directoryprd.md).
- **`useSeo({ noIndex })`** extension ([apps/directory/src/seo/useSeo.ts](apps/directory/src/seo/useSeo.ts)) — when set, writes `<meta name="robots" content="noindex, follow">`; cleared otherwise.
- **`sanitizeAccessLogMessage`** ([apps/api/src/server.ts](apps/api/src/server.ts)) — defense-in-depth on top of `redactPhi`: strips `?…` query strings entirely from `<--`/`-->` access-log lines before they reach the structured logger. PHI in URL params can never land in logs.
- **Frontend `CONDITIONS`** ([apps/directory/src/data/catalog.tsx](apps/directory/src/data/catalog.tsx)) — TypeScript mirror of the migration 0018 seed (4 PN live + PTSD coming-soon + 4 not-offered stubs). Read by `ConditionDetailPage` until `/v1/public/conditions` lands in Sprint 2 (TODO marker in the file).
- **`@radix-ui/react-dialog`** added to `apps/directory` — accessibility primitive for the search overlay (~5 kB gzip, lazy-loaded with the overlay chunk).
- **`docs/directoryprd.md`** (~2.5k lines) — public directory build-ready spec at v1.1 with the condition-first patient mental model reframe across IA, navigation, homepage carousels, search relevance (§ 13.5 off-topic protection), and SEO surfaces. New § 2.4 Sponsor & Condition Rollout Strategy captures the slow-sniper rollout (WST-057 → Psilocybin/PTSD → broader biotech).
- **`docs/b2bprd.md`** — the regulated operating platform PRD that previously lived at `docs/prd.md`.
- **Test coverage** — `apps/api/src/server.test.ts` (sanitizeAccessLogMessage), `apps/api/src/middleware/public-context.test.ts` (middleware lifecycle, commit/rollback/release on every path), `apps/api/src/domains/public-search/routes.test.ts`, `apps/directory/src/pages/SearchPage.test.tsx` + `SearchPage.a11y.test.tsx` (empty/results/stale-response handling, axe-core scans).
- **Favicons** — `apps/directory/public/favicon.svg`, `apps/app/public/`, `apps/patient/public/` plus `<link rel="icon">` references in each `index.html`. Inline SVG favicon also added to the gate page for parity.

### Changed

- **TopNav magnifier** ([apps/directory/src/components/TopNav.tsx](apps/directory/src/components/TopNav.tsx)) — converted from `<Link to="/search">` to a `<button>` that opens the overlay via `useSearchOverlay().open()`. The hero search pill still navigates to `/search?q=…` on submit (Surface 2 fallback), so search works without JS.
- **Homepage hero** ([apps/directory/src/pages/HomePage.tsx](apps/directory/src/pages/HomePage.tsx)) — replaced the 5-prompt rotating placeholder + reduced-motion logic with a single static "Search by your condition" placeholder per § 11.3. Italic "treatments" mirrors the wordmark "health" exactly (`className="serif italic"`, `fontWeight: 300`, `letterSpacing: -0.025em`) so both render the same Fraunces italic 300 face.
- **Wordmark across surfaces** — TopNav and Footer now render "Lewis." + italic "health" as a two-span block with locked typography (`fontSize: 24`/`18`, `fontWeight: 400`/`300`, `letterSpacing: -0.025em`, `lineHeight: 1`). Footer flag preserved.
- **Fraunces optical-sizing** ([packages/ui/src/styles/fonts.css](packages/ui/src/styles/fonts.css), [packages/ui/src/styles/base.css](packages/ui/src/styles/base.css)) — switched to `@fontsource-variable/fraunces/standard.css` so both `wght` AND `opsz` axes are exposed; `font-variation-settings: "opsz" 56` locked on `html, body` so the wordmark and hero h1 render with matching glyph design at every size.
- **Directory loads Fraunces from Google Fonts** ([apps/directory/index.html](apps/directory/index.html), [packages/ui/src/styles/tokens.css](packages/ui/src/styles/tokens.css)) — the directory is anonymous-first (no PHI), so the brand wordmark loads from the same source the gate page uses for visual parity. Patient + app consoles continue self-hosting via `@fontsource-variable` per the PHI subprocessor rule. `--font-serif` puts `"Fraunces"` first; `"Fraunces Variable"` second is the self-hosted fallback.
- **Pill button optical centering** ([packages/ui/src/styles/buttons.css](packages/ui/src/styles/buttons.css), [packages/ui/src/styles/inputs.css](packages/ui/src/styles/inputs.css)) — Inter Tight reserves extra ascent for diacritics; asymmetric padding (1px more top, 1px less bottom) pushes visible glyphs back to optical center across `.pill`, `.pill-sm`, `.pill-lg`, and the search-pill submit button. `line-height: 1` added so the geometry is predictable.
- **`/v1/public/search` on `v1Public` router** ([apps/api/src/server.ts](apps/api/src/server.ts)) — mounted before the `v1Authed` middleware chain so anonymous traffic doesn't hit Clerk verification. Layered 30 req/min/IP rate-limit on top of the 600/min coarse public bucket.
- **OpenAPI surface** ([apps/api/src/openapi.ts](apps/api/src/openapi.ts)) — added `PublicSearchQueryParams`/`PublicSearchResponse` components and the `/v1/public/search` operation. CI route-drift gate green.
- **`apps/directory/src/api/client.ts`** — `searchPublic(q, { type, signal })` method that runs through the existing `getJson` Zod-validated fetch wrapper. Accepts `AbortSignal` so the overlay can cancel stale requests.
- **`/conditions/:slug`** route mapping in [apps/directory/src/main.tsx](apps/directory/src/main.tsx) split off `ConditionsIndexPage`; both wrapped by the new `SearchOverlayProvider`.
- **`apps/directory/src/messages/en.json`** — added `directory.search.*` keys (overlay title/description, placeholder, section headings, empty/no-results headings, ARIA results-count plural). Hero search aria-label updated to match the static placeholder.
- **CLAUDE.md** + **TODOS.md** — links updated from the deleted `docs/prd.md` to `docs/b2bprd.md` / `docs/directoryprd.md` per the PRD split.

### Removed

- **`docs/prd.md`** (1837 lines) — replaced by `docs/b2bprd.md` (regulated operating platform spec) and `docs/directoryprd.md` (public directory spec). The compliance-mapping reference in CLAUDE.md § Security #4 + § References now points at the right halves.
- **`StaticPages.SearchPage`** ([apps/directory/src/pages/StaticPages.tsx](apps/directory/src/pages/StaticPages.tsx)) — placeholder removed; `/search` route now points at the real `SearchPage`.
- **Hero rotating-placeholder machinery** — `RotatingPlaceholder` component, `usePrefersReducedMotion` hook, `SEARCH_PROMPT_IDS` array, and the 5 `directory.home.search.placeholder.*` i18n keys were all removed in favor of one static placeholder. Saves ~80 lines of motion/animation code that wasn't earning its keep.

## [0.0.6.2] - 2026-04-28

Temporary password gate in front of `lewis.health`, `app.lewis.health`, and `patient.lewis.health` while the apps are still being built. The gate is intentionally minimal and removed via a follow-up cleanup PR before public launch — kill switch via `LEWIS_GATE_DISABLED=true` for instant rollback.

### Added

- **`@lewis/gate` shared package** ([packages/gate/](packages/gate/)) — Vercel Edge Middleware backed by Web-Crypto-only HMAC-SHA256 signed cookies (no Node deps, runs on V8 isolates). Cookie format `${expiryMs}.${hex(HMAC)}` with server-enforced 7-day expiry. Constant-time password compare via XOR-OR over equal-length hex digests. CSRF guard via `Origin`/`Referer` host check. 800ms throttle on wrong password. Fail-closed 503 on missing env vars (`LEWIS_GATE_PASSWORD` / `LEWIS_GATE_SECRET`). Kill switch via `LEWIS_GATE_DISABLED=true`. Variant-A gate HTML inlined and server-rendered; client-side fetch intercepts the form post and shows inline error / smooth fade-to-loading without page reload, with no-JS fallback that uses native form post + Loading interstitial.
- **Per-app middleware** ([apps/directory/middleware.ts](apps/directory/middleware.ts), [apps/app/middleware.ts](apps/app/middleware.ts), [apps/patient/middleware.ts](apps/patient/middleware.ts)) — one-line re-exports of `gateMiddleware` and `gateConfig`. The `gateConfig.matcher` excludes static assets, `/robots.txt`, `/sitemap.xml`, `/favicon.ico`, `/apple-touch-icon*`, and the `_next/_vercel` paths so SEO crawlers and asset routes aren't disrupted by the gate.
- **`gateVitePlugin`** ([packages/gate/src/vite.ts](packages/gate/src/vite.ts)) — Vite dev-server shim that bridges Node's connect middleware to the same `gateMiddleware` Web-standards function. Defaults the gate ON in dev so `mise run dev:*` mirrors production behavior; `LEWIS_GATE_DISABLED=true` is the same kill switch in dev. Strips the `Secure` cookie attribute over plain HTTP localhost so the 7-day session cookie persists across reloads.
- **Tests** — 9 cases in [packages/gate/src/crypto.test.ts](packages/gate/src/crypto.test.ts) (HMAC round-trip, expiry rejection, tampered signature, different-secret rejection, malformed values, password match/mismatch/empty/near-miss) and 15 cases in [packages/gate/src/index.test.ts](packages/gate/src/index.test.ts) (misconfig 503, kill switch, cold visit headers, cookie verification, CSRF guard, JSON success path, HTML loading interstitial, 401 throttle timing, GET → 303 redirect). 24/24 passing.
- **Edge-runtime ESLint scope** ([eslint.config.js](eslint.config.js)) — new globals block for `packages/gate/**/*.ts` and the per-app `middleware.ts` files exposing the Web-standards globals (`crypto`, `Request`, `Response`, `URL`, `TextEncoder`, `setTimeout`, `clearTimeout`, `CryptoKey`).

### Changed

- **Workspace dependencies** — [apps/directory/package.json](apps/directory/package.json), [apps/app/package.json](apps/app/package.json), and [apps/patient/package.json](apps/patient/package.json) all add `@lewis/gate: workspace:*`. The respective `vite.config.ts` files register `gateVitePlugin()` and the `tsconfig.json` `include` arrays now cover `middleware.ts`. [tsconfig.base.json](tsconfig.base.json) adds the `@lewis/gate` path entries.

### Fixed

- **Vercel Edge bundler couldn't resolve `@lewis/gate` workspace specifier.** The Edge Function bundler externalizes node_modules and treats pnpm-symlinked workspace packages the same way, so the deploy errored with `The Edge Function "middleware" is referencing unsupported modules: @lewis/gate`. Switched each app's `middleware.ts` to a relative import (`../../packages/gate/src/index.js`) so esbuild walks into the actual source instead. Same trick the `vite.config.ts` already uses for `gateVitePlugin`.
- **Railway Dockerfiles failed `pnpm install --frozen-lockfile` topology validation** because `pnpm-lock.yaml` listed `packages/gate` as a workspace package but the API and workers Dockerfiles enumerate every workspace manifest explicitly (the `pnpm-workspace.yaml` glob is `apps/* + packages/*`). Added a single `COPY packages/gate/package.json packages/gate/` line to both Dockerfiles. The api and workers never import `@lewis/gate` at runtime, so only the manifest is needed (source is excluded).
- **Railway BuildKit policy rejected the Dockerfile cache mounts** with `Cache mount ID is not prefixed with cache key` (logged at error level, fatal). Railway requires cache mount IDs to be hardcoded as `s/<service-id>-<target>` per service ([Railway docs](https://docs.railway.com/guides/dockerfiles)) and explicitly disallows env vars / ARGs in cache IDs. Hardcoding service IDs would break future production deploys, so the cache mounts in [apps/api/Dockerfile](apps/api/Dockerfile) and [apps/workers/Dockerfile](apps/workers/Dockerfile) are removed entirely. Cold-build cost ~30–60s per service; portability across staging and production was prioritised.
- **Gate matcher hardened** in [packages/gate/src/index.ts](packages/gate/src/index.ts) to exclude static assets, `/robots.txt`, `/sitemap.xml`, `/favicon.ico`, `/apple-touch-icon*`, `_next/`, and `_vercel/` paths. Without this, Googlebot would have received the gate HTML in place of crawl directives (poisoning SEO once the gate lifts), every static asset would have billed an extra Edge invocation, and visitors would have seen a broken favicon. Trade-off: the SPA's JS/CSS bundle is fetchable by URL even with the gate up — acceptable for a temporary gate over WIP code (the index.html that boots the SPA IS gated, and API auth at api.lewis.health is independent).
- **Gate XSS hardening** in [packages/gate/src/html.ts](packages/gate/src/html.ts): switched the inline JS error renderer from `errorEl.innerHTML = msg` to `errorEl.textContent = msg`. Functionally equivalent today (only literal strings are passed) but defends against any future change that pipes server input through the same path.
- **Wrong-password feedback dropped from 2000ms → 800ms.** The original throttle was real brute-force protection but felt broken in the UI. The client-side fetch now shows an immediate "Checking…" state during the server check, so the perceived latency masks the throttle. Strong password + 800ms × 1000 concurrent Edge isolates is still impractical to brute-force a 7-character random password.

### Operational — Vercel

Set per Vercel project (Production + Preview scope, **not** Development) on `lewis-directory-{staging,production}`, `lewis-app-{staging,production}`, and `lewis-patient-{staging,production}`:

- `LEWIS_GATE_PASSWORD` — the access password (e.g. `WST-057` for current staging)
- `LEWIS_GATE_SECRET` — 32-byte random hex, **distinct per project** (`openssl rand -hex 32`)
- `LEWIS_GATE_DISABLED` — leave unset; flip to `true` later as the kill switch

Without these, the gate returns 503 fail-closed. The dev defaults (`WST-057` + a non-secret dev secret) are baked into [packages/gate/src/vite.ts](packages/gate/src/vite.ts) so `mise run dev:*` works locally without env setup; production MUST NOT use those defaults.

### Operational — Railway

Three dashboard cleanups were required on `lewis-api` (staging environment) before the Dockerfile build would succeed. `lewis-worker` was already clean. None of these settings are exposable in `railway.toml` ([schema](https://backboard.railway.app/railway.schema.json) does not include `rootDirectory`, `buildCommand`, or `startCommand`); they MUST be cleared in the dashboard.

| Service     | Dashboard field                              | Was                                                                     | Should be                                              |
| ----------- | -------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| `lewis-api` | Settings → Source → **Root Directory**       | `/apps/api`                                                             | (blank — repo root)                                    |
| `lewis-api` | Settings → Build → **Build Command**         | `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter api build` | (blank — Dockerfile drives the build)                  |
| `lewis-api` | Settings → Deploy → **Custom Start Command** | `/apps/api/Dockerfile`                                                  | (blank — Dockerfile's `ENTRYPOINT`/`CMD` owns startup) |

Symptoms each one produced:

- **Root Directory `/apps/api`** restricts Docker's build context to that subdirectory; every `COPY pnpm-lock.yaml`, `COPY packages/...`, etc. fails with "not found".
- **Build Command set with `builder: DOCKERFILE`** is ignored by Railway but signals dashboard config drift from the Railpack era.
- **Start Command `/apps/api/Dockerfile`** makes the container try to exec the Dockerfile as a binary at runtime and fail with `The executable /apps/api/dockerfile could not be found.`

### Operational — Worker DSN URL encoding

Supabase pooler-generated passwords occasionally contain `/` characters that break standard URL parsing. The worker's zod env validation catches this with `path: ["DATABASE_URL"], invalid_string`. URL-encode the slash to `%2F` in `WORKER_DATABASE_URL` (same credential at the Postgres protocol level — it's just escaped for URL parsers). Same fix applies to the API's `DATABASE_URL` if its pooler password ever contains a `/`.

### Removal sequence (when public launch arrives)

1. Set `LEWIS_GATE_DISABLED=true` on all three Vercel projects, redeploy, verify public access.
2. Cleanup PR deletes [packages/gate/](packages/gate/), the three `middleware.ts` files, the `@lewis/gate` workspace dep entries, the `gateVitePlugin` registration in each `vite.config.ts`, the `@lewis/gate` paths in `tsconfig.base.json`, and the Edge-runtime globals block in `eslint.config.js`. The PR description should also note the patient-portal copy concession against PRD principle #3 is now resolved (gate gone before any real patient saw it).

## [0.0.6.1] - 2026-04-28

Wires up the deployment infrastructure for the API + workers Railway services. Two related workstreams in one release: Railway config-as-code (operational settings now version-controlled and reviewable) and a real production database migration pipeline (drizzle-kit migrate replaces the local-only raw SQL applier, runs in GitHub Actions before each Railway deploy, with the schema-owner credential held only by the CI runner). No frontend, schema, or API surface changes.

### Added

- **Railway config-as-code TOMLs.** [apps/api/railway.toml](apps/api/railway.toml) and [apps/workers/railway.toml](apps/workers/railway.toml) capture every settled operational decision (builder, healthcheck path/timeout, restart policy, overlap, drain) so changing them becomes a code-reviewed PR instead of an unaudited dashboard click. Both files schema-validated against the live `https://railway.com/railway.schema.json`. Per-service activation: set Settings → Config-as-Code Path to `/apps/api/railway.toml` (or `/apps/workers/railway.toml`) for each lewis-staging / lewis-prod service. After redeploy, every captured setting shows a file icon in Railway's Deployment Details pane (Railway's signal that the file is the source of truth, overriding the dashboard).
- **drizzle-kit migrate cloud pipeline.** Three new `pnpm --filter @lewis/db` scripts: `migrate:cloud` (applies migrations against `MIGRATION_DATABASE_URL` via `drizzle-kit migrate`, with idempotency tracked in the new `drizzle.__drizzle_migrations` table — second run is a clean no-op), `migrate:journal` (regenerates `migrations/meta/_journal.json` from on-disk SQL files), `migrate:journal:check` (CI drift gate). Replaces the broken-on-second-run `run-psql-files.ts` flow for cloud applies; local development continues to use `migrate:local` (raw SQL apply + role provisioning) against the ephemeral Docker volume.
- **GitHub Actions migration step.** [deploy-staging.yml](.github/workflows/deploy-staging.yml) and [deploy-prod.yml](.github/workflows/deploy-prod.yml) now invoke `drizzle-kit migrate` between "Production build" and the first deploy hook. If migration fails, no deploy hooks fire and the previous deploy keeps serving. Production migrations gate on the existing `production` GitHub Environment (manual-approval required). Two new env-scoped GH Secrets needed: `STAGING_MIGRATION_DATABASE_URL` (env: `staging`) and `PROD_MIGRATION_DATABASE_URL` (env: `production`), each holding the Supabase **session-pooler** URL (port 5432 on the pooler hostname) authenticated as the `postgres` schema-owner role.
- **Migration journal regenerator** at [packages/db/scripts/regenerate-migration-journal.ts](packages/db/scripts/regenerate-migration-journal.ts), with cwd-invariant path resolution (works from any directory via `dirname(fileURLToPath(import.meta.url))`) and a strict file-URL invokedDirectly check that survives `.ts` → `.js` compilation. Deterministic: re-running on unchanged migrations produces a byte-identical journal. 10 vitest cases lock determinism, monotonic `when` ordering, append-stability, and error cases (gaps, malformed filenames, empty dir).
- **Migration drift CI gate** in [api-ci.yml](.github/workflows/api-ci.yml): `migrate:journal:check` byte-compares the committed journal against what the regenerator would produce. A new SQL migration without a regenerated journal fails the PR with a one-command fix message, instead of silently skipping the migration at deploy time.
- **Cloud-migration preflight guard** at [packages/db/scripts/cloud-migration-preflight.ts](packages/db/scripts/cloud-migration-preflight.ts): `migrate:cloud` now refuses to invoke `drizzle-kit migrate` unless `MIGRATION_DATABASE_URL` is explicitly set. Defense-in-depth alongside the workflow-level `if [ -z "$MIGRATION_DATABASE_URL" ]` guard — protects callers outside the deploy workflow path. 5 vitest cases cover unset, empty string, whitespace-only, no-fallback-to-DATABASE_URL (locks the security intent), and a valid value.
- **Migration journal artifact** at [packages/db/migrations/meta/\_journal.json](packages/db/migrations/meta/_journal.json) — 17 entries covering every existing SQL migration. Committed as the source of truth for `drizzle-kit migrate`.

### Changed

- **`drizzle.config.ts` resolves `MIGRATION_DATABASE_URL` instead of runtime `DATABASE_URL`.** Was using `resolveDatabaseConnectionConfig` (runtime app_api credentials), now uses `resolveMigrationDatabaseConnectionConfig` (schema-owner credentials, with permissive fallback to DATABASE_URL preserved for `drizzle-kit studio` / `introspect` in local dev). The `migrate:cloud` preflight ensures the fallback never applies to cloud migration runs.
- **API healthcheck timeout** in [apps/api/railway.toml](apps/api/railway.toml) tightened from 60s to 5s. `/healthz` returns synchronously with no I/O ([apps/api/src/server.ts:137](apps/api/src/server.ts#L137)) — either responds in milliseconds or it's not responding at all. 5s gives Railway much faster signal when the process is hung.

### Documentation

- **CLAUDE.md gotchas** — two new entries: (1) regenerating the migration journal after adding a SQL file, (2) `MIGRATION_DATABASE_URL` posture (GH Actions only, never on a Railway service env per security #1).
- **docs/env-vars.md** — `STAGING_MIGRATION_DATABASE_URL` / `PROD_MIGRATION_DATABASE_URL` added to the CI-only secrets table; source-code references for `MIGRATION_DATABASE_URL` expanded to cite the new files; 2026-04-28 entry added to the change log.
- **docs/runbooks/local-development.md** — new "Adding A New Migration" section documenting the local vs cloud apply paths and the 5-step procedure (author → regenerate journal → reset → RLS test → commit both).

### Tooling

- **Workspace-aware ship discipline** — this release is the first to use the `staging` integration branch as the base for both feature-branch PRs and the deploy workflows. Both `deploy-staging.yml` and `deploy-prod.yml` continue to fire from their respective branches; no workflow trigger changes.

## [0.0.6.0] - 2026-04-26

Introduces the `@lewis/ui` shared design system. Each app now imports a single stylesheet that wires Tailwind v4, the Big Sky · Mineral paper tokens, the `.pill` button system, and self-hosted brand fonts. The directory homepage gets responsive mobile layouts and a rotating search placeholder. No backend, schema, or API changes.

### Added

- **`@lewis/ui` design system** — first-class shared package now exports a `Button` component (`primary` / `outline` / `soft` / `accent` variants, three sizes, optional pill-rounded), a `ButtonLink` anchor variant, and a `buttonClasses()` helper for non-button hosts (e.g. `<Link>`, Clerk's `<SignInButton>` child). Public CSS surface: `@lewis/ui/styles.css` plus per-layer entries (`/styles/tokens.css`, `/base.css`, `/buttons.css`, `/inputs.css`, `/fonts.css`).
- **Design tokens** — single source of truth in [packages/ui/src/styles/tokens.css](packages/ui/src/styles/tokens.css) using Tailwind v4's `@theme` block (auto-emits CSS custom properties on `:root` AND generates utility classes like `bg-paper`, `text-ink`, `rounded-button`). Mirrored in [packages/ui/src/tokens.ts](packages/ui/src/tokens.ts) for JS consumers (charts, animations, conditional logic). Color palette: paper / paper-deep / paper-card / paper-bright, ink / ink-soft / ink-faint, accent (Montana sky blue) / accent-soft, rule / rule-soft. Type, radii, motion, and shadow tokens in the same file.
- **Self-hosted brand fonts** — Inter Tight + Fraunces (variable weight, with italic axis) imported via `@fontsource-variable` in [packages/ui/src/styles/fonts.css](packages/ui/src/styles/fonts.css). Replaces the Google Fonts CDN link in the directory `index.html`. Required because the patient portal handles PHI and `fonts.googleapis.com` is not on the approved subprocessor list — self-hosting closes that vector.
- **Directory mobile layout** — homepage now scales correctly on phones: hero headline drops from 4.6rem to a clamp(2.8rem, 11vw, 3.4rem) range, multi-column problem/physician sections stack via `.grid-stack-mobile`, three- and four-up card sections become horizontal snap-carousels via `.grid-carousel-mobile`, and the announcement strip switches from absolute-positioned flex to a 3-column grid so wrapping text never collides with the Montana flag.
- **Rotating search placeholder** — directory hero search-pill rotates through five prompts ("Find your treatment" / "Search by condition" / "Search by treatment" / "Search by ETC" / "Search by symptom") on a 2.8s crossfade. Pauses on focus, hides while typing, respects `prefers-reduced-motion` (no setInterval, no transitions). Implemented as a positioned overlay so the `<input>` keeps a real `aria-label` instead of a placeholder attribute.
- **Test coverage** — [packages/ui/src/components/Button.test.tsx](packages/ui/src/components/Button.test.tsx) locks in the `accent` → `pill-primary` alias and the variant/size/rounded class composition.
- **`.link` opt-in utility** — [packages/ui/src/styles/base.css](packages/ui/src/styles/base.css) keeps the global `a { text-decoration: none }` rule for chrome/nav/card anchors and adds an opt-in `.link` class for inline prose anchors. Restores WCAG 1.4.1 affordance where it matters (text links inside paragraphs) without underlining every navigation anchor in the design system.
- **Real Montana flag asset** — [apps/directory/src/assets/montana-flag.svg](apps/directory/src/assets/montana-flag.svg) replaces the simplified inline `MontanaIcon` SVG with the actual state flag (1416×943 viewBox, full state seal). Rendered in the announcement strip and footer attribution as decorative chrome (`alt=""` + `aria-hidden`) since the surrounding copy already names Montana. ~61 KB gzipped, served once per session, browser-cached.

### Changed

- **Apps adopt `@lewis/ui`** — `apps/app`, `apps/patient`, and `apps/directory` each import `@lewis/ui/styles.css` once in `main.tsx`. Per-app `styles.css` files now contain only app-specific layout (the staff console's `.app-shell`, the patient portal's `.patient-shell`, the directory's hero/announce-strip/footer rules) — no more duplicated `:root` token blocks, button declarations, or font-family resets.
- **Tailwind v4 wired into all three apps** — `@tailwindcss/vite` plugin added to each `vite.config.ts`; `tailwindcss` and the plugin pinned at `^4.1.0`. The `@source` directives in [packages/ui/src/styles/index.css](packages/ui/src/styles/index.css) walk up to repo root and tell the Tailwind compiler which app source trees to scan for utility classes.
- **Sign-in buttons** — `apps/app` and `apps/patient` auth shells render `<Button>Sign in</Button>` instead of bare `<button>`s. Patient `PublicHome` link to `/me` now uses `pill pill-primary` for visual consistency.
- **Directory top-nav** — wordmark now reads `Lewis.health` with the period in `var(--accent)` (replacing the small accent-blue dot), the search circle in the nav switches from black ink to accent blue, and the "Browse Treatments" pill swaps to a shorter "Browse" label below 768px to fit the mobile chrome cleanly.
- **Italic accent words** — every italicized word on the directory homepage (`treatments`, `exist`, `actually`, `Questions`, `coming`) shifts to `color: var(--accent)` for a unified brand-forward emphasis pattern.
- **`pill-primary` paints Montana sky blue** — the variant moved from solid ink to the brand accent across all apps. `accent` is preserved as a typed alias of `primary` for callsite ergonomics; `.pill-accent` no longer exists as a separate ruleset.
- **Sign-in copy externalized via `react-intl`** — `apps/app` and `apps/patient` auth shells now render `<FormattedMessage id="auth.signIn">` inside the `<Button>` instead of a hard-coded "Sign in" string. Patient portal title also goes through `patient.portalTitle`. Per-app `messages/en.json` catalogs gain `auth.signIn` (both apps) and `patient.portalTitle` (patient). Patient auth tests wrapped in `<IntlProvider locale="en" messages={{}}>` so empty-catalog renders fall through to `defaultMessage`.
- **Directory footer recomposed** — three-column grid (`1fr auto 1fr`: attribution / wordmark / links) collapses to a two-column grid (`1fr auto`) where the Montana flag chip + `Lewis.health` wordmark are fused into the attribution row. Mobile stack ordering simplified; the wordmark and attribution are now one element, not two.
- **Announcement strip flag swap** — `<MontanaIcon>` SVG component replaced with `<img src={montanaFlag}>` referencing the new asset. Announcement strip and footer share the same flag asset (Vite dedupes the import), sized via the new `.announce-strip__flag-img` and `.footer-flag-img` rules in [apps/directory/src/styles.css](apps/directory/src/styles.css).
- **ETC profile phone link adopts `.link`** — the `tel:` anchor inside the contact panel on [apps/directory/src/pages/EtcProfilePage.tsx](apps/directory/src/pages/EtcProfilePage.tsx) now carries the `.link` class so it's visually distinguishable from surrounding address text (the rest of the address is plain prose).
- **Reduced-motion preference read synchronously on first render** — [apps/directory/src/pages/HomePage.tsx](apps/directory/src/pages/HomePage.tsx) `usePrefersReducedMotion` now uses a lazy initializer that reads `window.matchMedia('(prefers-reduced-motion: reduce)').matches` at mount. Removes the brief animation flash that occurred when the hook returned `false` before the effect ran. Defaults to `true` when `window`/`matchMedia` are unavailable so SSR and unsupported environments err on the safe side.

### Removed

- **Google Fonts CDN link** in [apps/directory/index.html](apps/directory/index.html). Brand fonts now load from the self-hosted `@fontsource-variable` packages — zero third-party requests at runtime.
- **`MontanaIcon` SVG component** removed from [apps/directory/src/components/icons.tsx](apps/directory/src/components/icons.tsx). Replaced by the real flag asset everywhere it was used (announcement strip + footer); no remaining call sites.

### Tooling

- **`.gstack/`** added to `.gitignore` for gstack analytics + checkpoint state.
- **CLAUDE.md skill-base override** documented: `/review`, `/ship`, `/land-and-deploy`, etc. always use `staging` as the base branch (never `main`, never the GitHub default). Single exception is the staging→main promotion PR.

## [0.0.5.0] - 2026-04-26

Rebrands the platform from Corridor to Lewis end-to-end. The product is now Lewis, served at `lewis.health` with `app.lewis.health`, `patient.lewis.health`, and `api.lewis.health` as the deployable surfaces. This is a wholesale rename: every brand string, domain, package name, database identifier, HTTP header, and Clerk metadata key now uses `lewis`. No functional behavior changes.

### Changed

- **Brand strings** — every `Corridor` / `corridor` reference renamed to `Lewis` / `lewis` across docs, code, comments, log lines, page titles, og:tags, and JSON-LD. The literal English word `corridors` (plural, hallway widths) in `docs/legislation/etc.md` is the only retained occurrence — it's the regulatory text from MAR Notice 2026-427.1, not the brand.
- **Domains** — `corridor.health` → `lewis.health`, plus all subdomain variants (`app`, `patient`, `api`, `www`, `app.staging`, `patient.staging`, `api.staging`, plus the cookie-domain `.corridor.health` for cross-subdomain Clerk session sharing). CORS allowlists, sitemap.xml, robots.txt, OpenAPI server URL, and CI workflow URLs all updated.
- **Workspace packages** — `@corridor/shared`, `@corridor/db`, `@corridor/rbac`, `@corridor/ui`, `@corridor/pdf`, `@corridor/notifications` renamed to `@lewis/*`. `tsconfig.base.json` paths, every workspace `package.json`, every importer in `pnpm-lock.yaml`, every CI workflow filter (`pnpm --filter @lewis/...`), and every source-file import statement updated together.
- **Postgres bootstrap** — local Docker bootstrap user/password `corridor` → `lewis`, database `corridor_dev` → `lewis_dev`. Runtime role passwords (`corridor_app_api`, `corridor_app_worker`) → `lewis_app_api`, `lewis_app_worker`. `packages/db/src/local-defaults.ts` is the authoritative source; the `config:local-defaults:check` drift gate keeps `docker-compose.yml`, env examples, and CI DSNs in lockstep.
- **Docker resources** — container names `corridor-postgres` / `corridor-redis` → `lewis-postgres` / `lewis-redis`. Volume keys flattened from `corridor_postgres_data` / `corridor_redis_data` to plain `postgres_data` / `redis_data` so Compose's project-name prefix produces the clean `lewis_postgres_data` / `lewis_redis_data` instead of the prior double-prefixed `corridor_corridor_*`.
- **Application role identifiers** — the `tenant_kind` enum value `corridor_internal` and the role strings `corridor_admin` / `corridor_support` are now `lewis_internal` / `lewis_admin` / `lewis_support` everywhere they appear (the `tenant_kind` enum in migration 0001, `app.role_grants_action` mapping in 0008/0010, audit-helper sentinel in 0009, NULL-tenant write check in 0016, RLS test fixtures in 0002/0005, `packages/rbac/src/index.ts`, `packages/shared/src/types.ts`, `apps/api/src/middleware/role.ts`, `apps/api/src/domains/internal-admin/routes.ts`, and the dev seed in `packages/db/scripts/seed-dev.ts`).
- **HTTP tenant header** — `x-corridor-tenant-id` / `X-Corridor-Tenant-Id` renamed to `x-lewis-tenant-id` / `X-Lewis-Tenant-Id` in the OpenAPI spec, CORS allowed-headers list, and the tenant-resolution middleware.
- **Clerk publicMetadata keys** — `corridorPortals` / `corridorDefaultPortal` renamed to `lewisPortals` / `lewisDefaultPortal`. `LEWIS_PORTALS_KEY` / `LEWIS_DEFAULT_PORTAL_KEY` constants exported from `@lewis/shared/clerk-metadata` are the single source of truth; staff-portal routing tests updated to match.
- **Code symbols** — `corridorQueueNames`, `CorridorQueueName`, `requireCorridorInternal` renamed to `lewisQueueNames`, `LewisQueueName`, `requireLewisInternal`. Pino logger `service` field is now `lewis-api` / `lewis-workers`. Boot log lines now read `lewis API listening` / `lewis workers ready`.
- **Environment variable** — `CORRIDOR_SEED_ALLOW_NON_LOCAL` (deliberate trap, always errors) renamed to `LEWIS_SEED_ALLOW_NON_LOCAL`. Documented in `env/.env.local.example` and `docs/env-vars.md`.
- **Misc identifiers** — age-key path `corridor-age-maintainer.key` → `lewis-age-maintainer.key`, fnox recipient comment emails, JSON-LD HTML id `corridor-jsonld` → `lewis-jsonld`, anonymous eligibility localStorage prefix `corridor:eligibility:` → `lewis:eligibility:`, and the planned HIPAA-eligible Supabase bucket `corridor-storage-prod` → `lewis-storage-prod`.

### Added

- **`docker compose up --wait` on `dev:infra`** — `pnpm run dev:infra` (called by `mise run dev`) now blocks on the postgres/redis healthchecks before returning. Eliminates the `read ECONNRESET` race where the api/workers connected mid-postgres-init on a fresh volume.

## [0.0.4.0] - 2026-04-26

Launches `apps/directory`, the public, anonymous, SEO-optimized patient directory served at `lewis.health`. Adds the public-API contract module (`packages/shared/src/api/public.ts`) the directory bundle hits, plus the monorepo glue to dev/build/lint the new app alongside `apps/app` and `apps/patient`. Aligns root `package.json` `version` (which had drifted to `0.0.1` across prior releases) with the canonical `VERSION` file at this release.

### Added

- **`apps/directory` patient directory app.** Vite/React/TypeScript SPA at [apps/directory/](apps/directory/) covering the homepage, browse catalog, treatment detail, ETC profile, eligibility self-screen, connect-request handoff, and supporting static pages. Bundle is **109.96 KB gzipped** for the homepage chunk (under the 120 KB above-the-fold budget). Anonymous-first by design — Clerk is intentionally not imported in the bundle so a pen-tester can confirm the directory has neither the code paths nor the credentials to access PHI. Cards and the top nav use real `<Link>` elements (crawlable + middle-clickable). The eligibility self-screen exposes a `role="progressbar"` and a `role="radiogroup"` of options that no longer auto-advance after a click (WCAG 2.1 AA).
- **WST-057 worked example.** Treatment detail page for the launch program (WST-057, WinSanTor, diabetic peripheral neuropathy) and ETC profile for the launch ETC (Big Sky ETC, Bozeman) are content-complete. Other programs are shown as muted "Coming soon" placeholders. Cost guidance, evidence link, and AE-summary rendering carry inline `[COUNSEL REVIEW]` markers.
- **Public-API contract module.** [packages/shared/src/api/public.ts](packages/shared/src/api/public.ts) defines Zod schemas for the `/v1/public/*` surface (programs, ETCs, eligibility sessions, connect requests) plus the two narrowly-scoped semi-authenticated endpoints (`/v1/patient/me/context`, `/v1/patient/account/link-anonymous-screen`). 15 schema tests in [public.test.ts](packages/shared/src/api/public.test.ts) lock the trust boundary the directory bundle depends on.
- **Anonymous eligibility-screen session.** [apps/directory/src/eligibility/anonymousSession.ts](apps/directory/src/eligibility/anonymousSession.ts) persists an opaque session token in `localStorage` keyed per-program. Token is generated client-side via `crypto.randomUUID` until the API endpoint is wired; the linkage to a patient user record happens at Clerk signup time on the connect-request flow.
- **SEO infrastructure.** Per-route `<title>`, `description`, `canonical`, `og:*`, `twitter:card` via [seo/useSeo.ts](apps/directory/src/seo/useSeo.ts). JSON-LD structured data (WebSite, ItemList, Drug, MedicalClinic) per page type. [public/robots.txt](apps/directory/public/robots.txt) (Disallow `/eligibility/`, `/connect/`) and a build-time-generated [public/sitemap.xml](apps/directory/public/sitemap.xml) via [scripts/generate-sitemap.mjs](apps/directory/scripts/generate-sitemap.mjs) (wired into `pnpm --filter directory build`).
- **Test suite for the new app.** 24 vitest tests in `apps/directory/src/**` covering the eligibility evaluator, anonymous-session round-trip (round-trip preserves data, per-program namespacing, corrupted-JSON tolerance, quota-error swallow, `crypto.randomUUID` happy path), catalog lookups, schema regex compliance, and axe-core a11y sweeps for HomePage, EligibilityPage, TreatmentDetailPage, and ConnectPage.
- **Shared `Panel` component.** [components/Panel.tsx](apps/directory/src/components/Panel.tsx) — the section-wrapper used on TreatmentDetailPage and EtcProfilePage. Renders an `h2` (axe-core caught a heading-order regression when the prior duplicate used `h3`).
- **`frontend_directory_dev` fnox profile.** Minimal-surface env-var profile in [fnox.toml](fnox.toml) for the directory app. No Stripe/Plaid keys; only `VITE_API_BASE_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`. Keeps the "directory bundle has no PHI code paths" pen-test posture verifiable.

### Changed

- **`mise.toml`, root `package.json`, `pnpm-workspace.yaml` glue.** New `dev:directory` task, `dev:all` now includes the directory app alongside app/patient/api/workers. [pnpm-workspace.yaml](pnpm-workspace.yaml) already covered `apps/*`.
- **`eslint.config.js` browser-globals block.** New scoped block for `apps/app/**`, `apps/patient/**`, `apps/directory/**` adds `window`, `localStorage`, `setTimeout`, `crypto`, etc. so frontend code lints cleanly without polluting API/workers globals (where `localStorage` is still a hard error).
- **`.claude/rules/frontend.md` adds `apps/directory/**` path.** Codifies the directory's bundle (<120 KB above-the-fold), API surface (`/v1/public/\*` only), and Clerk-lazy-load rules so future edits stay within the pen-test posture.
- **Public schemas re-exported from `@lewis/shared/api`.** [packages/shared/src/api/index.ts](packages/shared/src/api/index.ts) now re-exports `./public.js`.

### Notes

- **Directory data is static seed for launch.** [apps/directory/src/data/catalog.tsx](apps/directory/src/data/catalog.tsx) holds the WST-057 + Big Sky ETC fixtures the directory renders today. Once the public API endpoints land, the directory swaps the static data for the typed client in [apps/directory/src/api/client.ts](apps/directory/src/api/client.ts) (already wired with `ApiNetworkError` / `ApiSchemaError` and dev-mode `localhost:13001` fallback so a missing `VITE_API_BASE_URL` cannot accidentally hit prod).
- **Cross-subdomain Clerk session is documented but not implemented.** The directory bundle does not yet detect an existing `.lewis.health` session cookie. The connect-request flow will lazy-load Clerk and deep-link into `patient.lewis.health` once `packages/auth` is scaffolded — the comment block in [apps/directory/src/pages/ConnectPage.tsx](apps/directory/src/pages/ConnectPage.tsx) documents the contract.
- **Tailwind preset, SSG, and full lazy-route splitting are deferred.** The directory uses CSS variables (matching the design source AS IS) instead of Tailwind extensions; the homepage SPA is under the 120 KB budget without `React.lazy`. Both can land in a follow-up PR with no rework to the existing pages.
- **`VERSION` and root `package.json` realigned at this release.** Prior `/ship` runs left root `package.json` at `0.0.1` while the canonical `VERSION` advanced; this release sets both to `0.0.4.0` to remove the drift.

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
- **Shared Clerk metadata schemas.** `packages/shared/src/clerk-metadata.ts` defines zod schemas for the `publicMetadata` / `privateMetadata` shape Lewis stores on Clerk users (`active_tenant_id`, `role`, `support_ticket_id`). One source of truth for JWT-claim validation across API and frontends.
- **Three CI drift gates.** `secrets:profiles:check` asserts `SUPABASE_SERVICE_ROLE_KEY` lives only in `workers_elevated_dev`. `contracts:openapi:check` asserts `apps/api/src/openapi.ts` paths match the live Hono route graph. `config:local-defaults:check` asserts `env/.env.local.example`, `docker-compose.yml` ports, and the database client defaults all agree. All three wire into [api-ci.yml](.github/workflows/api-ci.yml) and [pr.yml](.github/workflows/pr.yml).
- **End-to-end env-var tracker.** [docs/env-vars.md](docs/env-vars.md) documents every env var across `apps/api`, `apps/workers`, `apps/workers-elevated`, `apps/app`, `apps/patient`, `packages/db`, and CI. Includes sprint-timing matrix, gap closure log, source-code reference table, and onboarding/offboarding playbook for fnox recipients.
- **Local runtime-role provisioning.** `packages/db/scripts/setup-local-runtime-roles.ts` provisions `app_api` and `app_worker` against a local Postgres with the right grants. `packages/db/scripts/_local-safety.ts` gates seed/reset operations behind a hard "is this localhost" check; `LEWIS_SEED_ALLOW_NON_LOCAL` is documented as a deliberate trap, not an override.
- **`apps/workers/src/database-env.ts`** centralizes worker DB env parsing with `.test.ts` coverage so `WORKER_DATABASE_URL` / `WORKER_DB_*` semantics live in one place.

### Changed

- **fnox.toml restructured to 2.x format.** Migrated from legacy `[[recipients]]` + `[profiles.*] secrets = [...]` to `[providers.age]` + per-profile `[profiles.*.secrets]` per-key. Restored `RESEND_WEBHOOK_SECRET` to the `api_dev` profile (it was dropped mid-restructure; re-aligned with `env/.env.api.example` for Sprint 4 wiring).
- **Env templates moved to `env/`.** The six `.env.*.example` templates now live in `env/` with documented headers explaining what each is, who reads it (fnox profile vs `.env.local` vs Vercel/Railway), and where the real values come from. The redundant `env/.env.example` (a 3-line subset of `.env.local.example` with no consumers) was deleted.
- **CI workflow Postgres URL.** `.github/workflows/api-ci.yml` and `.github/workflows/pr.yml` switched from the old `54322`-port `DATABASE_URL` to the matching `app_api`/`15432` runtime URL plus `MIGRATION_DATABASE_URL` and `REDIS_URL`. RLS semantic tests now run on CI against the same Docker Postgres that `db:up` brings up, replacing the previous "skipped on CI" workaround.
- **OpenAPI spec regenerated.** `apps/api/src/openapi.ts` re-emitted from the current Hono route graph; `contracts:openapi:check` now keeps it honest going forward.

### Fixed

- **Five env-var code-vs-config gaps.** `WORKER_ELEVATED`, `WORKER_RUNTIME_ROLE_OPT_OUT`, `API_RUNTIME_ROLE_OPT_OUT`, `LEWIS_SEED_ALLOW_NON_LOCAL`, and `RESEND_WEBHOOK_SECRET` were referenced in source but undeclared in any template or fnox profile. All five are now documented in their respective `env/.env.*.example` files and (where applicable) the matching fnox profile.

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
- **Hono API server with Clerk auth + tenant resolution.** Three composable middlewares: `requireClerkAuth` (verifies Clerk session JWT), `resolveTenant` (looks up Lewis user_id + role from `tenant_memberships` against `x-lewis-tenant-id` header), `withDbContext` (per-request transaction with `app.*` session vars set, COMMIT on 2xx, ROLLBACK otherwise).
- **Webhook signature verification.** `/v1/webhooks/{clerk,stripe,plaid,resend}` reject unsigned requests. Clerk + Resend use Svix three-header scheme; Stripe uses official SDK `webhooks.constructEvent`; Plaid implements full ES256 JWT verification with cached verification keys, body-hash check via `timingSafeEqual`, and 5-minute replay window.
- **API security middleware stack.** `secureHeaders` (HSTS, strict CSP, X-Frame-Options DENY, Referrer-Policy no-referrer), CORS allowlist sourced from `CORS_ALLOWED_ORIGINS` env (boot-fails if missing in non-test), 1MB body limit, Redis-backed rate limiter with four layered scopes (public 600/min/IP, readyz 60/min/IP, webhooks 120/min/IP, authed 6000/min/tenant), Redis-backed `Idempotency-Key` middleware (24h TTL, fingerprints `(method, path, body sha256)`, 409 on key reuse with different body).
- **Role enforcement on internal-admin.** `requireRole("lewis_admin")` middleware + `X-Support-Ticket-Id` header validation + `app.write_audit()` row written in the same transaction per CLAUDE.md break-glass posture.
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
