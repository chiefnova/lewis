# syntax=docker/dockerfile:1.7
#
# apps/api/Dockerfile
# -------------------
# Production container for the Lewis Hono API. Built and run by Railway
# (see docs/LOCAL_DEPLOY_TRACKING.md → Railway services). Build context is
# the repository root so the pnpm workspace resolves; set
# RAILWAY_DOCKERFILE_PATH=apps/api/Dockerfile in the Railway service.
#
# Why a hand-written Dockerfile and not Railway's auto-detect:
#   1. HIPAA audit posture — the build pipeline is reviewable and pinned.
#   2. Reproducibility — exact Node + pnpm + image digest in every deploy.
#   3. Vendor portability — runs on any container runtime if Railway has to
#      be replaced for BAA or cost reasons.
#   4. Slim runtime image, smaller attack surface, faster cold starts.
#
# Why tsx at runtime instead of node-on-compiled-JS: workspace packages
# under packages/* export TypeScript directly (`exports: { ".":
# "./src/index.ts" }`). Node cannot execute those at runtime, so the
# `tsc`-emitted apps/api/dist/ JS still resolves to .ts files via the
# pnpm-symlinked workspace. tsx handles the TS-in-prod case until the
# workspace packages grow real builds. tsc still runs in the builder stage
# as a type-check gate, so the contract is enforced at build time.

ARG NODE_VERSION=20.19.6
# Multi-arch manifest list digest for node:20.19.6-bookworm-slim, captured
# 2026-04-27 via `docker buildx imagetools inspect`. Pinning by digest (per
# Docker's "Pin base image versions" best practice) means same Dockerfile +
# same digest = byte-identical base layer, regardless of when Docker Hub
# republishes the floating tag. Bump deliberately when a new Node patch is
# desired; CI failure on tag/digest mismatch is the audit signal.
ARG NODE_DIGEST=sha256:b342de02eb4a57cd6986290a69833d20818508db8078dba0197a024193410aee
ARG PNPM_VERSION=9.15.9
# tsx version is NOT pinned here as an ARG — it is extracted from
# pnpm-lock.yaml at build time so the lockfile is the single source of
# truth. apps/api and apps/workers both list tsx as a `^4.19.4` devDep,
# but the lockfile resolves it to a specific version (4.21.0 at the time
# of writing). If a future `pnpm update tsx` bumps the lockfile, the next
# image rebuild picks it up automatically — no Dockerfile edit required.


# ============================================================================
# Stage 1: base — pinned Node + pnpm via corepack. Shared by builder.
# ============================================================================
FROM node:${NODE_VERSION}-bookworm-slim@${NODE_DIGEST} AS base

ARG PNPM_VERSION

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true

# corepack ships with Node and pins the pnpm version per repo. We pre-stage
# the binary so subsequent RUN steps don't need network for this.
RUN corepack enable \
 && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /repo


# ============================================================================
# Stage 2: builder — install full dep graph, typecheck, produce a deployable
# tree via `pnpm deploy --prod` for just the api workspace.
# ============================================================================
FROM base AS builder

# Copy the workspace shape first so `pnpm install` caches independently of
# source edits. If a package.json or the lockfile changes, the install layer
# busts; otherwise BuildKit reuses the layer below across builds.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
# Backend workspace manifests — what the api actually depends on.
COPY apps/api/package.json apps/api/
COPY apps/workers/package.json apps/workers/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/notifications/package.json packages/notifications/
COPY packages/pdf/package.json packages/pdf/
COPY packages/rbac/package.json packages/rbac/
COPY packages/ui/package.json packages/ui/
# Frontend manifests must be present for `pnpm install --frozen-lockfile`
# to validate the workspace topology in pnpm-lock.yaml — even though the
# api dep graph never reaches them. Their source is excluded by
# .dockerignore, only the package.json files come through.
COPY apps/app/package.json apps/app/
COPY apps/patient/package.json apps/patient/
COPY apps/directory/package.json apps/directory/
# packages/gate is the temporary password gate consumed only by the three
# frontend apps. The api never imports it, but pnpm-lock.yaml lists it as a
# workspace package, so its manifest must exist for `pnpm install
# --frozen-lockfile` topology validation. The source is excluded.
COPY packages/gate/package.json packages/gate/

# Install only the backend dep graph (api + transitive workspace deps,
# devDeps included for the typecheck gate below). Use a BuildKit cache
# mount so the pnpm content store survives between builds — drastically
# faster CI/Railway rebuilds when only source changes.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm install \
      --frozen-lockfile \
      --filter=api... \
      --filter=@lewis/db... \
      --filter=@lewis/shared... \
      --filter=@lewis/notifications... \
      --filter=@lewis/pdf... \
      --filter=@lewis/rbac...

# Now bring in the source. tsconfig.base.json sits at the repo root.
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared
COPY packages/notifications ./packages/notifications
COPY packages/pdf ./packages/pdf
COPY packages/rbac ./packages/rbac
# packages/ui is needed for workspace topology resolution but not by api at
# runtime — bring just its package.json (already copied above) and a stub
# tsconfig if it has one.
COPY packages/ui ./packages/ui

# Type-check gate. This is the single point where the contract is enforced
# before the runtime ships. Failing here fails the build, which fails the
# Railway deploy — which is exactly what we want.
RUN pnpm --filter api --filter @lewis/db --filter @lewis/shared --filter @lewis/notifications --filter @lewis/pdf --filter @lewis/rbac typecheck

# Produce a self-contained tree at /out/api with the api package + all
# transitive workspace deps copied as REAL packages (not symlinks) and
# external prod deps installed. devDeps are stripped.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm deploy --filter=api --prod /out/api

# Install tsx into a separate prefix so the runtime can execute TS
# directly. Kept out of the deployed package's node_modules because that
# tree's package.json still uses pnpm `workspace:*` specifiers (resolved
# locally by pnpm deploy) which npm cannot parse.
#
# tsx version is read directly from pnpm-lock.yaml so dev (pnpm) and prod
# (this image) always run the same resolved version. The grep matches
# pnpm v9's snapshot-section format (`  tsx@<version>:`), takes the first
# match (all entries pin the same version because tsx is a direct devDep
# of api + workers, not a transitive), and strips the trailing colon.
# Fails fast with a clear error if the format ever changes.
RUN TSX_VERSION="$(grep -m1 -E '^  tsx@' pnpm-lock.yaml | sed -E 's/^  tsx@(.+):$/\1/')" \
 && [ -n "$TSX_VERSION" ] || { echo "ERROR: could not extract tsx version from pnpm-lock.yaml — pnpm lockfile format may have changed"; exit 1; } \
 && echo "tsx version from pnpm-lock.yaml: $TSX_VERSION" \
 && mkdir -p /opt/tsx \
 && cd /opt/tsx \
 && npm init -y >/dev/null \
 && npm install --no-save --no-audit --no-fund tsx@"$TSX_VERSION"


# ============================================================================
# Stage 3: runtime — slim, non-root, tini for PID 1, no build tooling.
# ============================================================================
FROM node:${NODE_VERSION}-bookworm-slim@${NODE_DIGEST} AS runtime

# tini is in the Debian repos. It becomes PID 1 and forwards SIGTERM to
# Node, which is what the api's `process.once('SIGTERM', ...)` handler in
# apps/api/src/index.ts depends on for clean shutdown during Railway's
# zero-downtime deploys. ca-certificates is needed for HTTPS to Supabase /
# Clerk / Stripe / Plaid / Resend / Sentry from this process. tzdata so the
# bake-in TZ resolves (America/Denver — see CLAUDE.md gotcha on Montana
# deadlines being Mountain time, not UTC).
#
# Reproducibility note (deliberate non-pin): we intentionally do NOT pin
# tini, ca-certificates, or tzdata to specific apt versions. The base
# image is digest-pinned above, which fixes the starting layer. For these
# three packages, currency is a feature, not a bug:
#   - tzdata: CLAUDE.md explicitly calls out Montana deadlines + 5-day AE
#     clock as America/Denver. When IANA pushes a tz update we want it.
#   - ca-certificates: security-positive to ship the latest CA bundle
#     (revocations, new roots) on every rebuild.
#   - tini: upstream is effectively frozen at 0.19.0 in Bookworm; pinning
#     adds nothing.
# If full deterministic-build posture is ever required (e.g. Debian
# Reproducible Builds for SLSA L4), switch this to apt sources rooted at
# snapshot.debian.org with a baked-in snapshot date — but accept the
# tzdata/ca-cert staleness cost.
RUN apt-get update \
 && apt-get install -y --no-install-recommends tini ca-certificates tzdata \
 && rm -rf /var/lib/apt/lists/*

# Run as the unprivileged `node` user that ships with the official image
# (UID/GID 1000). Never as root.
WORKDIR /app
COPY --from=builder --chown=node:node /out/api /app
COPY --from=builder --chown=node:node /opt/tsx /opt/tsx

USER node

ENV NODE_ENV=production \
    TZ=America/Denver \
    NODE_OPTIONS=--enable-source-maps \
    PATH=/opt/tsx/node_modules/.bin:$PATH

# Railway injects PORT dynamically; the api reads it via
# `process.env.PORT ?? 13001` (apps/api/src/index.ts). Document the local
# default — Railway ignores EXPOSE but it helps `docker run` smoke tests.
EXPOSE 13001

# tini -- ensures SIGTERM is forwarded to Node and zombies are reaped.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["tsx", "src/index.ts"]

# Healthcheck: deliberately omitted. Railway runs healthchecks against
# /healthz on the service URL (configured in the Railway dashboard's
# "Healthcheck Path" setting). A Dockerfile HEALTHCHECK is silently
# ignored on Railway.
