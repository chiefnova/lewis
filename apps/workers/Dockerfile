# syntax=docker/dockerfile:1.7
#
# apps/workers/Dockerfile
# -----------------------
# Production container for the Lewis BullMQ workers fleet. Built and run
# by Railway. Build context is the repository root so the pnpm workspace
# resolves; set RAILWAY_DOCKERFILE_PATH=apps/workers/Dockerfile in the
# Railway service.
#
# Posture & isolation:
#   - This image is for the REGULAR (RLS-bound) worker fleet that connects
#     as the `app_worker` Postgres role. SUPABASE_SERVICE_ROLE_KEY MUST NOT
#     be present in this service's Railway env vars (CLAUDE.md security #1
#     and #8). The privileged worker (apps/workers-elevated, Sprint 4)
#     ships in a separate image / Railway service.
#   - The Worker startup code (apps/workers/src/index.ts) asserts the
#     runtime DB role is `app_worker`. This image makes no claim about
#     that — Railway env config is the source of truth. The assertion is
#     defense-in-depth against a misconfigured deploy.
#
# Why a hand-written Dockerfile (the same five reasons as apps/api):
#   1. HIPAA audit posture
#   2. Reproducible image digests for incident response
#   3. Puppeteer system-deps story (see TODO block below for Sprint 4)
#   4. Vendor portability
#   5. Slim runtime, smaller attack surface

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
# Stage 1: base — pinned Node + pnpm via corepack.
# ============================================================================
FROM node:${NODE_VERSION}-bookworm-slim@${NODE_DIGEST} AS base

ARG PNPM_VERSION

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true

RUN corepack enable \
 && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /repo


# ============================================================================
# Stage 2: builder — install full dep graph, typecheck, deploy --prod.
# ============================================================================
FROM base AS builder

# Workspace manifests for cache-friendly install. See apps/api/Dockerfile
# for the rationale on copying frontend manifests too.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/workers/package.json apps/workers/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/notifications/package.json packages/notifications/
COPY packages/pdf/package.json packages/pdf/
COPY packages/rbac/package.json packages/rbac/
COPY packages/ui/package.json packages/ui/
COPY apps/app/package.json apps/app/
COPY apps/patient/package.json apps/patient/
COPY apps/directory/package.json apps/directory/
# packages/gate manifest is needed for pnpm-lock.yaml topology validation
# (workers never import it). Source is excluded.
COPY packages/gate/package.json packages/gate/

# workers depends on @lewis/db, @lewis/notifications, @lewis/pdf,
# @lewis/shared (see apps/workers/package.json). It does NOT depend on
# @lewis/rbac, but tests in @lewis/db transitively reference rbac so the
# typecheck gate needs it.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm install \
      --frozen-lockfile \
      --filter=workers... \
      --filter=@lewis/db... \
      --filter=@lewis/shared... \
      --filter=@lewis/notifications... \
      --filter=@lewis/pdf... \
      --filter=@lewis/rbac...

COPY tsconfig.base.json ./
COPY apps/workers ./apps/workers
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared
COPY packages/notifications ./packages/notifications
COPY packages/pdf ./packages/pdf
COPY packages/rbac ./packages/rbac
COPY packages/ui ./packages/ui

# Type-check gate.
RUN pnpm --filter workers --filter @lewis/db --filter @lewis/shared --filter @lewis/notifications --filter @lewis/pdf --filter @lewis/rbac typecheck

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm deploy --filter=workers --prod /out/workers

# Install tsx into a separate prefix so the runtime can execute TS
# directly. Kept out of the deployed package's node_modules because that
# tree's package.json still uses pnpm `workspace:*` specifiers (resolved
# locally by pnpm deploy) which npm cannot parse.
#
# tsx version is read directly from pnpm-lock.yaml so dev (pnpm) and prod
# (this image) always run the same resolved version. See apps/api/Dockerfile
# for the full rationale on the grep+sed extraction.
RUN TSX_VERSION="$(grep -m1 -E '^  tsx@' pnpm-lock.yaml | sed -E 's/^  tsx@(.+):$/\1/')" \
 && [ -n "$TSX_VERSION" ] || { echo "ERROR: could not extract tsx version from pnpm-lock.yaml — pnpm lockfile format may have changed"; exit 1; } \
 && echo "tsx version from pnpm-lock.yaml: $TSX_VERSION" \
 && mkdir -p /opt/tsx \
 && cd /opt/tsx \
 && npm init -y >/dev/null \
 && npm install --no-save --no-audit --no-fund tsx@"$TSX_VERSION"


# ============================================================================
# Stage 3: runtime — slim, non-root, tini for PID 1.
# ============================================================================
FROM node:${NODE_VERSION}-bookworm-slim@${NODE_DIGEST} AS runtime

# tini for SIGTERM forwarding to the BullMQ worker (apps/workers/src/index.ts
# `process.once('SIGTERM', shutdown)` — Railway's zero-downtime cycle
# depends on this firing). ca-certificates for HTTPS to Supabase / Clerk /
# Resend / Sentry. tzdata so the bake-in TZ resolves (America/Denver — see
# CLAUDE.md gotcha on Montana 5-day AE clock and Jan 31 / Feb 1 deadlines
# being Mountain time).
#
# Reproducibility note (deliberate non-pin): see apps/api/Dockerfile for
# the full rationale. Short version: base image is digest-pinned above;
# tini/ca-certificates/tzdata are intentionally left unpinned because
# currency on tzdata (Montana TZ accuracy) and ca-certificates (cert-bundle
# freshness) are project requirements, and tini upstream is frozen.
#
# TODO(Sprint 4 — Puppeteer):
#   When the patient-agreement and AE-report PDF rendering lands (PRD §
#   17 / CLAUDE.md "Puppeteer PDF rendering runs in a worker"), append the
#   Chromium runtime libs to the apt-get line below and set:
#     ENV PUPPETEER_SKIP_DOWNLOAD=true \
#         PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
#   then `RUN apt-get install -y --no-install-recommends chromium fonts-liberation
#   libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1
#   libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2`. We
#   defer here so this image stays ~150MB instead of ~450MB until the
#   feature actually exists. Alpine was deliberately rejected for the base
#   image to keep this future Chromium install painless.
RUN apt-get update \
 && apt-get install -y --no-install-recommends tini ca-certificates tzdata \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder --chown=node:node /out/workers /app
COPY --from=builder --chown=node:node /opt/tsx /opt/tsx

USER node

ENV NODE_ENV=production \
    TZ=America/Denver \
    NODE_OPTIONS=--enable-source-maps \
    PATH=/opt/tsx/node_modules/.bin:$PATH

# Workers don't bind a port. No EXPOSE.

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["tsx", "src/index.ts"]
