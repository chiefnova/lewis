# Lewis Subprocessor Register

This register is the Phase 0 source of truth for vendor data posture until the Internal Admin DB-backed subprocessor view ships in Sprint 6. Any vendor that can receive production operational data must have a row here before it is enabled.

Data posture meanings:

- `PHI allowed with BAA` — vendor may receive PHI only after BAA is executed and production config is reviewed.
- `No PHI by configuration` — production configuration must redact or avoid PHI; BAA is required before this posture changes.
- `Synthetic data only` — vendor may receive test data only unless counsel/security approves a BAA-backed scope change.

| Tool | Category | MVP 1 data allowed | PHI posture | BAA/DPA decision | Owner | Required by | Notes |
|---|---|---|---|---|---|---|---|
| Vercel | Frontend hosting | App assets, headers, preview metadata | No PHI by configuration | Enterprise BAA before PHI-bearing frontend traffic | Founding product | Week 0 | Frontend must call Hono API for data; avoid PHI in edge logs. |
| Railway | API/workers/Redis | API traffic, worker jobs, operational metadata | PHI allowed with BAA | BAA required before Sprint 4 PHI | Founding product | Week 0 | App/worker runtimes still use RLS-limited DB roles. |
| Supabase | Postgres/storage | PHI database rows, file storage objects | PHI allowed with BAA | BAA required before any real PHI | Founding product | Week 0 | HIPAA-eligible project config; service-role not available to app/worker runtimes. |
| Clerk | Auth/identity | Identity profile, auth events, MFA state | PHI allowed with BAA | BAA required before patient onboarding | Founding product | Week 0 | Clerk is identity only; tenant authorization lives in Postgres. |
| Stripe | Payments | Payment identifiers, amounts, receipts, limited patient billing metadata | PHI allowed with BAA | Healthcare BAA required before patient payments | Founding product | Week 0 | Minimize descriptions; no diagnosis/treatment detail in Stripe metadata. |
| Plaid | ACH bank linking | Bank-link tokens and ACH setup metadata | PHI allowed with BAA | BAA required before ACH production | Founding product | Week 0 | No treatment detail in Plaid metadata. |
| Resend | Transactional email | Email address, transactional message content | PHI allowed with BAA | Enterprise BAA required before PHI emails | Founding product | Week 0 | Email templates must avoid unnecessary PHI. |
| Sentry | Error monitoring | Errors, stack traces, scrubbed request metadata | No PHI by configuration | Business BAA required if PHI ever permitted | Engineering | Week 0 | PHI scrubber test required in CI. |
| Cloudflare | DNS/WAF/CDN | DNS, WAF events, request metadata | No PHI by configuration | Enterprise BAA required before WAF logs include PHI paths/payloads | Founding product | Week 1 | DNS alone does not need BAA; WAF/logging posture does. |
| Daily.co or chosen video provider | Informed consent video | Consent session media and metadata | PHI allowed with BAA | HIPAA/BAA required before Sprint 4 | Founding product | Week 4 | Transcript provider must be covered here or have its own row. |
| Documenso self-hosted or chosen e-sign vendor | E-signature | Signed PPA, consent, agreement artifacts | PHI allowed with BAA | Self-host preferred; BAA required for hosted vendor | Founding product | Week 2 | Signed regulated documents also stored immutably in Lewis storage. |
| Better Stack or Axiom | Log aggregation | Service logs with PHI redacted | No PHI by configuration | BAA required before any PHI-bearing logs | Engineering | Week 0 | No request bodies, document text, patient names, or identifiers in logs. |
| Checkly or BetterStack uptime | Synthetic monitoring/status | Public health checks and synthetic test data | Synthetic data only | No BAA if limited to public/synthetic checks | Engineering | Week 0 | Checks must not log into production patient/staff workflows with real data. |
| PostHog | Product analytics | Redacted tenant/user event taxonomy and funnel events | No PHI by configuration | Self-host preferred; BAA/DPA required before hosted PHI | Product/engineering | Week 0 | No patient names, diagnoses, free text, document names, or message content. |
| Vanta or Drata | Compliance evidence automation | Scrubbed control evidence and metadata | No PHI by configuration | DPA/BAA required before PHI-adjacent evidence | Security/compliance | Week 0 | No patient screenshots, exports, recordings, or clinical records. |
| Pen-test vendor | Security assessment | Staging/synthetic data, scoped production metadata if approved | Synthetic data only | BAA required before testing against real PHI | Security/compliance | Week 0 booking | Contract must define scope, data handling, retention, and retest window. |

Change rule: adding a subprocessor, changing a tool's data posture, or allowing PHI into a previously no-PHI tool requires counsel/security approval, updated runbook coverage, and a new review record before production enablement.
