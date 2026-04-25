---
paths:
  - "apps/app/**"
  - "apps/patient/**"
  - "packages/ui/**"
---

# Frontend Rules

- Frontends call the Hono API only; no browser-side Supabase database client.
- `apps/app` is the staff/business console; keep sponsor, ETC, and internal admin modules under `apps/app/src/portals/*`.
- `apps/patient` is the separate patient-facing product; keep patient portal modules under `apps/patient/src/portal`.
- User-facing strings go through `react-intl`.
- Patient portal UX must stay plain, calm, and WCAG 2.1 AA oriented.
- Forms use `react-hook-form` plus zod schemas once real forms are implemented.
- Do not put PHI in URLs, analytics events, logs, or Sentry context.
