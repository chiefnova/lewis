# Lewis Deploy State Tracking

This is the audit trail of every deployment-related identifier, dashboard setting, secret name, env-var location, and external-service config that has been provisioned for Lewis. Update by hand each time something is set, changed, or moved. Names and locations are committed; **never paste actual secret values here** — those live in fnox / GitHub / Vercel / Railway only.

Originally drafted as a personal LOCAL-only file; promoted to a tracked repo doc in v0.0.6.2 because the gate rollout produced enough multi-platform operational state (Railway dashboard cleanups, Vercel gate env vars, worker DSN encoding) that an off-repo file was no longer the right home.

Last updated: 2026-05-01 (v0.0.9.0 — API Dockerfile gains apt chromium + fonts for synchronous program brief PDF rendering; see "API Dockerfile chromium support" below)

## 🟡 DEFERRED — Stripe, Plaid, Resend, Sentry, PostHog

These services are **commented out across the stack** until provider accounts are created and webhook endpoints go live. App code uses each via lazy `requiredEnv()` calls, so the API + workers boot fine without them — errors only surface when the corresponding webhook route is hit, which won't happen until each provider is wired and an endpoint is registered.

| Service | What's commented | Where |
|---|---|---|
| **Stripe** (PRD § 14) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY` | `fnox.toml` (api_dev, workers_dev, frontend_app_dev, frontend_patient_dev, ci); `env/.env.api.example`, `.env.workers.example`, `.env.app.example`, `.env.patient.example`; `.github/workflows/prod-release-frontend.yml:45` |
| **Plaid** (PRD § 14.4) | `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_WEBHOOK_SECRET`, `PLAID_ENV` | `fnox.toml` (api_dev, ci); `env/.env.api.example` |
| **Resend** (PRD § 13) | `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` | `fnox.toml` (api_dev, workers_dev, ci); `env/.env.api.example`, `.env.workers.example` |
| **Sentry** (PRD § 18) | `SENTRY_DSN`, `VITE_SENTRY_DSN` | `fnox.toml` (api_dev, workers_dev, workers_elevated_dev, frontend_app_dev, frontend_patient_dev, frontend_directory_dev, ci); all `env/.env.*.example`; `.github/workflows/prod-release-frontend.yml:47` |
| **PostHog** (PRD § 18.4) | `VITE_POSTHOG_KEY` | `fnox.toml` (frontend_directory_dev); `env/.env.directory.example`; `.github/workflows/prod-release-frontend.yml:48` |

**To re-enable:** uncomment the matching lines, `fnox set` real values into each declared profile, and add the matching `*_STAGING` / `*_PROD` GitHub repo secrets where the workflow references them.

---

## Where each piece of config lives

The Lewis stack pulls config from five places. Track them separately so we know what's where.

1. **Repo files** (committed, in `git`) — non-secret defaults, examples, drift sources
2. **GitHub Environments** — deploy gates per environment (`staging`, `production`)
3. **GitHub repo Secrets/Variables** — read by GitHub Actions workflows
4. **Vercel project Environment Variables** — read by the Vercel build at deploy time (per-project, per-env)
5. **External service dashboards** — Clerk / Stripe / Sentry / PostHog / Supabase / Railway provide the actual values

---

## ✅ SET — GitHub Environments

| Name | Created | Protection rules | Branch policy | Notes |
|---|---|---|---|---|
| `staging` | 2026-04-25T15:27:54Z (auto-created on first staging deploy run) | 0 | none | Used by `deploy-staging.yml` job |
| `production` | 2026-04-27T01:05:09Z (this session) | 0 | none | Used by `deploy-prod.yml` job. **TODO: add yourself as required reviewer once first prod deploy is imminent.** |

To add a required reviewer later: github.com/chiefnova/lewis → Settings → Environments → production → Required reviewers → add `gabeviggers` or `chiefnova`.

---

## ✅ SET — GitHub repo Variables (`gh variable list`)

Repo variables are non-secret, readable by anyone with repo access. They're used as overridable defaults for fallback URLs in workflows (`${{ vars.X || 'fallback' }}`).

| Name | Value | Set | Used by |
|---|---|---|---|
| `STAGING_DIRECTORY_URL` | `https://staging.lewis.health` | 2026-04-27T01:05:09Z | `deploy-staging.yml` (e2e job) |
| `PROD_DIRECTORY_URL` | `https://lewis.health` | 2026-04-27T01:05:10Z | `deploy-prod.yml` (e2e job) |
| `STAGING_APP_URL` | `https://app.staging.lewis.health` | 2026-04-27T01:05:10Z | `deploy-staging.yml` (e2e job) |
| `PROD_APP_URL` | `https://app.lewis.health` | 2026-04-27T01:05:11Z | `deploy-prod.yml` (e2e job) |
| `STAGING_PATIENT_URL` | `https://patient.staging.lewis.health` | 2026-04-27T01:05:11Z | `deploy-staging.yml` (e2e job) |
| `PROD_PATIENT_URL` | `https://patient.lewis.health` | 2026-04-27T01:05:11Z | `deploy-prod.yml` (e2e job) |
| `STAGING_API_ORIGIN_URL` | `https://api.staging.lewis.health` | 2026-04-27T01:05:12Z | `deploy-staging.yml` (e2e API liveness check) |
| `PROD_API_ORIGIN_URL` | `https://api.lewis.health` | 2026-04-27T01:05:12Z | `deploy-prod.yml` (e2e API liveness check) |

---

## ✅ SET — GitHub repo Secrets (`gh secret list`)

Secrets are write-only via the API — values can't be read back. Use the dashboard or `gh secret set` to update.

| Name | Set | Used by | Source |
|---|---|---|---|
| `FNOX_CI_AGE_KEY` | 2026-04-25T15:16:20Z (pre-existing) | All CI workflows that run `mise run install` and need to decrypt fnox-encrypted blobs | Generated locally via `age-keygen`; private key lives only in GH secret |
| `VITE_API_BASE_URL_STAGING` | 2026-04-27T01:05:13Z | `prod-release-frontend.yml` (manual workflow_dispatch deploy) | Hardcoded URL — `https://api.staging.lewis.health` |
| `VITE_API_BASE_URL_PROD` | 2026-04-27T01:05:13Z | `prod-release-frontend.yml` | Hardcoded URL — `https://api.lewis.health` |
| `VITE_CLERK_PUBLISHABLE_KEY_STAGING` | 2026-04-27T01:34:30Z | `prod-release-frontend.yml` (line 44) | Clerk dashboard → staging instance → API Keys → Publishable key (`pk_test_*`). Same value as fnox `frontend_*_dev` profiles — local + staging share one Clerk instance for now. |
| `VITE_CLERK_PUBLISHABLE_KEY_PROD` | 2026-04-27T01:47:42Z | `prod-release-frontend.yml` (line 44) | Same `pk_test_*` value as staging for now — staging+prod share Clerk instance until first real users. |
| `STAGING_DIRECTORY_DEPLOY_HOOK_URL` | 2026-04-27T02:02:12Z | `deploy-staging.yml` (line 39) | Vercel project `lewis-directory-staging` → Settings → Git → Deploy Hooks (branch: `staging`). |
| `PROD_DIRECTORY_DEPLOY_HOOK_URL` | 2026-04-27T02:02:12Z | `deploy-prod.yml` (line 41) | Vercel project `lewis-directory` → Settings → Git → Deploy Hooks (branch: `main`). |

---

## ✅ SET — fnox encrypted secrets (committed in `fnox.toml`)

Local + CI secrets, age-encrypted in-repo. Decryptable only by recipients listed in `[providers.age]`. Identity file: `~/.config/fnox/age.txt` (default fnox path) — symlinked from the pre-rebrand `~/.config/corridor-age-maintainer.key` since the v0.0.5.0 rebrand left local key paths behind.

| Profile | Key | Set | Notes |
|---|---|---|---|
| `frontend_directory_dev` | `VITE_CLERK_PUBLISHABLE_KEY` | 2026-04-27T01:33Z | Clerk staging instance publishable key (`pk_test_*`) |
| `frontend_app_dev` | `VITE_CLERK_PUBLISHABLE_KEY` | 2026-04-27T01:33Z | Same key (shared Clerk instance for staff/manufacturer/ETC console) |
| `frontend_patient_dev` | `VITE_CLERK_PUBLISHABLE_KEY` | 2026-04-27T01:33Z | Same key (shared Clerk instance for patient portal) |
| `ci` | `VITE_CLERK_PUBLISHABLE_KEY` | 2026-04-27T01:33Z | CI builds against same staging Clerk |
| `api_dev` | `CLERK_SECRET_KEY` | 2026-04-27T01:34Z | Server-side Clerk JWT verification (`sk_test_*`) — never reaches browser |
| `workers_dev` | `CLERK_SECRET_KEY` | 2026-04-27T01:34Z | Same — workers may verify Clerk-issued JWTs for queued jobs |
| `ci` | `CLERK_SECRET_KEY` | 2026-04-27T01:34Z | CI integration tests verify against staging Clerk |

Verifying commands (require local age identity at `~/.config/fnox/age.txt`):

```bash
fnox check -P frontend_directory_dev   # schema + provider health
fnox get   -P frontend_directory_dev VITE_CLERK_PUBLISHABLE_KEY
fnox get   -P api_dev                 CLERK_SECRET_KEY
```

> **fnox.toml top-level `age_key_file = "~/.config/lewis-age-maintainer.key"` is currently a no-op** — the age provider falls back to the default `~/.config/fnox/age.txt`. Either move the directive into `[providers.age]` or remove it. Tracked as a follow-up cleanup.

---

## ❌ PENDING — GitHub repo Secrets (must be set after creating Vercel/Railway projects + Clerk apps + Sentry/PostHog projects)

### Vercel deploy hook URLs (set after Phase 2 / Phase 3 of the deploy plan)

Each comes from Vercel project → Settings → Git → Deploy Hooks → Create Hook.

| Name | Source | What unblocks |
|---|---|---|
| `STAGING_DIRECTORY_DEPLOY_HOOK_URL` | Vercel project `lewis-directory-staging` (branch: `staging`) | `deploy-staging.yml` directory step |
| `PROD_DIRECTORY_DEPLOY_HOOK_URL` | Vercel project `lewis-directory-production` (branch: `main`) | `deploy-prod.yml` directory step |
| `STAGING_APP_DEPLOY_HOOK_URL` | Vercel project `lewis-app-staging` (branch: `staging`) | `deploy-staging.yml` app step |
| `PROD_APP_DEPLOY_HOOK_URL` | Vercel project `lewis-app-production` (branch: `main`) | `deploy-prod.yml` app step |
| `STAGING_PATIENT_DEPLOY_HOOK_URL` | Vercel project `lewis-patient-staging` (branch: `staging`) | `deploy-staging.yml` patient step |
| `PROD_PATIENT_DEPLOY_HOOK_URL` | Vercel project `lewis-patient-production` (branch: `main`) | `deploy-prod.yml` patient step |

### Railway deploy hook URLs

Each comes from Railway service → Settings → Deploy Triggers (or webhook URL).

| Name | Source | What unblocks |
|---|---|---|
| `STAGING_API_DEPLOY_HOOK_URL` | Railway API service (staging environment) | `deploy-staging.yml` API step |
| `PROD_API_DEPLOY_HOOK_URL` | Railway API service (production environment) | `deploy-prod.yml` API step |
| `STAGING_WORKERS_DEPLOY_HOOK_URL` | Railway workers service (staging environment) | `deploy-staging.yml` workers step |
| `PROD_WORKERS_DEPLOY_HOOK_URL` | Railway workers service (production environment) | `deploy-prod.yml` workers step |

### Frontend build-time secrets

Used by the manual `prod-release-frontend.yml` workflow to bake `VITE_*` values into the build artifacts.

| Name | Source | Notes |
|---|---|---|
| ~~`VITE_CLERK_PUBLISHABLE_KEY_STAGING`~~ ✅ set 2026-04-27 | Clerk dashboard → staging app → API Keys | `pk_test_*` |
| `VITE_CLERK_PUBLISHABLE_KEY_PROD` | Clerk dashboard → production app → API Keys | `pk_live_*` |
| `VITE_STRIPE_PUBLISHABLE_KEY_STAGING` | Stripe dashboard → test mode → API keys | `pk_test_*` |
| `VITE_STRIPE_PUBLISHABLE_KEY_PROD` | Stripe dashboard → live mode → API keys | `pk_live_*` |
| `VITE_SENTRY_DSN` | Sentry → frontend project → Client Keys | Single DSN used by all frontend builds (revisit if we split per-env Sentry projects) |
| `VITE_POSTHOG_KEY_STAGING` | PostHog → staging project → Project API Key | `phc_*` |
| `VITE_POSTHOG_KEY_PROD` | PostHog → production project → Project API Key | `phc_*` |

---

## 🟡 PARTIAL — Vercel project Environment Variables

Set in Vercel dashboard per-project on the Production scope of each project (Vercel calls the auto-deployed branch "Production" regardless of which git branch it tracks).

### ✅ `lewis-directory-staging` Vercel project (branch: `staging` git → Vercel "Production" scope) — set 2026-04-27

| Variable | Value | Status |
|---|---|---|
| `VITE_API_BASE_URL` | `https://api.staging.lewis.health` | ✅ set 2026-04-27 |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_*` (staging Clerk app, copied from fnox `frontend_directory_dev`) | ✅ set 2026-04-27 |
| `VITE_SENTRY_DSN` | staging Sentry DSN | deferred (Sentry deferred) |
| `VITE_POSTHOG_KEY` | `phc_*` (staging PostHog) | deferred (PostHog deferred) |

### ✅ `lewis-directory-production` Vercel project (branch: `main` git → Vercel "Production" scope) — set 2026-04-27

| Variable | Value | Status |
|---|---|---|
| `VITE_API_BASE_URL` | `https://api.lewis.health` | ✅ set 2026-04-27 |
| `VITE_CLERK_PUBLISHABLE_KEY` | same `pk_test_*` as staging (Clerk staging+prod share until first real users) | ✅ set 2026-04-27 |
| `VITE_SENTRY_DSN` | prod Sentry DSN | deferred (Sentry deferred) |
| `VITE_POSTHOG_KEY` | `phc_*` (prod PostHog) | deferred (PostHog deferred) |

### `lewis-app-staging` / `lewis-app-production` Vercel projects (apps/app)

Same shape as directory plus the staff/business surface keys:
- `VITE_API_BASE_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY` (manufacturer billing UX)
- `VITE_SENTRY_DSN`

### `lewis-patient-staging` / `lewis-patient-production` Vercel projects (apps/patient)

Same shape as app:
- `VITE_API_BASE_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_SENTRY_DSN`

---

## ❌ PENDING — Vercel project settings (per project, in dashboard)

For each Vercel project the directory will use:

| Setting | Value |
|---|---|
| Root Directory | `apps/directory` |
| Framework Preset | Vite |
| Build Command | `cd ../.. && pnpm --filter directory build` |
| Output Directory | `dist` |
| Install Command | `cd ../.. && pnpm install --frozen-lockfile` |
| Node version | 20.x |
| Production Branch | `staging` (for staging project) / `main` (for prod project) |
| Custom Domains | `staging.lewis.health` (staging) / `lewis.health` + `www.lewis.health` (prod) |

For `lewis-app-*` and `lewis-patient-*` Vercel projects, swap `apps/directory` → `apps/app` / `apps/patient`. Same monorepo build pattern.

---

## ❌ PENDING — Railway projects (API + workers, per env)

Per [docs/implementation.md:471](docs/implementation.md#L471):
- Three Railway projects: `dev`, `staging`, `prod`
- Per project: Postgres-equivalent (we use Supabase Postgres so probably skip), Redis service, API service, workers service

Each Railway service needs:
- All `*_DATABASE_URL` (provided by Supabase)
- All `REDIS_URL`
- All third-party API keys per the relevant fnox profile (`api_dev`, `workers_dev`, `workers_elevated_dev`)
- See `fnox.toml` for the canonical list of per-runtime secrets

The `SUPABASE_SERVICE_ROLE_KEY` lives ONLY in the elevated workers service. Never in API. Never in regular workers. Never in any frontend.

---

## ❌ PENDING — DNS

Per the deploy plan, in Cloudflare (or whoever holds `lewis.health`):

| Hostname | Type | Target |
|---|---|---|
| `lewis.health` (apex) | A or ALIAS | `76.76.21.21` (or Vercel CNAME flattening) |
| `www.lewis.health` | CNAME | `cname.vercel-dns.com` |
| `staging.lewis.health` | CNAME | `cname.vercel-dns.com` |
| `app.lewis.health` | CNAME | `cname.vercel-dns.com` |
| `app.staging.lewis.health` | CNAME | `cname.vercel-dns.com` |
| `patient.lewis.health` | CNAME | `cname.vercel-dns.com` |
| `patient.staging.lewis.health` | CNAME | `cname.vercel-dns.com` |
| `api.lewis.health` | CNAME | Railway-provided (or `<your-project>.up.railway.app`) |
| `api.staging.lewis.health` | CNAME | Railway-provided |

TLS is auto-issued by Vercel (Let's Encrypt). Railway also auto-issues. Usually <60 seconds after DNS propagates.

---

## ❌ PENDING — External service accounts (one-time setup)

| Service | What we need | Source | BAA required? |
|---|---|---|---|
| Vercel | Team / project access; deploy hooks | dashboard | YES for `app` + `patient` (PHI). NO for `directory` (anonymous-first by design). |
| Railway | Two projects (staging, prod); API + workers + Redis services per project | dashboard | YES — API and workers handle PHI |
| Supabase | Two projects (staging, prod); HIPAA-eligible bucket `lewis-storage-prod` | dashboard | YES |
| Clerk | Two applications (staging + prod); MFA enforced for staff portals | dashboard | YES (Clerk has BAA on Production tier) |
| Stripe | Healthcare-eligible account; test + live API keys; webhook endpoint signing secret | dashboard | YES |
| Plaid | Production keys + webhook URL | dashboard | YES |
| Resend | `lewis.health` domain SPF/DKIM verified; sandbox + prod API keys | dashboard | YES (BAA available) |
| Sentry | One project per env × frontend/backend split | dashboard | YES (Business plan has BAA) |
| PostHog | One project per env (or self-hosted for max privacy posture) | dashboard | NO if self-host; YES if cloud and PHI ever touches it (we plan to redact) |

---

---

## ✅ SET — Pre-launch password gate (v0.0.6.2)

Vercel Edge Middleware that gates `lewis.health`, `app.lewis.health`, and `patient.lewis.health` while the apps are being built. Lives in [packages/gate/](../packages/gate/). Removed via cleanup PR before public launch.

### Vercel env vars (per project, Production + Preview scope)

Set on each of the six Vercel projects (`lewis-directory-{staging,production}`, `lewis-app-{staging,production}`, `lewis-patient-{staging,production}`):

| Variable | Value | Notes |
|---|---|---|
| `LEWIS_GATE_PASSWORD` | `WST-057` (current staging) | The access password. Rotate by changing this and redeploying. |
| `LEWIS_GATE_SECRET` | 32-byte random hex (`openssl rand -hex 32`) | **Distinct per project** so a stolen cookie from one app cannot unlock the others. |
| `LEWIS_GATE_DISABLED` | unset (will be `true` later) | Kill switch — set to `true` to bypass the gate without removing code. First step of the removal sequence. |

NOT in `fnox.toml` per CLAUDE.md security rule #1 ("Production and staging secrets live in Vercel/Railway env vars only — never in fnox").

Local dev defaults are baked into [packages/gate/src/vite.ts](../packages/gate/src/vite.ts:74) (`DEV_DEFAULT_PASSWORD = "WST-057"`, `DEV_DEFAULT_SECRET = "dev-only-non-secret-do-not-use-in-prod"`) so `mise run dev:*` works with no env setup. Production must NOT use those defaults.

### Verifying via MCP

```bash
mcp__Railway__list-variables   # check Railway service env (gate vars NOT expected here — frontend-only)
mcp__vercel__list_projects     # find the 6 Vercel project IDs
# Vercel env vars: dashboard or `vercel env ls` from a linked project dir
```

---

## ✅ SET — Railway dashboard cleanups (v0.0.6.2)

These settings are dashboard-only — not exposable in `railway.toml` ([schema](https://backboard.railway.app/railway.schema.json) does not include `rootDirectory`, `buildCommand`, or `startCommand`). They MUST be cleared in the dashboard. Pre-existing dashboard values were leftovers from the Railpack era that broke Dockerfile builds in v0.0.6.2.

| Service (env) | Field (dashboard path) | Was | Set to | Symptom if wrong |
|---|---|---|---|---|
| `lewis-api` (staging) | Settings → Source → **Root Directory** | `/apps/api` | (blank) | Every `COPY pnpm-lock.yaml` etc. fails: "not found" |
| `lewis-api` (staging) | Settings → Build → **Build Command** | `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter api build` | (blank) | Ignored for Dockerfile builds, but signals dashboard drift |
| `lewis-api` (staging) | Settings → Deploy → **Custom Start Command** | `/apps/api/Dockerfile` | (blank) | `The executable /apps/api/dockerfile could not be found.` at container start |
| `lewis-worker` (staging) | (already clean) | — | — | — |
| `lewis-api` (production) | (no service yet) | — | — | When the production env is wired up later, repeat the same cleanup checklist before the first Dockerfile deploy |
| `lewis-worker` (production) | (no service yet) | — | — | Same |

The Railway service IDs (per staging environment) are useful for log queries:
- `lewis-api`: `bd865e67-8fa3-4904-a22c-5e5df40700a2`
- `lewis-worker`: `589784a9-3049-47e1-8822-5bb0677f7344`
- `Redis`: `1f694f37-b978-4d16-897d-93420855c56a`

Project ID: `983fe394-60b4-4b9c-966a-5fb25850e0d6` ([dashboard](https://railway.com/project/983fe394-60b4-4b9c-966a-5fb25850e0d6)).

### Railway BuildKit cache mount policy

Removed from both [apps/api/Dockerfile](../apps/api/Dockerfile) and [apps/workers/Dockerfile](../apps/workers/Dockerfile) in v0.0.6.2. Railway's BuildKit requires cache mount IDs to be hardcoded as `s/<service-id>-<target>` per service ([Railway docs](https://docs.railway.com/guides/dockerfiles)) and explicitly disallows env vars / ARGs in cache IDs. Hardcoding service IDs would break future production deploys, so the cache mounts are removed entirely. Cold-build cost ~30–60s per service; portability across staging and production was the priority.

If you ever decide to re-add cache mounts (faster CI/Railway rebuilds), use the actual service IDs above and remember to update them when the production env spins up its own services.

---

## ✅ SET — API Dockerfile chromium support (v0.0.9.0)

Slice 3 added `/v1/public/programs/:slug/brief.pdf` — synchronous Puppeteer-rendered single-page clinician brief PDF. The API container now needs Chromium at runtime. Decision was to apt-install Debian's `chromium` instead of letting puppeteer download its bundled Chrome (smaller image, Debian security tracking, reproducible per base-image-digest).

Changes in [apps/api/Dockerfile](../apps/api/Dockerfile):

| Stage | Change | Why |
|---|---|---|
| `builder` | `ENV PUPPETEER_SKIP_DOWNLOAD=true` | Skip the 280MB Chromium download during `pnpm install` — the runtime stage uses apt's chromium instead. |
| `runtime` | `apt-get install -y chromium fonts-liberation fonts-noto-color-emoji` (added alongside existing tini/ca-certificates/tzdata) | Provides Chromium + a fallback font set so the brief PDF's Fraunces+Inter (loaded via Google Fonts at render time) doesn't show .notdef squares if the CDN ever blips. |
| `runtime` | `ENV PUPPETEER_SKIP_DOWNLOAD=true PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium` | Tells puppeteer where to find the apt binary at launch. |

Operational implications:

- **Image size**: API container grows by ~170 MB (chromium + libs + fonts).
- **Cold-start latency**: First brief.pdf request after container start launches Chromium (~500 ms-1 s on healthy hardware). Subsequent requests reuse the warm shared `Browser` instance via [packages/pdf/src/render.ts](../packages/pdf/src/render.ts).
- **SIGTERM**: [apps/api/src/index.ts](../apps/api/src/index.ts) lazy-imports `disposeRenderer` so graceful shutdown closes the shared browser before process exit. Captures both `sharedBrowser` and any in-flight `launchPromise` so a launch resolving mid-shutdown still gets closed.
- **Optional runtime override**: `PUBLIC_SITE_URL` (Railway env, optional — defaults to `https://lewis.health`) controls the footer link in the rendered PDF.

Workers Dockerfile is **unchanged**. `apps/workers/Dockerfile` lines 155-156 keep the chromium install commented out — workers run the BullMQ `pdf` queue for future PHI-bearing async PDFs (patient_agreement, ETRB annual, AE reports), which renders separately and synchronously inside the API request path is the wrong pattern for those.

No new Railway/Vercel env vars required. The brief.pdf endpoint is gated by the existing `public_program_briefs` rate limit (30 req/min/IP) and absorbed by Cloudflare's edge cache (1h max-age + 24h SWR per directoryprd § 28.4).

---

## ✅ SET — Worker DSN URL encoding (v0.0.6.2)

Supabase pooler-generated passwords occasionally contain `/` characters that break standard URL parsing. The worker's zod env validation catches this with `path: ["DATABASE_URL"], invalid_string`.

Fix: URL-encode the slash to `%2F` in `WORKER_DATABASE_URL`. Same credential at the Postgres protocol level — it's just escaped for URL parsers. The api's `DATABASE_URL` doesn't need the same fix today (its password happens to not contain `/`) but apply the same workaround if Supabase regenerates with a `/`-containing password.

```
# BEFORE (zod rejects):
WORKER_DATABASE_URL=postgres://app_worker.<id>:<pw>/<more>=@aws-1-us-west-2.pooler.supabase.com:6543/postgres

# AFTER (works):
WORKER_DATABASE_URL=postgres://app_worker.<id>:<pw>%2F<more>=@aws-1-us-west-2.pooler.supabase.com:6543/postgres
```

The trailing `=` characters in passwords are URL-safe in the userinfo portion; only `/` needs encoding for current parsers.

---

## How to update this file

When you set a new variable / secret / domain / service config, find its section above, mark it ✅ (move from PENDING → SET), record the value-pattern (NOT the actual value) and the date.

If you need to inspect what's actually set, the verifying commands:

```bash
gh api /repos/chiefnova/lewis/environments --jq '.environments[].name'
gh variable list
gh secret list                # names only — values are write-only
gh secret list --env staging  # env-scoped secrets
gh variable list --env staging
```

For Vercel: dashboard → project → Settings → Environment Variables. Or `vercel env ls` from the CLI inside the project.

For Railway: dashboard → service → Variables. Or `railway variables` from the CLI.
