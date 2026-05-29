---
paths:
  - "apps/app/**"
  - "apps/patient/**"
  - "apps/directory/**"
  - "packages/ui/**"
---

# Frontend Rules

- Frontends call the Hono API only; no browser-side Supabase database client.
- `apps/app` is the staff/business console; keep manufacturer, ETC, and internal admin modules under `apps/app/src/portals/*`.
- `apps/patient` is the separate patient-facing product; keep patient portal modules under `apps/patient/src/portal`.
- `apps/directory` is the public, anonymous patient directory served at `lewis.health`. It is anonymous-first and SEO-critical:
  - Only call `/v1/public/*` endpoints plus the two narrowly-scoped semi-authenticated endpoints (`/v1/patient/me/context`, `/v1/patient/account/link-anonymous-screen`). Never reach into PHI-handling endpoints from the directory bundle.
  - Do not import Clerk at the route level. Lazy-load Clerk only inside the connect-request flow and the eligibility-result handoff that needs to detect an existing `.lewis.health` session.
  - Do not log, analytics-track, or include in URLs anything beyond program/ETC slugs and the opaque eligibility session token. The token is opaque and held in `localStorage`; rotating it is safe.
  - Bundle budget: keep above-the-fold homepage JS under 120KB. Lazy-load every page below the homepage and the connect-request flow.
- User-facing strings go through `react-intl`.
- Patient portal UX must stay plain, calm, and WCAG 2.1 AA oriented. Same applies to the directory.
- Forms use `react-hook-form` plus zod schemas once real forms are implemented.
- Do not put PHI in URLs, analytics events, logs, or Sentry context.
