# @lewis/gate (TEMPORARY)

Vercel Edge Middleware that gates `lewis.health`, `app.lewis.health`, and
`patient.lewis.health` behind a password while the apps are being built.

**This package is temporary.** It will be deleted before public launch via the
cleanup PR described in the removal sequence below.

## How it works

- `src/index.ts` exports `gateMiddleware` and `gateConfig`. Each frontend has a
  one-line `middleware.ts` at its project root that re-exports both.
- `src/crypto.ts` — HMAC-SHA256 sign/verify of a `${expiryMs}.${hex}` cookie
  value, plus constant-time password compare. Web Crypto only (no Node deps),
  so the same code runs on Vercel Edge and inside the Vite dev shim.
- `src/html.ts` — variant-A gate HTML and the `Loading…` interstitial. Inline
  CSS, no asset deps beyond Google Fonts.
- `src/vite.ts` — `gateVitePlugin()` bridges Vite's connect middleware to the
  same `gateMiddleware`, so `mise run dev:*` mirrors production behavior.

## Env vars

Set per Vercel project (Production + Preview scope, **not** Development):

- `LEWIS_GATE_PASSWORD` — the access password
- `LEWIS_GATE_SECRET` — 32-byte random hex; **distinct per project** so a
  stolen cookie from one app cannot unlock another. Generate via
  `openssl rand -hex 32`.
- `LEWIS_GATE_DISABLED` — set to `"true"` to bypass the gate without a code
  change. This is the kill switch and the first step of the removal sequence.

`LEWIS_GATE_PASSWORD` and `LEWIS_GATE_SECRET` are **not** in `fnox.toml` per the
project's secret-management rule (production secrets live in Vercel only).

## Local dev

The Vite plugin is registered in each app's `vite.config.ts`. The gate is ON by
default in dev with a non-secret default secret. Set `LEWIS_GATE_DISABLED=true`
to bypass locally. The 7-day cookie persists across reloads.

## Removal

1. Set `LEWIS_GATE_DISABLED=true` on all three Vercel projects, redeploy. Verify
   public access works. The kill switch stays in place as a safety net.
2. After a few days of confirmed-public access, open a cleanup PR that:
   - Deletes `apps/{app,directory,patient}/middleware.ts`
   - Deletes `packages/gate/`
   - Removes `@lewis/gate` from each app's `package.json` and the
     `gateVitePlugin` import + plugin entry from each app's `vite.config.ts`
   - Removes the `@lewis/gate` paths from `tsconfig.base.json`
   - Removes the Edge-runtime globals block from `eslint.config.js`
   - Deletes the three `LEWIS_GATE_*` env vars on each Vercel project
