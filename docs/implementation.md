# Corridor — MVP 1 Implementation Plan

| | |
|---|---|
| **Document version** | 1.0 |
| **Author** | Founding principal engineer |
| **Status** | Draft for engineering review |
| **Last updated** | 2026-04-24 |
| **Companion to** | [prd.md](prd.md) v1.0 |

This document operationalizes [prd.md](prd.md). It does not duplicate the PRD — it **commits to the order, dependencies, and acceptance criteria** that take Corridor from empty repo to first-patient-dosed at WinSanTor's launch ETC, then through the first 90 days post-launch.

The PRD's existing sprint plan (§ 22.2) is the skeleton. This plan is the meat: every PRD section is covered, every feature traces to a rule (per Principle 2), every cross-cutting concern is sequenced into the right phase rather than dumped on Sprint 6, and every phase has hard acceptance criteria that gate the next.

A coverage matrix at the end of this document cross-references every PRD section against the phase that delivers it. If you want to verify completeness, jump to § 14.

---

## 0. Operating model

### 0.1 Team shape and capacity

Plan assumes the team profile in [prd.md § 24.3](prd.md): one founding product, one lead engineer (concurrent hire), one designer (parallel brand work), counsel on retainer. Realistic engineering capacity for MVP 1 is **2 full-time engineers** (the lead + one early hire) for 12 weeks of build, plus the founding product wearing a "PM/QA/half-engineer" hat.

That is **~80–100 engineering days** for a scope that the PRD candidly calls "the largest portal in MVP 1 by surface area" plus three other portals plus 13 worker classes plus HIPAA posture plus a pen test. **The 6-sprint plan is aggressive.** Phase 4 (patient flow) and Phase 6 (hardening + admin portal completion) are the most likely to slip. Slip safely by deferring Phase 2 workflow activation (RULE 25, RULE 21 device depth, inpatient validation, HFAR Path A) — never by deferring Sprint 1 schema stubs, compliance, or HIPAA.

### 0.2 Phase ↔ PRD sprint mapping

| Phase | PRD § 22.2 sprint | Calendar weeks | Theme |
|---|---|---|---|
| 0 | Pre-development | -2 to 0 | BAAs, providers, repo, toolchain |
| 1 | Sprint 1 — Foundation | 1–2 | Tenancy, RLS, audit, auth, storage |
| 2 | Sprint 2 — Sponsor + ETC onboarding | 3–4 | Sponsor wizard, program config, ETC licensure wizard, PPA |
| 3 | Sprint 3 — ETC operational backbone | 5–6 | P&P manual, staff, ETRB, QAPI, compliance |
| 4 | Sprint 4 — Patient flow | 7–8 | All 8 patient stages, patient portal end-to-end |
| 5 | Sprint 5 — Treatment + AE + reporting | 9–10 | Visit doc, transfer, AE 5-day, DPHHS annual, HFAR, sponsor reports |
| 6 | Sprint 6 — Hardening + launch | 11–12 | Admin portal completion, pen test, HIPAA review, a11y, perf, DR, soft launch |
| 7 | Post-launch (PRD § 22.4) | 13–26 | Iterate, second tenant, SOC 2 evidence, Phase 2 prioritization |
| 8 | Phase 2 readiness | ongoing | The 10 items in PRD § 7 |

### 0.3 Acceptance criteria pattern

Every phase ends with a checklist of objective, demonstrable criteria. **A phase does not end** when the calendar runs out — it ends when the criteria pass. If the criteria don't pass, the phase extends and downstream phases compress (or scope is cut from Phase 8 forward, never compliance).

### 0.4 Process invariants (apply continuously, not phase-bound)

These are non-negotiable from day 1, woven through every phase:

- **Compliance trace test.** Every shipped feature has a test (or semantic SQL assertion, or e2e check) that names the SB 535 § or RULE it implements. CI fails if a feature module ships without a trace test. This operationalizes Principle 2 ("the rules are the spec").
- **Audit-log coverage test.** Every API mutation has an integration test asserting an `audit_log` row was written with the right (`tenant_id`, `actor_user_id`, `action`, `target_object_type`, `target_object_id`, `before`, `after`, `ip`, `ua`, `ts`). CI fails on missing coverage. This is Principle 4 in code.
- **RLS coverage test.** Every PHI-bearing table has a semantic SQL RLS test that asserts tenant A cannot read tenant B's rows. Static CI also fails if an RLS-enabled table lacks `FORCE ROW LEVEL SECURITY`, SELECT policy coverage, or write policy coverage. This is Principle 5 in code.
- **No PHI in logs/Sentry/analytics.** A redaction layer is in place from Sprint 1 and tested with synthetic PHI fixtures. PHI ever appearing in a Sentry event is a P0 incident.
- **i18n string discipline.** Every user-facing string goes through `react-intl`. ESLint rule blocks raw strings in JSX. English-only ships, but the scaffolding is right from line one.
- **UTC at rest, America/Denver for deadlines.** A shared `packages/shared/time.ts` module exposes `montanaDeadline(date)` helpers; raw `new Date()` in feature code is an ESLint warn.

---

## 1. Critical path

The single longest dependency chain that gates first-patient-dosed:

```
BAAs signed (subprocessors that touch PHI)
    ↓
Supabase + Clerk + Vercel + Railway provisioned with HIPAA configs
    ↓
RLS pattern + audit_log trigger + storage bucket (Sprint 1)
    ↓
ETC tenant created + licensure wizard (Sprint 2)
    ↓
ETC licensed by DPHHS (real-world, ~30–90 days, runs in parallel with Sprint 3+)
    ↓
ETRB created + composition validated + protocol approved + outside-ETC determination (Sprint 3)
    ↓
Patient eligibility + H&P + clinical review (Sprint 4 stages 1–4)
    ↓
Informed consent recording + patient agreement signed + payment (Sprint 4 stages 5–7)
    ↓
First visit documented (Sprint 5)
    ↓
First patient dosed
```

**Real-world critical path stalls:**

- BAAs (some vendors take 4–8 weeks). Start in Phase 0, do not wait for code.
- DPHHS license issuance has a 90-day clock the ETC controls; code is not blocking.
- ETRB recruitment (≥4 members including MT physician + researcher + ethicist) is a stakeholder problem, not an engineering one. Surface to product/founder in Phase 0.
- Pen test scheduling — book the vendor in Phase 0 for a Sprint 6 slot.

---

## 2. Decision deadlines

Open questions from PRD § 23 must lock by these dates or the dependent phase slips. Founding-engineer-recommended defaults shown.

| # | Decision | Locked by | Recommended default |
|---|---|---|---|
| 5 | Video provider | Phase 3 end (before Sprint 4) | **Daily.co** — HIPAA BAA available, signed-URL recording exports, idiomatic React SDK |
| 6 | E-signature provider | Phase 1 end (before Sprint 2) | **Documenso self-hosted** — keeps signed-document data inside our HIPAA boundary; alternative HelloSign acceptable but adds a subprocessor |
| 7 | Public ETC slug strategy | Phase 1 end | **Subdomain** (`etc-name.corridor.health`) on Cloudflare wildcard cert; cheaper than per-ETC certs, cleaner UX |
| 1 | Net annual profits definition | DPHHS or counsel; MVP 1 ships dual-interpretation | Both GAAP and tax-basis; ETC chooses, choice logged |
| 4 | Sponsor data sharing default | Resolved before Sprint 1 | Aggregate + de-identified line-level safety only; no identified sponsor PHI in MVP 1 |
| 8 | Search index | Sprint 1 schema; Sprint 3 feature | Postgres FTS for MVP 1; OpenSearch/Algolia only if Phase 2 metrics require it |
| 9 | Payment installments | Phase 4 design | Defer unless WinSanTor explicitly requests; Stripe Subscriptions if added |
| 10 | Brand system | Phase 0 (parallel track, not blocking) | Brand work concurrent with engineering |
| 11 | AE 5-day clock basis | Phase 0 counsel review; fallback before Sprint 5 | Conservative earliest-known timestamp warnings; formal basis stored in `clock_basis` |
| 2 | ETRB-as-a-service | Phase 8 | Architecture supports; activate when commercial signal emerges |
| 3 | DPHHS API integration | Phase 8 | PDF + manual file in MVP 1 |

### 2.1 Principal-engineer remediation backlog

These items close the remaining PRD/implementation gaps. They are not optional polish; they are the minimum design detail required before feature teams start coding the affected areas.

#### 2.1.1 Patient representatives and signature authority

**Phase:** Sprint 1 schema foundation + Sprint 4 patient flow.

**To-do list:**

- Add `patient_representatives` and `minor_assents` migrations in the patient domain.
- Model representative authority separately from tenant membership: relationship type, authority basis, authority document, access scope, signing permission, messaging permission, effective dates, revocation, and verifier.
- Add RLS tests for self-directed adult, caregiver read-only access, legal guardian signer, parent/guardian signer for minor, revoked representative, and unrelated user denial.
- Update patient registration to collect representative path: self-directed, caregiver, legal guardian, minor.
- Require authority verification before a representative can sign informed consent or patient agreement.
- Store signer capacity on every regulated signature: self, legal guardian, parent/guardian, or provider.
- Add minor assent/co-sign capture where clinically required, with a medical-director waiver reason if not collected.
- Add revocation workflow; revoked representatives lose portal access immediately and cannot sign new artifacts.

**Acceptance criteria:**

- A caregiver can view schedule/outcomes but cannot sign or view records outside scope.
- A legal guardian can sign only after authority document verification.
- A minor enrollment cannot reach treatment authorization until parent/guardian signature and assent/waiver rules pass.
- Revoking a representative invalidates portal access and is audit logged.

#### 2.1.2 Central treatment authorization gate

**Phase:** Sprint 4 before visit scheduling; reused in Sprint 5 check-in and treatment documentation.

**To-do list:**

- Add `treatment_authorizations` migration with gate version, pass/fail status, evaluated_at, evaluated_by_user_id, source snapshot, and failure reasons.
- Implement `evaluateTreatmentAuthorization(enrollmentId, action)` in shared server code.
- Gate `POST /visits`, check-in, and treatment documentation through the same evaluator.
- Check license status, active PPA, ETRB association, protocol approval, RULE 16(6)(f) evaluation, valid H&P, eligibility accepted, consent complete, patient agreement signed, payment/waiver, current transfer agreement, provider credential, and approved P&P/grievance policy.
- Return machine-readable failure reasons plus human-readable checklist text.
- Store every evaluation snapshot for audit; do not overwrite prior failed evaluations.
- Add e2e tests for each failed prerequisite and one full pass.

**Acceptance criteria:**

- No visit can be scheduled, checked in, or documented without a passing authorization.
- The same gate powers patient status, ETC staff checklist, and compliance health score.
- An auditor can see why a patient was authorized on a specific date.

#### 2.1.3 Patient rights workflows

**Phase:** Sprint 4 for access requests; Sprint 5 for amendment decisions; Sprint 6 polish/reporting.

**To-do list:**

- Add `record_requests`, `amendment_requests`, `disclosure_events`, and `privacy_restrictions`.
- Replace the prior grievance-only amendment assumption with a dedicated amendment workflow; grievances may link to amendment requests but are not the same object.
- Add patient endpoints for record requests, amendment requests, restriction requests, and disclosure accounting.
- Add ETC/admin review screens for amendment and restriction decisions.
- Emit `disclosure_events` whenever identified patient data is disclosed to boards, support users, exports, or external recipients. Sponsors receive only aggregate or de-identified line-level safety data in MVP 1; future identified sponsor disclosure requires `patient_data_sharing_consents`.
- Add full-file export job outputting a patient-readable archive plus machine-readable manifest.
- Add retention/audit policy: requests and responses are regulated artifacts.

**Acceptance criteria:**

- Patient can request full file and receive a complete export.
- Patient can request amendment and receive accept/deny response with reason.
- Accounting of disclosures is generated from actual events, not reconstructed from logs.
- Active privacy restrictions affect future disclosure and export workflows.

#### 2.1.4 Patient messages data model

**Phase:** Sprint 4.

**To-do list:**

- Add `message_threads`, `message_thread_participants`, `messages`, `message_attachments`, and `message_read_receipts`.
- Classify threads as clinical, scheduling, billing, or support.
- Persist emergency/urgent disclaimer acceptance or display event where required by design.
- Enforce representative messaging scope through RLS and application validation.
- Route clinical/safety messages to ETC staff only; Corridor support sees clinical threads only through support-access grants.
- Link message threads to enrollment/patient file when they contain care, scheduling, safety, payment, or grievance context.
- Define retention: clinical messages follow patient-file retention; support-only messages follow support retention unless escalated into the patient file.

**Acceptance criteria:**

- Patient, authorized representative, and ETC staff can message within scope.
- Attachments use immutable file storage and audit log.
- Clinical messages appear in patient-file export when applicable.
- Revoked representatives lose message access.

#### 2.1.5 AE clock basis and timestamp model

**Phase:** Decision in Phase 0 with counsel; implementation in Sprint 5.

**To-do list:**

- Ask counsel to define the official reporting clock basis for RULE 17.
- Add `occurred_at`, `detected_at`, `became_aware_at`, `reported_at`, `clock_basis`, and `dphhs_deadline_at` to `adverse_events`.
- Until counsel decides otherwise, compute warning clocks from the earliest known of occurrence, detection, and awareness, and separately store the formal selected basis.
- Require users to explain unknown timestamps; do not silently default to `now()`.
- Display all AE timestamps in the UI and generated DPHHS PDF.
- Add escalation jobs based on `dphhs_deadline_at`, not `reported_at`.
- Add tests for delayed detection and delayed reporting scenarios.

**Acceptance criteria:**

- The product cannot hide a reporting delay by creating an AE late.
- Compliance dashboard flags late detection/reporting separately from late DPHHS submission.
- Generated AE report contains date of occurrence and the basis for deadline calculation.

#### 2.1.6 Consent transcription

**Phase:** Sprint 4 MVP, not Phase 8.

**To-do list:**

- Activate basic consent recording transcription in Sprint 4 after recording upload.
- Store transcript as `informed_consents.transcript_file_id`.
- Mark transcript as unverified until provider review; allow provider to accept or annotate.
- Include transcript link in patient Documents and patient-file export.
- Keep live captions in Phase 8/Phase 2; do not block MVP on live captioning.
- Add BAA/subprocessor review for the transcription provider if not handled by the video provider.

**Acceptance criteria:**

- Recorded consent session produces recording plus transcript artifact.
- Patient can access transcript post-session.
- Provider can attest to topics using recording, timestamps, and transcript.

#### 2.1.7 RULE 18/19 operational evidence

**Phase:** Sprint 3.

**To-do list:**

- Add migrations: `infection_control_programs`, `cleaning_logs`, `equipment_disinfection_logs`, `infection_surveillance_events`, `safety_reports`, and `expiring_products`.
- Add infection control officer assignment linked to staff credential/training.
- Capture nationally recognized guideline selection and implementation evidence.
- Build treatment-area cleaning log workflows before use and between patients.
- Build equipment disinfection/sterilization logs when applicable.
- Build hazard, near-miss, medication-error, fall/injury, and adverse incident reporting.
- Add expiration monitoring for medications, reagents, solutions, and other products with expiration dates.
- Route infection/safety events and open corrective actions into QAPI briefings.

**Acceptance criteria:**

- RULE 18 compliance can be shown with officer, guideline, cleaning/disinfection logs, and corrective actions.
- RULE 19 compliance can be shown with safety reports, medication-error handling, fall/injury handling, and expiration monitoring.
- QAPI receives infection/safety events automatically.

#### 2.1.8 Patient-file retention locks

**Phase:** Sprint 4 schema + Sprint 5 discharge flow.

**To-do list:**

- Add `patient_file_retention_locks` migration.
- On discharge creation, compute `retain_until = discharge_date + 5 years` in America/Denver date semantics.
- Attach locks to patient file objects, messages classified as patient-file records, consent artifacts, agreements, treatment docs, test results, discharges, AE links, and PRO responses.
- Enforce deletion blocks at DB level; allow only legal-hold/superseding metadata updates.
- Add export manifest showing retention status for each artifact.

**Acceptance criteria:**

- Attempting to delete locked patient-file artifacts before retain_until fails at DB level.
- Discharged patient files remain exportable during the retention period.
- Retention lock tests cover documents, messages, and treatment records.

#### 2.1.9 Legal content versioning

**Phase:** Phase 0 for counsel workflow; Sprints 2-5 for every rendered regulated document.

**To-do list:**

- Add `legal_content_templates`, `legal_content_template_versions`, and `rendered_legal_documents`.
- Move P&P templates, informed consent text, patient agreement text, 50-12-110 text, grievance policy text, PPA data-sharing language, and DPHHS attestation text into versioned templates.
- Require counsel approval metadata before a template version can be used in production.
- Store template version ids and input data hash on every rendered PDF/document.
- Move legal-template review to Phase 0/early Sprint 2, not Sprint 6.
- Add a CI check that regulated document renderers reference approved template versions.

**Acceptance criteria:**

- Every regulated PDF/document can prove exactly which counsel-approved text version produced it.
- Updating legal text creates a new version without mutating old rendered documents.
- Sprint 6 counsel review validates evidence rather than discovering template gaps.

### 2.2 P1 principal-engineer backlog

These close the P1 gaps that do not block the core happy path as hard as § 2.1, but still need to be designed before implementation spreads assumptions through the codebase.

#### 2.2.1 Architecture-preserved schema stubs

**Decision:** MVP 1 does not implement full device, inpatient, alt-currency, HFAR Path A, or multi-state workflows, but the schema must contain forward-compatible stubs so Phase 8 is activation work, not a data rewrite.

**Phase:** Sprint 1 schema foundation.

**To-do list:**

- Add `regulatory_jurisdictions` and `regulatory_rule_versions`; seed Montana / SB 535 / MAR 2026-427.1.
- Add `jurisdiction_id` to regulated objects at creation time: programs, ETC profiles, license applications, P&P manuals, consents, agreements, AEs, QAPI, reports, HFAR filings, device stubs, and payment obligations.
- Add device stubs: `investigational_devices` and `patient_device_registry_entries`; keep RULE 21 workflows disabled unless a device program activates Phase 8.
- Add inpatient stubs: `inpatient_facility_profiles`; store inpatient fields as nullable/disabled evidence, with validation inactive for MVP outpatient tenants.
- Add payment-rail abstraction: `payment_rails`, `payment_obligations`, `payment_transactions`; seed USD/Stripe active and alt-currency rails disabled.
- Add HFAR Path A stub fields to `hfar_filings` and related payment/free-product evidence objects, but keep workflow inactive.
- Add semantic SQL tests proving all new stub tables are tenant scoped and RLS protected.

**Acceptance criteria:**

- A future device program can attach device identifiers to program/patient records without changing existing primary keys.
- A future inpatient ETC can store plant fields without altering outpatient rows.
- A future payment rail can be added by config/migration without rewriting patient payment flows.
- Every regulated object created in MVP carries Montana jurisdiction context.

#### 2.2.2 Search implementation

**Decision:** Search is in MVP 1. It is not a Phase 8 item.

**Phase:** Sprint 3 foundation; module-specific indexing continues through Sprints 4-5.

**To-do list:**

- Add `search_index_documents` and `search_index_jobs`.
- Use Postgres FTS with tenant-scoped `tsvector` columns and RLS on index rows.
- Index patients, treatments, AEs, protocols, staff, documents, P&P manual sections, QAPI minutes, grievances, messages classified as patient-file records, and reports.
- Never index raw PHI into external systems in MVP 1.
- Add `/v1/search` with `scope`, `type`, `q`, pagination, and result highlighting.
- Add module hooks so mutations enqueue reindex jobs.
- Add tests for tenant isolation, patient self-search, representative scoped search, board reviewer scoped search, and support-grant search.

**Acceptance criteria:**

- ETC staff can find a patient, AE, protocol, staff file, or document from one search box.
- Patient search returns only patient-visible records.
- Sponsor search never returns identified PHI.
- Cross-tenant search leakage is covered by semantic SQL/e2e tests.

#### 2.2.3 Subprocessor classification for operational tools

**Decision:** Every tool that can receive telemetry, logs, screenshots, evidence, test findings, or operational metadata is classified before use.

**Phase:** Phase 0 inventory; Sprint 6 DB-backed subprocessor portal.

**To-do list:**

- Add Better Stack/Axiom, Checkly/BetterStack uptime, PostHog, Vanta/Drata, and pen-test vendors to `docs/subprocessors.md`.
- Classify each as `PHI allowed with BAA`, `No PHI by configuration`, or `Synthetic data only`.
- Configure logs/analytics to use generated IDs, tenant IDs, route names, timings, and error codes only; no patient names, diagnoses, free-text clinical content, message bodies, document names, or file URLs.
- Restrict uptime monitors to public health/readiness endpoints unless the vendor has a signed BAA and synthetic data tenant.
- Restrict Vanta/Drata evidence to scrubbed security/compliance metadata; no patient screenshots or exports.
- Require pen-test SOW/NDA always; require BAA if testers access production or real PHI; prefer staging with synthetic PHI.
- Add subprocessor change checklist to CI/release process: any new vendor touching operational data must be classified before merge.

**Acceptance criteria:**

- `docs/subprocessors.md` lists every operational tool and its PHI posture.
- Sentry/log/analytics test fixtures prove synthetic PHI is redacted before export.
- No authenticated synthetic monitoring touches real tenant data.

#### 2.2.4 Sponsor line-level data decision

**Decision:** MVP 1 does **not** grant sponsors identified patient-level PHI access. MVP 1 supports aggregate reporting and de-identified line-level safety/AE records only. Identified sponsor access requires a future `patient_data_sharing_consents` workflow and is Phase 8; moving it earlier is a formal scope change with consent, audit, RLS, counsel, and test work attached.

**Phase:** Sprint 5 sponsor reporting.

**To-do list:**

- Change PPA sharing levels to `aggregate_only` and `deidentified_line_level_safety`; remove identified PHI sharing from MVP UI.
- Add de-identification/tokenization service for sponsor-facing line-level AE/safety records.
- Emit `disclosure_events` for sponsor exports and sponsor access, even when de-identified, with data scope.
- Add k-anonymity suppression for aggregates and small cohorts.
- Add sponsor RLS tests proving sponsor cannot read patient identifiers, message bodies, documents, H&P, consents, agreements, or raw treatment notes.
- Add a Phase 8 stub: `patient_data_sharing_consents` with no active UI in MVP 1.

**Acceptance criteria:**

- Sponsor AE feed has enough safety detail for pharmacovigilance triage but no direct identifiers.
- PPA cannot grant identified sponsor PHI access in MVP 1.
- Any future PHI sponsor access is blocked without explicit patient consent and audit/disclosure events.

#### 2.2.5 Drug accountability

**Decision:** MVP 1 needs basic drug accountability because WST-057 is a drug program and RULE 19 requires expiration monitoring.

**Phase:** Sprint 3 schema/product inventory foundation; Sprint 5 dispense/reconciliation during treatment.

**To-do list:**

- Add `drug_products`, `drug_lots`, `drug_inventory_locations`, `drug_inventory_movements`, `drug_storage_condition_logs`, `drug_dispenses`, and `drug_accountability_reconciliations`.
- Capture lot/batch, expiration, received quantity, current quantity, storage location, disposition, and sponsor/program linkage.
- Capture dispensing at treatment: enrollment, visit, provider, quantity, lot, expiration check, patient-facing medication/treatment name.
- Block dispensing expired lots.
- Include drug accountability in treatment documentation and sponsor reports as de-identified operational data.
- Route expired/disposed product events to safety/QAPI where appropriate.

**Acceptance criteria:**

- ETC can receive, store, dispense, reconcile, and dispose of WST-057 lots.
- Treatment documentation records which lot was administered/dispensed.
- Expired product cannot be dispensed and appears in compliance/safety dashboards.

#### 2.2.6 Treatment plans and outcome measures

**Decision:** Program outcome measures and treatment plans are structured data in MVP 1, not prose fields.

**Phase:** Sprint 2 program configuration; Sprint 4 enrollment instantiation; Sprint 5 outcome capture/reporting.

**To-do list:**

- Add `program_treatment_plan_templates`, `program_visit_schedule_templates`, `program_outcome_measures`, `patient_treatment_plans`, `patient_treatment_plan_milestones`, and `outcome_measure_observations`.
- Program configuration captures outcome measure type, cadence, source (provider / patient PRO / lab / scale), unit, expected direction, required/optional status, and reporting label.
- Enrollment instantiates the program treatment plan and visit schedule into patient-specific plan rows.
- Treatment documentation writes provider observations and required outcome observations.
- PRO survey responses map to `program_outcome_measures`, not unstructured survey blobs only.
- Sponsor aggregate reports and ETRB annual reports read from outcome observations.

**Acceptance criteria:**

- A WST-057 program can define neuropathy-specific outcome measures and visit cadence.
- Each patient enrollment has a concrete plan with due/complete/missed milestones.
- Outcome reports aggregate structured measures without manual spreadsheet cleanup.

---

## 3. Phase 0 — Pre-development (Weeks -2 to 0)

**Goals.** Subprocessor BAAs in motion. All provider accounts exist. Repo and toolchain are bootstrapped. The PRD § 23 open questions have decision deadlines on the calendar.

### 3.1 Subprocessor BAA execution (P0 critical path) — PRD §§ 6.1, 17.9

For each subprocessor, owner = founding product:

| Subprocessor | Plan tier | BAA SLA target |
|---|---|---|
| Vercel | Enterprise | Week 0 |
| Railway | Pro | Week 0 |
| Supabase | Team | Week 0 |
| Clerk | Production | Week 0 |
| Stripe | Healthcare | Week 0 |
| Plaid | Production | Week 0 |
| Resend | Pro/Enterprise | Week 0 |
| Sentry | Business | Week 0 |
| Cloudflare | Enterprise | Week 1 (DNS does not need BAA; WAF-on-PHI does) |
| Daily.co (or chosen video) | HIPAA | Week 4 (before Sprint 4 PHI capture) |
| E-signature provider | per chosen vendor | Week 2 (before Sprint 2 PPA flow) |
| Better Stack or Axiom | log aggregation | Week 0 classification; BAA only if PHI logging is ever permitted |
| Checkly or BetterStack uptime | synthetic monitoring | Week 0 no-PHI classification |
| PostHog | self-hosted or no-PHI hosted | Week 0 no-PHI classification; BAA/DPA before hosted PHI |
| Vanta or Drata | compliance evidence | Week 0 no-PHI evidence policy; BAA/DPA if PHI-adjacent evidence is uploaded |
| Pen-test vendor | security testing | Book Week 0; synthetic-data-only unless BAA executed |

**No real PHI ever crosses a subprocessor without a signed BAA.** Sprint 4 introduces PHI; Phase 0 must clear the BAA backlog for everything that will see PHI by then.

Track in Internal Admin Portal subprocessor view (built in Sprint 6 but seeded as a markdown table in `docs/subprocessors.md` from Phase 0).

Phase 0 also classifies each vendor as `PHI allowed with BAA`, `No PHI by configuration`, or `Synthetic data only`. A vendor cannot be added to production logging, analytics, monitoring, compliance evidence, or testing without a row in `docs/subprocessors.md` and a launch/change approval.

### 3.2 Provider account provisioning

- Cloudflare: register `corridor.health`, create wildcard cert (`*.corridor.health`), set up zone, provision subdomains: `app`, `patient`, `api`, `status`, `www` (placeholder), and reserve the `*.corridor.health` pattern for per-ETC public pages.
- Clerk: create production application, configure MFA, session lifetime, and webhooks. Clerk authenticates identity only; Corridor tenant memberships live in Postgres and are the source of truth for RLS. Clerk orgs may be used for UX later, but are never authoritative for database authorization.
- Supabase: create three projects (dev, staging, prod), enable HIPAA-eligible config (Team plan), create the HIPAA bucket, enable extensions: `pgcrypto`, `uuid-ossp`, `pg_trgm`, `pgaudit` (where supported).
- Railway: three projects (dev, staging, prod), Redis service per env, API service per env, workers service per env.
- Vercel: two projects per env (`app` and `patient`), connect to Cloudflare DNS, configure env vars. Preview deploys per PR.
- Stripe: healthcare-eligible account, two API keys (test + live), webhook endpoint configured (signature secret stored in fnox).
- Plaid: production keys, webhook URL configured.
- Resend: domain SPF/DKIM verification on `corridor.health`, sandbox + production API keys.
- Sentry: three projects per environment × frontend/backend split.
- PostHog (preferred for self-host privacy): production instance, project per env.

### 3.3 Repository and toolchain

- Initialize repo at `github.com/<org>/corridor`. Branch protection on `main` requires CI green + 1 approval + signed commits.
- Monorepo skeleton:
  ```
  apps/
    app/            # staff/business console — Vite/React
      src/
        portals/
          sponsor/  # sponsor / biotech manufacturer persona
          etc/      # ETC operator persona
          admin/    # Corridor internal admin persona
          shared/   # shared staff/business shell primitives
    patient/        # patient-facing portal — Vite/React
      src/
        portal/     # public discovery + authenticated patient surfaces
    api/            # Hono API — Node
      src/
        domains/
          sponsors/
          etcs/
          patients/
          boards/
          internal-admin/
    workers/        # BullMQ workers — Node
  packages/
    shared/         # zod schemas, types, time.ts, intl helpers
    db/             # drizzle schema, migrations, seed, semantic RLS suite
    ui/             # shared shadcn/ui primitives, design tokens
    rbac/           # role/permission map shared across portals
    pdf/            # React-Email + Puppeteer templates
    notifications/  # email template definitions
  docs/
    prd.md
    implementation.md
    subprocessors.md
    runbooks/
  .claude/rules/    # path-scoped Claude instructions
  ```
- Commit `mise.toml`, `fnox.toml`, `.gitignore`, `CLAUDE.md` from existing files.
- Per-app `package.json` scripts wrap in `fnox run -P <profile> --` for dev.
- `env/.env.local.example` (template devs copy to `.env.local`) and `env/.env.<app>.example` per app/worker (documentation of each fnox-profile surface), committed as templates for non-secret config (`VITE_API_BASE_URL`, `PORT`, `LOG_LEVEL`, …).
- Drizzle chosen over sqitch (TS-native, schema-as-code, integrates with shared types).

### 3.4 CI/CD scaffolding

- GitHub Actions workflows:
  - `pr.yml` — `mise run ci` on every PR (typecheck, lint, format:check, test, test:a11y, db:rls:test).
  - `deploy-staging.yml` — on merge to `main`, deploy to staging.
  - `deploy-prod.yml` — manual trigger from `main` after staging green for 1 hour.
  - `nightly.yml` — full e2e on staging, DR drill validation (monthly cadence in CI).
- CI age key: pubkey added to `fnox.toml` `[providers.age].recipients`; private key as GitHub Actions secret.

### 3.5 Per-developer onboarding

- Generate `~/.config/age/key.txt`, share pubkey with founding product, get added to `fnox.toml`.
- `mise install` provisions Node/pnpm/Postgres client tools.
- Local Docker Compose infrastructure via `mise run dev:infra` provides Postgres and Redis.
- `env/.env.local.example` documents safe local defaults; provider secrets still come from `fnox` profiles.
- Run `mise run ci` from a clean clone — must be green.

### 3.6 Legal and compliance content setup

- Open counsel workstream for: AE clock basis, informed consent text, patient agreement, 50-12-110 statutory text, grievance policy, PPA data-sharing language, privacy rights notices, and P&P seed templates.
- Create `docs/legal-content-inventory.md` listing every regulated template, owner, source citation, counsel status, and sprint needed.
- Decide AE clock basis by Phase 0 if counsel is available; if not, implementation uses the conservative earliest-known timestamp warning model from § 2.1.5 until counsel resolves.
- Mark legal template review as a Sprint 2 blocker for PPA and a Sprint 4 blocker for consent/agreement.

### 3.7 Phase 0 acceptance criteria

- [ ] All subprocessor BAAs requested; all "Week 0" subprocessors signed.
- [x] `docs/subprocessors.md` exists and classifies Better Stack/Axiom, Checkly/BetterStack uptime, PostHog, Vanta/Drata, and the pen-test vendor with PHI posture and BAA/no-PHI decision.
- [ ] All provider accounts provisioned across three environments.
- [ ] Repo created with monorepo skeleton; `mise run ci` green from a clean clone.
- [ ] Brand system kickoff has happened (parallel track; not gating engineering).
- [ ] Decisions #6 (e-sign) and #7 (slug strategy) locked or have hard deadline ≤ Week 2.
- [x] Legal content inventory exists with counsel owners and required sprint deadlines.
- [x] AE clock basis decision is either resolved by counsel or defaulted to conservative earliest-known warning model.

---

## 4. Phase 1 — Foundation (Sprint 1, Weeks 1–2)

**Goals.** A clean tenancy, RLS, and audit foundation that every subsequent feature builds on without revisiting. Auth + storage + notification queue contracts in place. Empty portal shells routed correctly. Time/i18n primitives. The first three worker queues registered, with functional processors landing in their feature phases.

This is the most leveraged sprint. Time spent here saves 5x time later. Do not under-invest.

### 4.0 Local foundation implementation status — reviewed 2026-04-25

These items track the local development foundation added before continuing deeper Sprint 1 product work. They do not replace the Sprint 1 acceptance criteria below; they close the local Docker/API/worker gaps discovered during implementation review.

- [x] Docker Compose local infrastructure exists for Postgres and Redis with named volumes and health checks.
- [x] Corridor local ports are isolated from Navwise Broker and common defaults: staff app `13000`, API `13001`, patient app `13002`, Postgres `15432`, Redis `16379`.
- [x] Root and mise scripts expose `dev:infra`, `dev:api`, `dev:workers`, `dev:app`, `dev:patient`, `dev:all`, `dev:down`, `db:migrate`, and `db:seed`.
- [x] Database runtime config supports `DATABASE_URL` first, then `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD`.
- [x] Migration/seed config is split from runtime config through `MIGRATION_DATABASE_URL` / `MIGRATION_DB_*`, so app runtimes never need the migration-owner connection string.
- [x] Redis runtime config supports `REDIS_URL` first, then `REDIS_HOST` and `REDIS_PORT`.
- [x] API startup initializes Postgres and Redis before listening, and `/readyz` checks Postgres with `select 1` plus Redis with `PING`.
- [x] Worker startup initializes Postgres and Redis, registers BullMQ workers for `notifications`, `pdf`, and `compliance`, logs registered queues, and handles `SIGINT`/`SIGTERM`.
- [x] Worker processors are intentionally scaffold-only in Sprint 1; they are gated to local/test by default and non-local stub execution requires explicit `ENABLE_STUB_WORKERS=true`.
- [x] SQL migrations run through a Node/pg runner rather than an undeclared host `psql` dependency.
- [x] Migration 0011 creates `app_api`, `app_worker`, and `app_migrator`; grants app schemas to runtime roles; and applies `FORCE ROW LEVEL SECURITY` to every RLS-enabled table.
- [x] `db:seed` inserts synthetic local tenants, users, relationships, and a draft program without real PHI.
- [x] `env/.env.local.example`, app env examples, README, developer onboarding, and local-development runbook document the canonical local path.
- [x] Local smoke test passed on the dedicated Corridor ports: Docker Postgres/Redis up, migrations applied, seed applied, API `/healthz` and `/readyz` passed, and workers registered all three queues.
- [x] Verification passed: `pnpm -r typecheck`, `pnpm -r lint`, `pnpm format:check`, `pnpm -r test`, and `pnpm -r build`.
- [x] Clerk JWT auth, tenant resolution, request-scoped DB transactions, and transaction-local RLS context are mounted before authenticated domain routes.
- [x] `AppContext` now includes tenant role and is zod-validated before setting Postgres session variables.
- [x] API and worker runtimes use structured pino loggers with PHI/secret redaction; `console.*` is banned in runtime source by ESLint and API CI.
- [x] API global hardening exists: security headers, CORS allowlist, 1 MB body limit, sanitized error envelopes, Redis-backed rate limits, and Redis-backed idempotency-key middleware.
- [x] API publishes generated docs at `/v1/openapi.json` and `/v1/docs`; `pnpm run contracts:openapi:check` gates route/OpenAPI drift in PR/API CI.
- [x] Webhook signature-verification scaffolds exist for Clerk, Stripe, Plaid, and Resend; state-changing handlers remain in their feature phases.
- [x] Domain route shells now call service-layer functions instead of embedding future business logic directly in route files.
- [x] Shared API contract primitives exist for branded IDs, canonical error envelopes, cursor pagination, and per-domain response shapes.
- [x] Internal admin routes are role-gated to `corridor_admin`, require a support-ticket context, and write access audit rows through the DB audit helper.
- [x] Regular API, worker, and CI fnox profiles exclude `SUPABASE_SERVICE_ROLE_KEY`; `workers_elevated_dev` is the only local profile allowed to receive it, enforced by `pnpm run secrets:profiles:check` in PR/API CI.
- [x] RLS coverage is now part of the local/CI gate via `packages/db/scripts/check-rls-coverage.ts` and `mise run db:rls:coverage`; the static gate now requires `FORCE ROW LEVEL SECURITY`, SELECT policy coverage, and write policy coverage for every RLS-enabled table.
- [x] Semantic runtime-role coverage asserts `app_api` and `app_worker` are login-capable `NOBYPASSRLS` roles and that `app_api` cannot read tenant rows without transaction-local app context.
- [x] Representative/minor-assent semantic RLS coverage proves care-team relationships are not enough to write unless the ETC user also has the required tenant role grant; non-self signing authority requires a verified authority document.
- [x] Latest RLS hardening verification passed: API/DB/workers typecheck + lint, `pnpm --filter @corridor/db rls:coverage`, fresh-DB `migrate:local`, semantic runtime-role RLS checks, `pnpm format:check`, and `git diff --check`.

### 4.1 Database foundation (PRD §§ 13.1, 13.3, 14.1, 14.10, 14.11, 18.4)

In `packages/db`:

- Drizzle config with split schema files per domain (tenancy, regulatory, sponsor, etc, etrb, patient, ae, qapi, grievance, compliance, inventory, payments, search, audit_infra).
- Migration 0001 — create the security primitives:
  - `tenants` (security boundary; kind enum: `sponsor` | `etc` | `patient` | `board` | `corridor_internal`; status; display_name)
  - `users` (Clerk identity, email, name, phone)
  - `tenant_memberships` (user × tenant × role; multi-membership supported per PRD § 8.1; includes status, starts_at, ends_at)
  - `tenant_relationships` (from_tenant_id, to_tenant_id, kind, scope_json, status; used for PPA access, board-to-ETC access, caregiver/guardian access, and future cross-tenant grants)
  - `support_access_grants` (staff_user_id, target_tenant_id, ticket_id, scopes, starts_at, expires_at, approved_by_user_id, revoked_at)
  - `audit_log` (append-only; every column from PRD § 13.1)
  - `file_storage_objects` (Supabase Storage pointer; SHA-256; size; mime; uploaded_by; uploaded_at; bucket; immutable_ref boolean)
  - `notifications` (queue rows; channel enum with `email` only in MVP 1, abstracted for SMS Phase 2)
  - `feature_flags` (per-tenant overrides)
- Domain legal/business entity tables are not security primitives. `sponsor_organizations`, `etc_organizations`, `patients`, and `boards` each reference `tenants.id`; RLS always keys off tenant ownership and explicit tenant relationships, never off a generic `organizations.kind`.
- Migration 0002 — create state-first regulated-object primitives:
  - `regulatory_jurisdictions` (seed Montana; timezone `America/Denver`; status)
  - `regulatory_rule_versions` (source citation, effective_at, superseded_at, counsel_review_status)
  - Add `jurisdiction_id` to regulated tables as they are introduced; migrations must not create a regulated table without an explicit jurisdiction field.
- Migration 0003 — create the **append-only Postgres trigger** on `audit_log`:
  ```sql
  CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS TRIGGER AS $$
  BEGIN RAISE EXCEPTION 'audit_log is append-only'; END; $$ LANGUAGE plpgsql;
  CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
  CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
  ```
- Semantic SQL RLS harness (`mise run db:rls:test`) with test 0001 asserting the trigger raises on UPDATE and DELETE. The harness is in-repo and does not require the external pgTAP extension.
- Migration 0004 — create architecture-preserved stubs required by PRD § 7:
  - Device: `investigational_devices`, `patient_device_registry_entries` with RULE 21 workflow status disabled by default.
  - Inpatient: `inpatient_facility_profiles` linked to ETC tenant; nullable RULE 24 evidence fields; validation inactive for outpatient MVP tenants.
  - Payments: `payment_rails`, `payment_obligations`, `payment_transactions`; seed `stripe_card` and `stripe_ach` active, alt-currency rails disabled.
  - HFAR Path A: `hfar_path_a_allocations` inactive until DPHHS/counsel defines qualifying-resident rules.
  - Sponsor data-sharing future stub: `patient_data_sharing_consents` inactive in MVP 1.
- Migration 0005 — create tenant-scoped search foundation:
  - `search_index_documents` (source_table, source_id, owner_tenant_id, patient_tenant_id nullable, visibility_classification, title, redacted_snippet, search_vector, indexed_at)
  - `search_index_jobs` (source_table, source_id, requested_at, processed_at, error)
  - Postgres FTS indexes and trigram indexes; no external search vendor in MVP 1.
- Migration 0006 — create relationship-aware RLS helpers and non-recursive read policies:
  - Fix tenant-membership self reads without recursive policy evaluation.
  - Patient self, care-team, and consented-sponsor read paths are mediated through explicit tenant relationships.
  - PPA-related ETC reads are mediated through relationship helper functions rather than organization-kind shortcuts.
- Migration 0007 — create DB-enforced retention foundation:
  - `app.compute_retention(...)` centralizes retention windows.
  - `audit_log.retention_until` and `file_storage_objects.retention_*` carry immutable retention metadata.
  - Delete/truncate enforcement prevents accidental removal before retention expiry.
- Migration 0008 — create write-policy foundation:
  - `app.can_write_for_tenant(...)` and role/action grants drive mutation eligibility.
  - Write policies are added for RLS tables introduced in Sprint 1.
  - Search/global tables receive explicit scoped policies instead of relying on default access.
- Migration 0009 — tighten audit/global helpers:
  - Introduce a sentinel system tenant for system-scoped audit rows.
  - Enforce non-null audit tenant context and add `app.write_audit(...)`.
  - Add `app.current_role()` for diagnostics/audit context while keeping authorization policies tied to `tenant_memberships`.
  - Add `app.resolve_authenticated_membership(...)` as the only narrow pre-RLS tenant bootstrap helper used after Clerk verification.
  - Tighten notification, feature-flag, and search-index global reads.
  - Remove the unused encrypted sponsor tax-id field from the current schema.
- Migration 0011 — enforce runtime role separation:
  - Create `app_api` and `app_worker` as login-capable `NOBYPASSRLS` runtime roles.
  - Create `app_migrator` as the non-runtime DDL role placeholder for managed environments.
  - Grant schemas, tables, sequences, and `app` helper functions to app runtime roles without transferring table ownership.
  - Apply `FORCE ROW LEVEL SECURITY` to every RLS-enabled table so table ownership cannot bypass policies.
- Migration 0012 — harden representative/minor-assent write authority:
  - Add `app.current_tenant_member_grants_action(...)` for transaction-local role/action checks.
  - Require both an active care-team relationship and the appropriate ETC membership grant for representative/minor-assent writes.
  - Replace broad `FOR ALL` write policies with command-specific INSERT/UPDATE/DELETE policies so write grants do not widen read visibility.
  - Require verified authority-document evidence before a non-self representative can hold signing authority.
- Migration 0013 — correct PPA program-read direction:
  - Sponsor program visibility follows the canonical sponsor-to-ETC PPA relationship direction.
- Migration 0014 — scope global write policies to write commands:
  - Replace `FOR ALL` notification and feature-flag write policies with explicit INSERT/UPDATE/DELETE policies so write grants cannot widen SELECT visibility.
- RLS helper functions live in SQL migrations and read only transaction-local application context:
  - `app.current_user_id()` from `current_setting('app.user_id', true)`
  - `app.current_tenant_id()` from `current_setting('app.active_tenant_id', true)`
  - `app.current_role()` from `current_setting('app.role', true)` for diagnostics/audit context only
  - `app.current_request_id()` from `current_setting('app.request_id', true)`
  - `app.current_support_ticket_id()` from `current_setting('app.support_ticket_id', true)`
  - `app.is_tenant_member(target_tenant_id, allowed_roles)` checks active `tenant_memberships`
  - `app.has_tenant_relationship(from_tenant_id, to_tenant_id, kind)` checks active cross-tenant grants
  - `app.has_active_support_grant(target_tenant_id, scope)` checks time-boxed support access grants
- RLS policy contract is implemented in migrations, not a separate template directory in this slice:
  - Owner read/write through `app.current_tenant_id()` and role grants.
  - Relationship read paths through `tenant_relationships`.
  - Patient self-read and representative/caregiver relationships through patient tenant relationships.
  - Board reviewer reads through board tenant membership and explicit review assignment tables as those tables land.
  - Corridor support reads only through active ticket-scoped grants.
- Database roles:
  - `app_api` and `app_worker` have no `BYPASSRLS`; all app and worker queries run under forced RLS.
  - Local app runtime uses `DATABASE_URL=postgres://app_api:...`; local worker runtime uses `WORKER_DATABASE_URL=postgres://app_worker:...`; migrations and seed use `MIGRATION_DATABASE_URL=postgres://corridor:...`.
  - `app_migrator` is the managed-environment DDL role placeholder and is never available to app or worker runtimes. In local Docker, `corridor` remains the bootstrap owner only for migrations/seed.
- `packages/db` exports context helpers that validate `AppContext` before running `set local app.user_id`, `app.active_tenant_id`, `app.role`, `app.request_id`, and optional `app.support_ticket_id`. The DB-side `app.write_audit(...)` helper is the authoritative same-transaction audit primitive for mutations.

### 4.2 Storage bucket (PRD § 13.3)

- Create HIPAA-eligible bucket `corridor-storage-prod` (and dev/staging counterparts).
- Bucket policy: only the backend storage adapter can mint signed URLs (5-min TTL) for client downloads; frontend never receives Supabase database credentials. No Supabase service-role key is used for Postgres queries in app or worker runtimes.
- `packages/db/storage.ts` exports `uploadFile()` that:
  - Computes SHA-256 client-side and server-side (verify match).
  - Inserts into `file_storage_objects` in a transaction.
  - For regulated objects (patient agreements, informed consent recordings, ETRB approvals) sets `immutable_ref = true`.
- Tamper-detection signing for sensitive objects (consent recordings, AE attachments) — append `_signed.bin` artifact next to the file with HMAC-SHA-256 of payload + key from app-layer secret.

### 4.3 Hono API skeleton (`apps/api`) — PRD § 15

- Hono app with unversioned platform health endpoints and version-prefixed product/API routes under `/v1/*`.
- Middleware/order now implemented for the foundation slice:
  1. Request ID.
  2. Security headers, CORS allowlist, and 1 MB body limit.
  3. Structured pino access logging with PHI/secret redaction.
  4. Redis-backed public rate limit.
  5. Sanitized error handler.
  6. Public `/healthz`, `/readyz`, `/v1/openapi.json`, `/v1/docs`, and signed webhook ingress.
  7. Clerk JWT verification for authenticated routes.
  8. Tenant context resolution from route/header, membership/relationship verification, tenant role capture, and request-scoped Postgres transaction/RLS context.
  9. Redis-backed authenticated-tenant rate limit.
  10. Versioned domain routes.
- `/healthz` is liveness. `/readyz` checks Postgres with `select 1` and Redis with `PING`. There is intentionally no `/v1/health`.
- Webhook endpoint scaffolds verify Clerk, Stripe, Plaid, and Resend signatures before any state change; payload handlers remain in later phases.
- OpenAPI 3.1 documentation is hand-authored for the current route scaffold, exposed at `/v1/openapi.json` plus Scalar UI at `/v1/docs`, and guarded by `pnpm run contracts:openapi:check` so route handlers cannot drift from documented path/method coverage.
- Domain routes use a service-layer seam so future business logic, transactions, authorization, and audit behavior do not accrete inside route handlers.

### 4.4 Workers (`apps/workers`) — PRD § 16

- BullMQ + Redis on Railway.
- Three queue contracts from day 1:
  - `notifications` — dispatch contract now; real Resend delivery processor lands with notifications activation.
  - `pdf` — rendering contract now; Puppeteer templates and render processor land in the PDF phases.
  - `compliance` — scheduler contract now; rule-specific jobs land in Sprint 3.
- Worker registry pattern; new workers register named processors through the shared queue helpers.
- Production refuses scaffold processors unless `ENABLE_STUB_WORKERS=true` is explicitly set, so placeholder workers cannot masquerade as live processing.
- Local dev connects to Docker Redis via `mise run dev:infra`; API and worker readiness both check Postgres and Redis.

### 4.5 Frontend shells (`apps/app`, `apps/patient`)

- Vite + React 18 + TypeScript strict.
- Tailwind config with design tokens from brand work (or placeholders).
- shadcn/ui primitives initialized in `packages/ui`.
- Deployment boundary:
  ```mermaid
  flowchart LR
    AppHost[app.corridor.health] --> App[apps/app]
    App --> Sponsor[apps/app/src/portals/sponsor]
    App --> ETC[apps/app/src/portals/etc]
    App --> Admin[apps/app/src/portals/admin]
    PatientHost[patient.corridor.health] --> Patient[apps/patient]
    Patient --> PatientPortal[apps/patient/src/portal]
    App --> API[apps/api]
    Patient --> API
  ```
- `apps/app` is one deployable staff/business console. Sponsor/biotech manufacturer, ETC, and Corridor internal admin are role-routed modules inside `apps/app/src/portals/*`, not separate frontend applications.
- `apps/patient` is a separate deployable patient product because it has distinct auth posture, UX, PHI exposure, analytics/logging constraints, accessibility review, bundle, and release risk.
- API domain modules live under `apps/api/src/domains/{sponsors,etcs,patients,boards,internal-admin}` so backend ownership mirrors the PRD domains without creating extra deployables.
- React Router with role-based route trees:
  - `apps/app`:
    - `/` (post-login redirect by active tenant kind × membership role)
    - `/sponsor/*` (Sponsor / biotech manufacturer portal — module root: `apps/app/src/portals/sponsor`)
    - `/etc/*` (ETC portal — module root: `apps/app/src/portals/etc`)
    - `/admin/*` (Internal admin — module root: `apps/app/src/portals/admin`)
  - `apps/patient`:
    - `/` (discovery / public)
    - `/me/*` (auth-gated patient portal — module root: `apps/patient/src/portal`)
- Clerk React SDK integrated; MFA enforced for sponsor + ETC users; optional for patients (encouraged at signup).
- TanStack Query client configured; default fetcher reads Clerk session and adds Authorization header. Frontends call only the Hono API; there is no browser-side Supabase database client.
- react-hook-form + zod resolver wired into a sample form; ESLint rule blocks unstructured form patterns.
- react-intl `IntlProvider` at app root; `defaultLocale = 'en'`; `messages/en.json` seeded.
- `packages/shared/time.ts` — `montanaTz()`, `montanaDeadline()`, `daysUntilDeadline()`, `formatMontana()`. Uses `date-fns-tz`.
- Empty page stubs for every route the PRD will touch (so subsequent phases just fill them in).
- Sentry frontend init with PHI scrubber.
- A11y baseline: focus rings, semantic landmarks, skip-to-content link, color contrast tokens that satisfy WCAG AA.

### 4.6 Notifications (PRD § 13.2)

- Resend account configured; domain verified.
- `packages/notifications` exports template registry + `send(channel, template, recipient, payload)`.
- React Email templates for the few transactionals already needed: invite, account-created, password-reset.
- Notification dispatcher queue contract exists in Sprint 1; the real Resend dispatcher, delivery tracking, and retry lifecycle are implemented with notifications activation.
- Delivery webhook from Resend updates row status (Sprint 1 wires the path; full lifecycle handling Sprint 2+).

### 4.7 Observability + status page (PRD §§ 17.6, 20.2)

- Sentry frontend + backend + workers wired; PHI scrubber tested with synthetic fixtures.
- Log aggregation: Better Stack (or Axiom) connected; service tags per app; log retention 30 days dev, 365 days prod.
- Uptime monitoring: BetterStack synthetic checks on `app`, `patient`, `api`, `status` every 60s.
- Status page placeholder at `status.corridor.health` (BetterStack-hosted; full template in Sprint 6).

### 4.8 Sprint 1 acceptance criteria

- [ ] `mise run ci` green from a clean clone.
- [ ] Semantic RLS suite proves: sponsor, ETC, patient, board reviewer, patient representative, and Corridor support policies allow only their explicitly scoped rows.
- [ ] Semantic RLS suite proves cross-tenant denial for unrelated tenants across every PHI-bearing table.
- [x] Runtime DB roles are separate from the migration owner: `app_api`/`app_worker` are `NOBYPASSRLS`, every RLS table is forced, and tests prove app-role reads fail without app context.
- [x] Architecture-preserved stubs exist for device registry, inpatient profile, payment rails/obligations/transactions, HFAR Path A, and future sponsor patient-data-sharing consents.
- [ ] Every regulated table introduced in Sprint 1 has `jurisdiction_id`; test fails on regulated tables without jurisdiction.
- [ ] Search foundation tables and indexes exist; search RLS tests prove one tenant cannot discover another tenant's rows through snippets or counts.
- [x] Semantic SQL test proves: `audit_log` UPDATE and DELETE both raise.
- [x] Clerk React providers and route guards exist for `apps/app` and `apps/patient`; preview Clerk application wiring and app-user MFA enforcement remain deployment tasks.
- [ ] A test mutation through the API writes the matching `audit_log` row.
- [ ] Notification dispatcher sends a Resend email end-to-end (preview env).
- [x] All four product surfaces render their empty navigation per PRD § 8.3: sponsor/biotech manufacturer, ETC, internal admin in `apps/app`, and patient in `apps/patient`.
- [ ] Sentry captures a test error from each frontend and from the API; PHI scrubber test passes.
- [x] Time helpers correctly compute "days until Feb 1 deadline" with America/Denver semantics.
- [ ] All subprocessors with PHI exposure planned for Phase 2 have signed BAAs.

---

## 5. Phase 2 — Sponsor + ETC Onboarding (Sprint 2, Weeks 3–4)

**Goals.** Sponsor can onboard, configure a program (with protocol PDF), and invite an ETC. ETC can be created, complete the licensure wizard end-to-end, and produce a DPHHS-ready RULE 5 application package. PPA flow signs cleanly. E-signature provider integrated. The 90-day approval clock is visible on the ETC dashboard skeleton.

### 5.1 Sponsor onboarding (PRD § 9.1)

- Internal admin tooling (very minimal): a Next.js-style script `provision-tenant.ts` that creates a sponsor `tenant`, creates the linked `sponsor_organizations` legal profile, and sends a Clerk invite. (Full admin UI lands Sprint 6.)
- Onboarding wizard at `/sponsor/onboarding` — captures every field in PRD § 9.1 data block.
- Tax ID column uses pgcrypto application-layer encryption (`pgp_sym_encrypt`) with a key from KMS-equivalent secret.
- BAA + MSA "signed_at" tracked but PDFs uploaded out-of-band initially (no signing-flow integration for these — they're contracts with Corridor, not regulatory artifacts).

### 5.2 Sponsor program configuration (PRD § 9.2)

- New page `/sponsor/programs/new` with form fields per PRD § 9.2.
- Eligibility criteria editor — structured form (age range slider, indication picker with ICD-10 search, multi-select for contraindications, free-text for residual). Stored as `eligibility_criteria_json`.
- Treatment plan template editor — visit cadence, expected duration, milestone sequence, required documentation, and provider role requirements. Stored in `program_treatment_plan_templates` and `program_visit_schedule_templates`, not as a prose blob.
- Outcome measure builder — measure name, source, cadence, unit, expected direction, required/optional flag, and reporting label. Stored in `program_outcome_measures`; these definitions drive PRO forms, treatment documentation, sponsor aggregates, and ETRB reports.
- Drug accountability setup — product identity, lot/batch fields, storage requirements, expiration/disposition rules, and dispensing constraints. Creates `drug_products` rows; ETC lot receipt happens in Sprint 5 before treatment documentation.
- Protocol upload via `packages/db/storage` with SHA-256 hash and `immutable_ref = true`.
- `programs` state machine implemented as enum + transition validators in API; transitions written to `program_versions`.
- Patient-facing description renders in a preview pane (Markdown allowed; sanitized via `dompurify`).
- ICD-10 dataset seeded from a CMS-released CSV (no PHI).
- Trace test: any protocol upload creates a program_version row + audit log + file_storage_objects row.
- Trace test: a WST-057 program cannot transition to `Active` until it has at least one treatment plan template, one visit schedule template, required outcome measures, and drug accountability configuration.

### 5.3 ETC tenant creation (PRD § 10.1 Step 1)

- Standard Clerk invite flow.
- ETC admin lands on `/etc/onboarding`; tenant created in `Application Pending` status.

### 5.4 ETC licensure wizard (PRD § 10.1 Steps 2–4) — the differentiator

This is the largest single feature in Sprint 2. Treat as a save-as-you-go form across 13 sections:

| Section | Mapped to | Required fields |
|---|---|---|
| Applicant identity | RULE 5(1), 50-5-203 | legal entity, address, contact |
| Medical director | RULE 5(1)(a),(b) | name, MT license, credentials upload |
| Administrator | RULE 5(1)(b) | name, qualifications, credentials upload |
| Disclosures | RULE 5(1)(c) | prior closures/felonies/admin actions checklist |
| Professional staff roster | RULE 5(1)(b) | per-person license type + number |
| Treatment types offered | RULE 5(1)(d) | structured taxonomy (oral/topical/infusion/device/other) |
| Reputable character | RULE 5(1)(e) | attestation checkbox + narrative |
| HFAR fulfillment plan | RULE 5(1)(f), SB 535 § 2 | Path A or B selection + plan narrative |
| Designation | RULES 23 vs 24 | outpatient/inpatient (MVP 1: outpatient only) |
| Physical plant | RULES 23 (or 24 deferred) | floor plan upload, square footage, exam rooms |
| Local building authority | RULES 23(1), 24(1) | uploaded approval document |
| Fire marshal | RULES 23(2), 24(2) | uploaded inspection |
| Transfer agreement | RULE 13(2) | hospital, signed agreement upload, expiration |

Implementation pattern:

- Each section is a route under `/etc/licensure/:section` with its own zod schema.
- Wizard state stored in `license_applications.draft_data_json` (encrypted at rest).
- Auto-save on every field blur. Last-saved-at indicator.
- Section-complete state computed; sidebar shows completion %.
- "Submit to DPHHS" terminal action: triggers the PDF generation worker.

### 5.5 DPHHS-ready PDF (PRD § 10.1 Step 3)

- Puppeteer worker renders a single PDF from `packages/pdf/templates/license-application.tsx`.
- All 13 sections + all uploaded attachments compiled into one document.
- p95 generation < 15s (PRD § 20.1).
- ETC admin downloads; Corridor does not file with DPHHS (PRD explicit choice).
- After submission, ETC admin enters `dphhs_submitted_at`; tenant transitions to `Application Submitted`.
- 90-day approval clock starts (computed as `dphhs_submitted_at + 90 days`, displayed in America/Denver).

### 5.6 ETC ↔ Sponsor invitation + PPA (PRD § 9.3)

- Sponsor admin from `/sponsor/etc-network` invites ETC by legal name + primary contact email.
- If ETC tenant exists by email match, in-app invite. Otherwise Clerk invite that creates ETC tenant on accept.
- Invitation references the program; on accept, ETC sees PPA generation prompt.
- PPA template: counsel-approved `legal_content_template_versions` rendered by `packages/pdf/templates/ppa.tsx`. Populated with sponsor + ETC + program details.
- PPA data-sharing level is limited to `aggregate_only` or `deidentified_line_level_safety` in MVP 1. The UI does not expose identified sponsor PHI sharing; future `patient_data_sharing_consents` stays dormant until Phase 8.
- Both sides sign in-platform via the chosen e-signature provider (Documenso self-hosted recommended).
- Signed PPA stored as `program_participation_agreements` row + `file_storage_objects` + `rendered_legal_documents` (immutable, with template version ids and input hash).
- E-sign provider events (signed-by-A, signed-by-B, completed) update `signed_at` columns.

### 5.7 ETC dashboard skeleton (PRD § 10.2)

- Build the dashboard route shell with all 10 widget slots from PRD § 10.2.
- Implement only: license status + 90-day countdown, recent activity feed.
- Other widgets stubbed with "Coming in Sprint X" so the layout is right.

### 5.8 Sponsor dashboard skeleton (PRD § 8.3 nav)

- Build the seven nav items (Programs, ETC Network, Patients, AEs, Reports, Billing, Settings).
- Programs and ETC Network functional; others stubbed.

### 5.9 Internal admin slice (PRD §§ 12.1, 12.2, 12.7) — incremental

- `/admin/tenants` — list of all `tenants` with kind + status, joined to legal/business profile tables where available.
- `/admin/users` — read-only cross-tenant user list.
- `/admin/subprocessors` — markdown-rendered table from `docs/subprocessors.md`. Move to DB-backed in Sprint 6.

### 5.10 Sprint 2 acceptance criteria

- [ ] Sponsor can onboard end-to-end and create a program with a protocol PDF.
- [ ] Sponsor program creation captures treatment plan templates, visit schedule templates, outcome measures, and drug accountability setup as structured rows.
- [ ] Program protocol upload writes immutable `file_storage_objects` row with SHA-256.
- [ ] Eligibility criteria stored as structured JSON; round-trip rendering works.
- [ ] ETC can complete the licensure wizard across all 13 sections (save/resume verified).
- [ ] PDF generation produces a DPHHS-ready package; p95 < 15s.
- [ ] 90-day approval clock displays correctly in America/Denver.
- [ ] Sponsor invites an ETC; PPA generated; both parties sign; signed PDF stored immutably.
- [ ] PPA data-sharing options are limited to aggregate-only or de-identified line-level safety; no identified sponsor PHI toggle exists in MVP UI.
- [ ] PPA rendering uses counsel-approved legal template version and records `rendered_legal_documents`.
- [ ] Tax ID is encrypted at rest (verified by reading raw column).
- [ ] All Sprint 2 features have compliance trace tests.
- [ ] Audit log coverage tests pass for every new mutation.
- [ ] Decisions #5 (video provider) and #6 (e-sign — confirmed) locked.

---

## 6. Phase 3 — ETC Operational Backbone (Sprint 3, Weeks 5–6)

**Goals.** An ETC can run its daily operations skeleton: P&P manual is approved and public, staff files are managed, ETRB exists with at least one approved protocol, QAPI cadence is set, compliance dashboard is live and accurate. Provisional licensure gate is enforced. Background jobs drive the time-based reminders.

### 6.1 P&P Manual (PRD § 10.3)

- Migration: `pp_manuals`, `pp_manual_sections`, `pp_manual_section_versions`.
- Seed counsel-approved `legal_content_template_versions` for all 20 RULE 6(2) categories — Montana-tailored language, ETRB-aware. Source markdown may live in `packages/db/seed/pp-templates/<category>.md`, but production rendering uses immutable template versions.
- ETC admin creates manual; sections instantiate from templates.
- Per-section editor (rich text, sanitized).
- Status state machine per section: Draft → Under Review → Approved → (revisions) → Under Review.
- Approval workflow requires both administrator AND medical director sign-off; tracked in `pp_manual_section_versions`.
- Biennial review timer: `next_review_due_at = approved_at + 2 years` (RULE 6(4)).
- Public viewing surface at `etc-name.corridor.health/manual` — read-only, no auth, renders current approved version. **No PHI** (defense in depth: a content scanner on commit blocks PHI patterns).
- Slug strategy decision (PRD § 23 #7) implemented via Cloudflare wildcard.

### 6.2 Staff (PRD § 10.4)

- Migrations: `etc_staff`, `staff_files`.
- Staff roster page; per-staff form for RULE 10(2) artifacts.
- License expiration field; alerts at 90/60/30/7 days (worker; § 6.10 below).
- Out-of-state flag (RULE 10(3)).
- Termination flow with offboarding checklist; Clerk session revocation.
- Filterable roster: role, status, license expiration soonest.

### 6.2A Infection control and safety program (PRD § 10.17; RULES 18, 19)

- Migrations: `infection_control_programs`, `cleaning_logs`, `equipment_disinfection_logs`, `infection_surveillance_events`, `safety_reports`, `expiring_products`.
- Infection control officer assignment linked to `etc_staff`; requires licensed health care professional status and infection-control training evidence.
- Guideline adoption screen records nationally recognized infection-control guideline selection and implementation documentation.
- Cleaning log workflow for treatment areas before use and between patients.
- Equipment disinfection/sterilization log workflow for applicable equipment, accessories, instruments, and implants.
- Infection surveillance event form with corrective/preventive action and QAPI routing.
- Safety report form covering hazards, potential threats, near misses, known adverse incidents, medication errors, falls, and physical injuries.
- Expiring product inventory for medications, reagents, solutions, and other expiration-dated products; alerts before expiration and disposition tracking.
- Compliance dashboard shows missing officer, missing guideline, overdue corrective actions, and expiring products.

### 6.3 ETRB module (PRD § 10.8) — load-bearing

This is the second-largest feature in Sprint 3. Architecture decisions here lock the multi-tenant board pattern that Phase 8 (and the vertical-integration thesis from PRD § 3.2) depend on.

Migrations: `boards`, `board_etc_associations` (M:M), `board_members`, `board_member_conflict_declarations`, `protocol_reviews`, `protocol_review_votes`, `board_meetings`, `board_safety_evaluations`, `board_outside_etc_determinations`, `board_annual_reports`.

#### 6.3.1 Board setup

- ETC admin creates new board OR associates existing board (with permission).
- `board_etc_associations` row carries `written_agreement_file_id` (RULE 16(4)(b)).
- Board members invited as Clerk users with role `etrb_reviewer`.
- **Composition validator** (RULE 16(5)): API rejects status `Active` if board has fewer than 4 members or is missing required role mix (≥1 MT-licensed physician, ≥1 researcher with clinical outcome expertise, ≥1 ethicist).

#### 6.3.2 Conflict of interest (RULE 16(3) + 1-6-105 MCA)

- Each member declares per ETC association.
- `board_member_conflict_declarations` is append-only (similar trigger to audit_log).
- Re-declaration on each protocol review vote.

#### 6.3.3 Protocol review workflow

- Sponsor uploads protocol → ETC associates with board → triggers `protocol_reviews` row.
- Each reviewer sees read-only protocol artifact.
- Per RULE 16(6)(a)(i)–(iv) review checklist: safety standards, informed consent procedures, risk-benefit analysis, alternatives evaluation.
- Vote: Approve / Request Changes / Reject + rationale.
- Quorum + majority logic in API; chair closes review when satisfied.
- Approved protocol creates immutable record with timestamp + voting record + conflict declarations.
- Approval is required gate before the program can be associated with that ETC for patient enrollment (enforced in Sprint 4).

#### 6.3.4 Outside-ETC safety determination (RULE 16(6)(f))

- Per treatment, board records `board_outside_etc_determinations` row with rationale + vote + date.
- This row is the gating event for RULE 25 (Phase 8) — schema supports it now.

#### 6.3.5 Provisional licensure gate (RULE 16(7))

- ETC tenant `status = Provisional` cannot enroll patients into treatment.
- API middleware on `/v1/etcs/:id/patients` and downstream endpoints checks this status.
- `Active` requires: ETRB associated + at least one approved protocol for the program being enrolled into.
- E2E test: attempt to enroll on a Provisional ETC → 403 with rule citation.

#### 6.3.6 Board meetings (RULE 16(6)(b), quarterly)

- `board_meetings` rows; quarterly cadence enforced via job.
- Minutes uploaded as immutable file.
- Outcome data pull from treatments_delivered (Sprint 5 dependency; Sprint 3 ships the meeting record + minutes; data pull lights up later).

#### 6.3.7 Annual public report (RULE 16(6)(c))

- Schema and template ready in Sprint 3; auto-generation lights up Sprint 5 once data flows.
- Published surface: `boards/:slug/annual-report` public page.

#### 6.3.8 Retention enforcement (RULE 16(6)(d))

- DB trigger blocks DELETE on ETRB tables for rows < 5 years old.
- Semantic SQL test asserts the lock fires.

### 6.4 QAPI program (PRD § 10.9)

- Migrations: `qapi_committees`, `qapi_meetings`, `qapi_meeting_minutes`, `qapi_action_items`, `qapi_unresolved_carryovers`.
- ETC admin (or MD) configures committee membership; at least one member per department validator (RULE 15(3)).
- Quarterly cadence enforced via job; calendar invites generated with prep materials.
- Pre-meeting briefing data pull is templated; lights up fully in Sprint 5 when AE/grievance data flows.
- Live meeting interface for chair to capture decisions and action items.
- Minutes upload + chair sign-off; 3-year retention enforcement (DB-level, RULE 15(5)).

### 6.5 Compliance Dashboard (PRD § 10.11)

- Migration: `compliance_obligations`, `compliance_obligation_completions`.
- Per-ETC obligation generator (job from § 6.10 below) creates rows for the PRD-listed obligations on tenant activation, including infection/safety obligations from RULES 18 and 19.
- UI table shows due date, days remaining, status, owner, last completed, and evidence link.
- Widget feeds the compliance health score (PRD § 21.2).

### 6.6 Compliance health score (PRD § 21.2)

- Pure function `computeComplianceScore(etcId)` reading from compliance_obligations, staff_files, etrb associations, transfer_agreements, ae_records, qapi_meetings.
- 0–100 scale; weights per PRD: AE-window heavy, license binary, others weighted.
- Surfaced on ETC dashboard, admin Compliance Watch (Sprint 6), and as aggregate in sponsor ETC Network view.
- Daily recompute via job (§ 6.10); on-demand recompute exposed via API.

### 6.6A Tenant-scoped search (PRD § 13.6)

- Build `/v1/search` against Postgres FTS only; no external search vendor in MVP 1.
- Index sources in Sprint 3: patients, staff, P&P sections, ETRB protocol reviews, QAPI meetings, compliance obligations, transfer agreements, and file metadata. Sprint 4/5 add messages, visits, treatment docs, AEs, grievances, and reports as those tables arrive.
- Search worker consumes `search_index_jobs`; mutations enqueue reindex jobs in the same transaction as the source mutation.
- Snippets are redacted and visibility-classified; never index raw PHI into logs, analytics, or external observability.
- RLS tests cover direct table access and search result leakage: unrelated tenants get zero rows and cannot infer counts from pagination.
- UI: global command/search entry in app shell; patient portal gets scoped search only inside Documents/Messages.

### 6.7 Transfer agreement (PRD §§ 10.7 setup, 10.16)

- Migration: `transfer_agreements`.
- ETC settings page allows upload + expiration date entry.
- Annual renewal countdown widget on dashboard (RULE 13(4)).
- Renewal notification job at 60/30/7 days (§ 6.10).
- Compliance score impact when expired.
- Emergency transfer workflow ships in Sprint 5 (operational flow needs treatment data).

### 6.8 Multi-site management (PRD § 10.16, RULES 7(5), 8(6))

- Migration: `etc_sites`, `etc_administrators`, `etc_medical_directors` (current + historical).
- Settings UI for adding sites under one license.
- Multi-site administrator/MD pattern: one MD/admin can serve multiple ETCs (forward-compat with PRD § 3.2 vertical-integration thesis).

### 6.9 Audit log viewer in admin portal (PRD § 12.3 — partial)

- `/admin/audit` filterable by tenant, user, action, time range.
- Export CSV (background job for large ranges).
- Detail view shows before/after diff.

### 6.10 Background jobs added in Sprint 3 (PRD § 16)

- **Compliance scheduler.** Daily. Generates obligation rows for any ETC that doesn't yet have them. Recomputes due dates. Updates compliance health score.
- **License renewal alerts.** Daily. ETC license expiration, transfer agreement expiration, fire marshal/alarm inspections — 90/60/30/7-day notifications.
- **Staff license expiration alerts.** Daily. RULE 7(1)(g)(ii). Same cadence.
- **Search indexing.** Near-real-time worker consumes `search_index_jobs`, refreshes Postgres FTS documents, and records redaction/visibility classification.

### 6.11 Sprint 3 acceptance criteria

- [ ] ETC creates a P&P manual; all 20 sections render from templates; admin + MD approve a section; biennial review date computed.
- [ ] Public manual page accessible at `etc-name.corridor.health/manual`; no PHI; readable; passes a11y audit.
- [ ] Staff onboarding flow captures all RULE 10(2) artifacts; license expiration alerts queued at 90/60/30/7 days.
- [ ] Infection control officer assigned with qualifying staff/training evidence; guideline adoption documented.
- [ ] Cleaning logs, equipment disinfection logs, safety reports, medication-error/fall injury reports, and expiring product tracking work end-to-end.
- [ ] Infection/safety events route into QAPI briefing data.
- [ ] ETC creates ETRB; composition validator rejects under-spec board.
- [ ] Conflict declarations are append-only (semantic SQL).
- [ ] Sponsor's protocol moves through review → approval; vote record + conflict declarations immutable.
- [ ] Provisional ETC cannot enroll patients (e2e: 403 on `/v1/etcs/:id/patients`).
- [ ] QAPI committee created; quarterly meeting scheduled; minutes upload tested; 3-year retention lock verified.
- [ ] Compliance dashboard shows all PRD-listed obligations with correct due dates/evidence status in America/Denver.
- [ ] Compliance health score computes; ranges 0–100; surfaces on dashboard.
- [ ] `/v1/search` returns tenant-scoped Postgres FTS results across Sprint 3 records; search RLS leak tests cover snippets, counts, and pagination.
- [ ] Multi-site ETC supports a second site; admin assignment works across sites.
- [ ] Audit log viewer in admin portal filters and exports.
- [ ] All Sprint 3 background jobs run on schedule in staging for 48 hours without incident.
- [ ] Decision #5 (video provider) locked.
- [ ] All BAAs for subprocessors that will see PHI in Sprint 4 (Daily.co, e-sign provider) are signed.

---

## 7. Phase 4 — Patient Flow (Sprint 4, Weeks 7–8)

**Goals.** Stage 1 through Stage 8 of patient intake (PRD § 10.5) work end-to-end. Patient portal is fully functional. First synthetic patient can flow from discovery to scheduled visit on staging without the engineer touching anything outside the UI.

This is the riskiest sprint — most LOC, most integrations, first PHI in flight. Pad the calendar by 20% if possible. Sprint 4 spillover into Sprint 5 is acceptable for non-critical-path items (sponsor de-identified aggregates can slide); Stages 1–8 cannot slide.

### 7.1 Public program page (PRD § 15.7)

- `GET /v1/public/programs/:slug` returns patient-facing description + structured eligibility criteria preview.
- Renders at `patient.corridor.health/programs/:slug`.
- No auth; no PHI; cached at edge.

### 7.2 Stage 1 — Discovery + self-screen (PRD § 10.5 Stage 1)

- Self-screen runs program's structured eligibility criteria programmatically (the JSON from § 5.2).
- 5 default checks per PRD: age, indication, FDA-approved-treatments-evaluated, treating-physician-availability, concurrent-therapy-restrictions.
- Eligibility result: pass / partial-needs-info / fail. Results persisted to `eligibility_screens` (pre-account allowed; matched to account on creation).
- On pass: prompt to create account (Clerk).

### 7.3 Stage 2 — Patient registration (PRD § 10.5 Stage 2)

- Account created via Clerk; `patients` row with PRD § 14.5 fields.
- RULE 12(2)(a) identification + RULE 12(2)(e) allergies.
- MFA encouraged (optional per PRD § 18.3).
- Sub-flows from PRD § 4.3:
  - Self-directed adult: standard.
  - With caregiver: caregiver invited via email; `patient_representatives` record created with read-only schedule/outcomes scope and no signing authority.
  - With legal guardian: guardian Clerk account plus authority document upload; signing blocked until ETC verifies authority basis under Title 72 Ch 5.
  - Minor: parent/guardian flow; pediatric eligibility checks; medical-director review required; `minor_assents` captured or waived with reason.
- Representative access is enforced through `tenant_relationships`, `patient_representatives`, RLS, and app validation. Revocation is immediate and audit logged.

### 7.4 Stage 3 — Treating physician documentation (PRD § 10.5 Stage 3)

- Patient invites physician via email or uploads on physician's behalf.
- Required uploads (each into `file_storage_objects`):
  - Recommendation letter
  - H&P (with date)
  - FDA-approved options evaluation
  - Procedure/lab/pathology reports
  - Eligibility documentation per RULE 12(2)(b)(i)
- **H&P age validator.** RULE 12(2)(b)(iii). On every render of the upload form AND at the moment of treatment scheduling, recompute `today - hp_date <= 12 months`. If older, block with clear message + prompt to obtain current H&P.
- Trace test: try to schedule with H&P > 12 months → blocked.

### 7.5 Stage 4 — ETC clinical review (PRD § 10.5 Stage 4)

- ETC clinical staff queue at `/etc/patients/in-review`.
- Per-patient review screen with all uploaded artifacts side-by-side.
- Three actions:
  - Accept → instantiate `patient_treatment_plans` and `patient_treatment_plan_milestones` from the program templates, then move patient → Stage 5
  - Request additional info → patient receives templated email; workflow re-opens
  - Decline → templated email with reason category; archived; reason logged

### 7.6 Stage 5 — Informed consent (PRD § 10.5 Stage 5) — both paths

This is the highest-stakes single feature in MVP 1. Implementation must be demonstrably defensible to DPHHS auditors.

#### 7.6.1 Path A — Digital recorded (50-12-105(3)(b))

- Daily.co (or chosen video provider) embedded in `/etc/patients/:id/consent/session`.
- Pre-session: patient consents to be recorded (separate consent screen; logged).
- Provider UI overlays the 50-12-105(2)(a)–(h) topic checklist:
  - (a) Approved products/treatments/services
  - (b) Patient attestation re: approved unlikely to achieve outcome
  - (c) Specific experimental treatment identification
  - (d) Best/worst/most-likely outcomes
  - (e) Insurance non-obligation
  - (f) Hospice eligibility implications
  - (g) Patient liability for expenses (extends to estate unless patient agreement says otherwise)
  - (h) Acknowledgment that treatment cannot be used to assist ending natural life
- Each topic gets a "covered" timestamp on click → `informed_consents.topics_covered_json`.
- Recording uploaded to HIPAA-eligible bucket as `informed_consents.recording_file_id`; tamper-detection signing applied (PRD § 18.2).
- Transcription job runs after recording upload; transcript stored as `informed_consents.transcript_file_id` and marked unverified until provider review.
- Provider attestation at session end (e-signed).
- Patient verbal consent on recording (captured as part of recording; checkbox affirms verbal consent given).
- Trace test: completed session → `informed_consents` row with all 8 topic timestamps + recording + transcript + provider attestation; missing recording, transcript, or topic coverage blocks Stage 6 unless the written path is used.

#### 7.6.2 Path B — Written (50-12-105(3)(a))

- Generated PDF with all required elements, populated per program from counsel-approved legal content template versions.
- Patient e-signs; provider attests; witness e-signs.
- Stored as `informed_consents.written_consent_file_id` with `path = 'written'`.

### 7.7 Stage 6 — Patient agreement (PRD § 10.5 Stage 6) — RULE 11

- Generated by Puppeteer worker from counsel-approved `legal_content_template_versions` rendered through `packages/pdf/templates/patient-agreement.tsx`.
- All RULE 11(2) elements (a)–(g) included:
  - (a) Treatment consent
  - (b) Admit and discharge criteria (from program)
  - (c) Treatment name, form, clinical trial phase
  - (d) **Full text of 50-12-110** (verbatim — committed in `packages/shared/legal/50-12-110.md`)
  - (e) Detailed cost description and billing approach
  - (f) 50-12-105(2)(e) insurance acknowledgment
  - (g) ETC's grievance policy (pulled from approved P&P manual section)
- Both patient (or verified legal representative with signing authority) and ETC licensed health care professional sign. Signer capacity is stored on the agreement.
- p95 generation < 8s per PRD § 20.1.
- Render stores `rendered_legal_documents` row with template version ids, input hash, output file hash, and signer metadata.

### 7.8 Stage 7 — Payment (PRD § 10.5 Stage 7)

- Stripe Elements for cards; Plaid Link → Stripe ACH for bank.
- Patient pays the amount specified in the patient agreement.
- Receipt emailed via Resend (transactional template).
- `patient_payments` ledger row created with Stripe payment intent ref.
- `payment_obligations` row is created from the agreement terms; Stripe/Plaid transactions write `payment_transactions` linked to the obligation. USD/Stripe is the only active MVP rail.
- ETC admin sees payment in their dashboard (Sprint 5 polishes the UX).
- Decision #9 (installments): default off; Stripe Subscriptions enabled per program if WinSanTor requests. Schema supports either path.

### 7.9 Stage 8 — Treatment scheduling (PRD § 10.5 Stage 8)

- ETC clinical staff schedules visits at `/etc/patients/:id/visits/new`.
- Default visit sequence is generated from the instantiated `patient_treatment_plans`; staff can adjust within protocol-allowed windows with audit logging.
- API first calls `evaluateTreatmentAuthorization(enrollmentId, 'schedule')`; only a passing `treatment_authorizations` result may create `patient_visits` rows.
- Patient sees schedule on patient portal home.
- Visit reminder emails: 24h and 2h before each visit (notification dispatcher; templates).
- Patient can request reschedule via patient portal (`POST /v1/patient/me/visits/:visitId/reschedule-request`); ETC staff approves/denies.

### 7.9A Central treatment authorization gate

- Migration: `treatment_authorizations`.
- Shared evaluator checks all prerequisites from PRD § 10.5 central gate.
- Gate runs before scheduling in Sprint 4 and before check-in/treatment documentation in Sprint 5.
- UI renders failed prerequisites as an actionable checklist.
- E2E tests cover each failed prerequisite plus one full pass.

### 7.10 Patient portal end-to-end (PRD § 11)

Build the entire patient surface in this sprint. This is what patients actually use.

#### 7.10.1 Design ethos (PRD § 11.1)

- Calm, plain language, large text, generous spacing, no marketing copy, no growth-hacking patterns. Principle 3 enforced in design review.
- Color palette warm and quiet (placeholder if brand work isn't ready; final tokens slot in).
- Mobile-first responsive (PRD § 7.6 — no native app).

#### 7.10.2 Home (§ 11.3)

- Treatment status in plain language ("You're scheduled for your next visit on May 8 at 10:00 AM at the Bozeman ETC").
- Action items: outstanding signatures, payment due, H&P needed.
- Recent messages.
- Quick links to Documents, Payments, Help.

#### 7.10.3 My Treatment (§ 11.4)

- Plan in plain language.
- Visit history with provider notes flagged "patient-shareable".
- PRO survey responses + provider observations marked patient-shareable.
- Schedule with reschedule request flow.

#### 7.10.4 Documents (§ 11.5) — patient right of access (RULE 12, PRD § 18.8)

- Migrations: `record_requests`, `disclosure_events` (amendment/restriction review lands Sprint 5/6).
- Patient agreement (PDF download).
- Informed consent (PDF + recording link if applicable; recording streams from signed URL).
- H&P uploaded.
- Receipts.
- Discharge summaries (visible after each visit's discharge note).
- Test results (only if provider marks shareable).
- "Request my full file" creates a `record_requests` row and produces a zip of every patient-scoped record plus manifest. Async via PDF/zip worker.
- Patient can see export status and download the completed archive.

#### 7.10.5 Messages (§ 11.6)

- Migrations: `message_threads`, `message_thread_participants`, `messages`, `message_attachments`, `message_read_receipts`.
- Threaded async messaging with ETC clinical staff.
- Thread classification: clinical, scheduling, billing, support. Clinical/safety threads are patient-file records.
- Representative participation is allowed only when `patient_representatives.can_message` and scope permit.
- Attachments go through immutable file storage.
- Read receipts tracked.
- Clinical/support visibility enforced: Corridor support needs support-access grant for clinical threads.
- Banner: "For emergencies, call 911. For urgent medical concerns, call your treating physician or [ETC's after-hours line]."
- ETC's after-hours line is a per-ETC setting (PRD § 10.16).

#### 7.10.6 Payments (§ 11.7)

- Outstanding balance.
- Payment history.
- Stripe Customer Portal embed for payment method management.
- Receipt downloads.

#### 7.10.7 Report side effect or problem (§ 11.8)

- Always-visible CTA in nav.
- Single-page form: what, when, severity self-assessment, current status.
- On submit: ETC staff paged via notification (emergency severity = SMS-equivalent priority email + Sentry-level alert; SMS proper in Phase 8).
- Routes to AE workflow in Sprint 5.

#### 7.10.8 Help (§ 11.9)

- FAQ (markdown, per-ETC overrides allowed).
- Contact ETC.
- Contact Corridor support (platform issues only).
- Grievance filing form.

### 7.11 PDF worker activation (PRD § 13.4)

- Puppeteer running in workers Docker image with Chromium.
- Templates in `packages/pdf/templates/`: patient-agreement, informed-consent-written, eligibility-decline-letter, receipt.
- Job priority queue: synchronous-feeling renders (patient agreement) get high priority; bulk/async (full-file export) get low priority.
- Performance targets: patient agreement < 8s, full-file export < 60s for typical patient.

### 7.11A Consent transcription activation

- Transcription worker activated for informed consent recordings in Sprint 4.
- Transcript provider must be covered by existing video-provider BAA or separate BAA before use with PHI.
- Transcript stored as immutable file, linked to `informed_consents.transcript_file_id`, and included in patient documents/export.
- Live captions remain Phase 8; post-session transcript is MVP 1.

### 7.12 Sprint 4 acceptance criteria

- [ ] A synthetic patient flows from discovery to scheduled visit on staging without engineer intervention.
- [ ] Accepting a patient instantiates a structured treatment plan, milestones, and visit sequence from the program templates.
- [ ] Stage 5: a recorded informed consent session captures all 8 topics with timestamps; recording in HIPAA bucket; tamper signature verifies.
- [ ] Stage 6: patient agreement contains every RULE 11(2) element including verbatim 50-12-110 text. PDF p95 < 8s.
- [ ] Consent and patient agreement rendering use counsel-approved legal template versions and record `rendered_legal_documents`.
- [ ] H&P > 12 months blocks scheduling; e2e test asserts the block at both upload and schedule time.
- [ ] No `patient_visits` row can be created without passing `treatment_authorizations`; e2e tests cover missing agreement, missing consent, unpaid/unqueued payment, expired H&P, inactive PPA, missing protocol approval, missing RULE 16(6)(f), expired transfer agreement, and invalid provider credential.
- [ ] Patient representative flows enforce authority, scope, signature capacity, minor assent/waiver, and revocation.
- [ ] Consent recording transcript generated, linked, visible to patient, and included in full-file export.
- [ ] Patient portal accessible on iOS Safari 15+, Android Chrome 100+, and last 2 stable versions of Chrome/Edge/Safari/Firefox.
- [ ] Patient portal passes WCAG 2.1 AA on Home, My Treatment, Documents, Messages, AE self-report, Help (axe-core via `mise run test:a11y`).
- [ ] Patient sub-flows tested: caregiver-attached, legal-guardian, minor.
- [ ] Stripe payment + Plaid ACH both tested end-to-end on staging (test cards / sandbox).
- [ ] Patient payment writes `payment_obligations` and `payment_transactions` through the USD/Stripe rail abstraction.
- [ ] Receipts emailed via Resend after successful payment.
- [ ] Visit reminders (24h, 2h) fire correctly across DST boundaries.
- [ ] Patient requests full file and receives zip of all records plus export manifest.
- [ ] All sprint 4 features have compliance trace tests.

---

## 8. Phase 5 — Treatment, AE, Reporting (Sprint 5, Weeks 9–10)

**Goals.** A visit can be documented end-to-end. AE workflow with the 5-day clock works in production-quality. Emergency transfer flow tested. DPHHS annual report and HFAR Path B annual workflows produce DPHHS-formatted PDFs. Sponsor surfaces (de-identified aggregates, AE feed, reports, billing) functional. ETRB annual public report generator produces a real artifact.

### 8.1 Drug accountability (PRD §§ 9.2, 10.6, 10.17; RULE 19)

- Migrations already stubbed in Sprint 1; Sprint 5 activates UI/API for `drug_lots`, `drug_inventory_locations`, `drug_inventory_movements`, `drug_storage_condition_logs`, `drug_dispenses`, and `drug_accountability_reconciliations`.
- ETC receives WST-057 lots with sponsor lot reference, quantity, expiration, storage requirements, certificate/file evidence, and quarantine status.
- Storage condition log supports routine readings and excursions; excursions create safety/QAPI review items when thresholds are breached.
- Dispensing workflow is visit-linked and patient-specific. It blocks expired, quarantined, depleted, or unreconciled lots before treatment documentation can be completed.
- Reconciliation view compares received, dispensed, wasted, returned, destroyed, and on-hand quantities; variance requires explanation and medical director/admin approval.
- Expiration monitoring feeds the RULE 19 safety module and sponsor operational reports as de-identified operational data.

### 8.1B Treatment documentation (PRD § 10.6) — RULE 13

- Per-visit form at `/etc/patients/:id/visits/:visitId`.
- Provider documents per RULE 13(1) fields.
- Vitals captured if program requires (program config flag).
- Provider selects/validates the lot-specific `drug_dispenses` row; completion is blocked if the lot is expired, quarantined, unavailable, or outside storage requirements.
- Patient education delivered (RULE 6(2)(l)) — link to relevant P&P section + checkbox.
- Discharge note + instructions (RULE 12(2)(l)) generated; emailed to patient.
- Discharge creation computes patient-file retention locks: `retain_until = discharge_date + 5 years`; locks apply to file artifacts, clinical messages, consent, agreement, treatment documentation, tests, PRO responses, and linked AEs.
- "Adverse side effects observed" yes → triggers AE workflow (§ 8.3 below).
- Treatment documentation links to the instantiated `patient_treatment_plans` and completes applicable milestones.
- Provider-entered outcome values write `outcome_measure_observations`; free-text response stays secondary.
- PRO survey email sent post-visit; responses → `patient_pro_responses` mapped to `program_outcome_measures`.

### 8.2 Transfer agreement renewal + emergency transfer (PRD § 10.7) — RULES 13(2)–(4), 14

#### 8.2.1 Renewal cadence (already partial from Sprint 3)

- Reminder job at 60/30/7 days (live).
- Compliance score impact when expired (live).

#### 8.2.2 Emergency transfer workflow

- "Initiate Emergency Transfer" CTA on patient record.
- Workflow:
  - Surface receiving hospital from active transfer agreement.
  - Document call confirmation that hospital can provide services (RULE 13(3)(a)).
  - Document services confirmation.
  - Document life support measures used to stabilize (RULE 13(3)(b)).
  - Generate transfer record packet (RULE 13(3)(c)) — patient summary, current treatment, vitals, AE if applicable, allergies. Printable PDF + email/fax to receiving hospital with secure link. (FHIR Phase 8.)
  - For non-emergency: document patient-or-rep informed of risks/benefits (RULE 13(3)(d)).
  - If underlying cause is AE → invoke AE workflow.

### 8.3 AE workflow (PRD § 10.10) — RULE 17

The 5-day regulatory clock is the highest-stakes ongoing operational requirement.

#### 8.3.1 Migrations

- `adverse_events`, `ae_attachments`.
- `adverse_events` includes `occurred_at`, `detected_at`, `became_aware_at`, `reported_at`, `clock_basis`, and `dphhs_deadline_at`.

#### 8.3.2 Triggers

- Provider during treatment doc clicks "AE observed".
- Patient via patient portal `/me/report-issue`.
- ETC staff observation form.
- Medical director clinical-judgment escalation.

#### 8.3.3 Initial capture

- All RULE 17(3) fields:
  - (a) Type of experimental treatment
  - (b) Nature and severity
  - (c) Date of occurrence
  - (d) Corrective actions taken (added through workflow, not at start)
  - (e) Patient medical condition
- Capture `occurred_at`, `detected_at`, `became_aware_at`, and `reported_at`; unknown timestamps require an explicit unknown reason.
- Counsel-selected `clock_basis` determines formal `dphhs_deadline_at`. Until counsel decides otherwise, UI and alerts use the conservative earliest-known timestamp among occurrence, detection, and awareness.

#### 8.3.4 Severity classification (RULE 17(2))

- Medical director assigned for review.
- Severity enum: `serious` (death, life-threat, hospitalization, persistent incapacity, congenital anomaly, important medical event by judgment) | `non_serious`.

#### 8.3.5 5-day clock (RULE 17(1)) — background job

- Worker runs every 15 minutes (PRD § 16).
- For each open AE, compute hours remaining from `dphhs_deadline_at`.
- Notification escalations at 96h / 72h / 48h / 24h / 6h marks; recipient = MD + administrator.
- Visible countdown widget on dashboard + AE record.
- Daily digest email at 8am MT to admin/MD listing all open AEs with deadlines.

#### 8.3.6 DPHHS submission

- Corridor generates DPHHS-formatted PDF (Puppeteer template).
- ETC files via DPHHS electronic system (out of platform).
- ETC records `dphhs_submitted_at` + reference number in Corridor.
- If `dphhs_submitted_at > dphhs_deadline` → flag in compliance dashboard.

#### 8.3.7 Routing

- On AE creation, immediate notification email to sponsor's regulatory contact per program PPA (`ae_flowdown_email`).
- AE row inserted into QAPI review queue (RULE 17(4); QAPI briefing data pull picks it up).
- AE row inserted into ETRB review queue (RULE 16(6)(e)).
- Trace test: an AE creation produces the sponsor email + QAPI queue + ETRB queue rows.

#### 8.3.8 Patient self-report path (PRD § 10.10, § 11.8)

- Patient submits via `/me/report-issue`.
- Triage queue at `/etc/triage`; ETC clinical staff reviews and either:
  - Dismisses (e.g., not treatment-related) with explanation logged.
  - Escalates to formal AE workflow.
  - Contacts patient first.

### 8.4 Sponsor surfaces (PRD §§ 9.4, 9.5, 9.6, 9.7)

#### 8.4.1 De-identified aggregates (§ 9.4)

- Sponsor portal `/sponsor/programs/:id/aggregates`.
- Total enrolled by ETC + program; treatment status counts; AE counts by severity; structured outcome distributions; drug-accountability status; longitudinal cohort views.
- MVP sharing model: `aggregate_only` by default; `deidentified_line_level_safety` only if the PPA explicitly grants it. Identified patient-level sponsor PHI is not implemented in MVP 1.
- **k-anonymity ≥ 5 enforced** (PRD § 18.5): if a cohort group has < 5 patients, suppress the row.

#### 8.4.2 AE feed (§ 9.5)

- `/sponsor/adverse-events` with per-program filterable list.
- ETC tokenized unless PPA grants ETC-level operational visibility; patient identifiers are always removed in MVP 1.
- Line-level safety records are produced by a de-identification/tokenization service with a versioned redaction policy; free-text PHI is excluded or manually reviewed before release.
- Sponsor pharmacovigilance can add internal notes (visible to sponsor only).
- Every sponsor line-level view/export writes `sponsor_data_access_events`; disclosure-accounting events are emitted when legally required.

#### 8.4.3 Reports (§ 9.6)

- 4 standard reports (Program Performance, AE Summary, HFAR contribution summary, ETC network health).
- Each: date range, JSON export, PDF export.

#### 8.4.4 Billing (§ 9.7)

- Stripe Billing for sponsor platform fees:
  - Per-program flat monthly (configurable per sponsor).
  - Per-treatment-delivered variable.
  - Combination.
- Sponsor billing dashboard: invoices, payment methods, upcoming.
- ETCs and patients do NOT see sponsor's financial relationship (PRD § 9.7 explicit).

### 8.5 DPHHS annual report (PRD § 10.13) — RULE 22

- Worker assembles prior calendar year data starting Nov 1 each year.
- Pulls from treatments_delivered, adverse_events, board_*, qapi_*, patients.
- `/etc/reports/dphhs-annual` — admin + MD review interface.
- Generated PDF in DPHHS format (RULE 22(1)).
- ETC admin reviews, signs, files via DPHHS electronic system.
- Missed filing → automatic provisional license flag (RULE 22(2)(b)) + prominent compliance dashboard alert.

### 8.6 HFAR Path B annual workflow (PRD § 10.12) — SB 535 §§ 2, 3

- Worker reminder Dec 1.
- ETC admin enters net annual profits via CSV upload OR manual entry (QuickBooks integration deferred to Phase 8).
- Two-interpretation UI (PRD § 23 #1): GAAP net income vs tax-basis profits. Both shown side-by-side; ETC chooses; choice + value logged in `hfar_filings.net_profits_basis`.
- 2% calculation displayed.
- DPHHS HFAR documentation form generated with all SB 535 § 2(1) fields.
- ETC reviews + e-signs.
- Wire/ACH instructions displayed; ETC sends from their bank.
- ETC confirms transfer with reference number.
- Receipt generated + archived in compliance archive.
- HFAR PDF filed to DPHHS by Feb 1 (analog to AE — Corridor produces, ETC files).

### 8.7 Grievances (PRD § 10.14)

- Migration: `grievances`.
- Patient portal grievance form OR ETC staff files on behalf.
- Grievance enters `/etc/grievances` queue.
- Workflow: acknowledge → investigate → resolve → respond.
- All grievances appear in QAPI briefing data (RULE 15(6)(c)).
- Records retained.

### 8.7A Patient rights workflows (PRD § 18.8)

- Migrations: `amendment_requests`, `privacy_restrictions`; `record_requests` and `disclosure_events` already exist from Sprint 4.
- Amendment workflow: patient submits target record + requested change; ETC clinical/admin reviewer accepts, partially accepts, or denies with reason; response file stored.
- Restriction workflow: patient requests restriction scope; ETC/admin reviewer accepts or denies; accepted restrictions gate future disclosures and exports.
- Disclosure accounting: `disclosure_events` emitted for de-identified sponsor line-level safety access where legally required, board review access, support-access grants, exports, external transfer packets, and patient-file releases.
- Grievances may link to amendment/restriction requests but do not replace them.

### 8.8 ETRB annual public report (PRD § 10.8) — RULE 16(6)(c)

- Activated now that data flows from Sprint 4 patients + Sprint 5 treatments + AEs.
- Generated automatically per board per year.
- Contents per RULE 16(6)(c)(i)–(iv): aggregate treatments reviewed/approved, aggregate safety outcomes (de-identified per RULE 16(6)(c)(ii)), approval timeframes, narrative.
- Published to `boards/:slug/annual-report` public page.
- 5-year retention.

### 8.9 ETC reports (PRD § 10.15)

- 6 ETC-scoped reports (patient census, treatment volume, AE summary, compliance status, financial summary, audit log export).
- All exportable as PDF + CSV.

### 8.10 Background jobs added in Sprint 5 (PRD § 16)

- **AE 5-day clock** (every 15 min).
- **HFAR annual job** (weekly Nov 1+).
- **DPHHS annual report job** (weekly Nov 1+).
- **Stripe reconciliation** (daily). Reconciles Stripe payment intents against `patient_payments`.
- **PDF generation** (continuous). All PDF templates registered.
- **Consent transcription** (active from Sprint 4). Phase 5 only monitors backlog/retries for consent transcript jobs.

### 8.11 Sprint 5 acceptance criteria

- [ ] Visit documented end-to-end with all RULE 13(1) fields; PRO survey emailed.
- [ ] Drug lot receipt, storage logging, dispensing, expiration block, and reconciliation work end-to-end; treatment documentation cannot use expired/quarantined lots.
- [ ] Provider and patient outcomes write structured `outcome_measure_observations` tied to program measures.
- [ ] Discharge note + instructions emailed to patient.
- [ ] Discharge creates DB-enforced patient-file retention locks for five years after discharge.
- [ ] AE created → sponsor regulatory contact emailed within 60 seconds.
- [ ] AE captures occurred/detected/aware/reported timestamps; delayed reporting cannot reset the compliance clock.
- [ ] AE 5-day clock job triggers escalation emails at 96h/72h/48h/24h/6h from `dphhs_deadline_at` on staging.
- [ ] DPHHS-formatted AE PDF renders correctly.
- [ ] Emergency transfer workflow produces transfer packet PDF + emails receiving hospital.
- [ ] DPHHS annual report assembles prior year data correctly; format matches RULE 22(1).
- [ ] HFAR Path B workflow walks ETC through both interpretations; chosen value persisted.
- [ ] Grievance flow works from patient portal through resolution.
- [ ] Amendment, privacy restriction, record request, and disclosure accounting workflows work end-to-end.
- [ ] Sponsor de-identified aggregates suppress < 5 patient cohorts.
- [ ] Sponsor de-identified line-level safety feed contains no direct identifiers/free-text PHI and writes `sponsor_data_access_events`.
- [ ] Sponsor billing produces Stripe invoices for platform fees.
- [ ] ETRB annual public report generated for any board with data; published page accessible.
- [ ] All 6 ETC reports export as PDF + CSV.
- [ ] All Sprint 5 background jobs run for 7 days in staging without missed runs.
- [ ] Stripe reconciliation reconciles 100% of test payment intents.

---

## 9. Phase 6 — Hardening + Launch (Sprint 6, Weeks 11–12)

**Goals.** Internal Admin Portal complete (PRD § 12). Pen test passed with zero high-severity findings. HIPAA review complete by counsel. A11y + perf audits pass targets. DR drill validates backups. Soft launch with WinSanTor's launch ETC and first real patient.

### 9.1 Internal Admin Portal completion (PRD § 12)

The PRD's existing sprint plan defers the entire admin portal to Sprint 6, which is too late — pieces have shipped incrementally Sprints 2/3/5. This sprint completes the rest.

#### 9.1.1 Tenants (§ 12.1)

- Status, key counts (active patients, treatments YTD, AEs YTD), risk flags (compliance score < 70, expired transfer agreement, overdue annual report, etc.).

#### 9.1.2 Users (§ 12.2)

- Cross-tenant user list with role, last active, status. Used for support and offboarding (Clerk-driven).

#### 9.1.3 Audit Log (§ 12.3) — finalize

- Already shipped in Sprint 3; polish UX, add saved filters.

#### 9.1.4 Compliance Watch (§ 12.4)

- Cross-tenant grid of every ETC's compliance score with trend.
- Risk-flag inbox triggers customer success outreach workflows.

#### 9.1.5 Support (§ 12.5)

- In-app support tickets from any user.
- Break-glass support-access grant flow:
  - Requires ticket reference.
  - Requires explicit scope (for example: audit read, patient-file read, billing support).
  - Time-boxed (default 60 min).
  - Audit-logged with reason and PHI access events.
  - Notification fires to tenant admin that support is active.
- Scoped-access tooling: support sees PHI only through approved support grants, never via impersonation or direct service-role queries.

#### 9.1.6 Feature Flags (§ 12.6)

- Per-tenant overrides. LaunchDarkly or in-house (lean toward in-house given tenant scoping needs).
- Used for: gradual rollouts, beta features, kill switches.

#### 9.1.7 Subprocessors (§ 12.7)

- DB-backed table replacing the markdown placeholder.
- Per subprocessor: category, data allowed, PHI posture (`PHI allowed with BAA` / `No PHI by configuration` / `Synthetic data only`), BAA/DPA status, BAA expiration, SOC 2 status, last review date, owner.
- Seed from `docs/subprocessors.md`, including Better Stack/Axiom, Checkly/BetterStack uptime, PostHog, Vanta/Drata, and pen-test vendor classifications.
- Release gate: any new vendor receiving operational data must be classified before merge; any change from no-PHI/synthetic to PHI requires counsel/security approval and BAA before production enablement.
- Quarterly review job creates internal tickets.

### 9.2 Telemetry instrumentation (PRD § 21)

- PostHog (recommended) wired with tenant scoping + PHI redaction.
- Event taxonomy `domain.subject.verb` (PRD § 21.5).
- Funnel dashboards for sponsor / ETC / patient (PRD § 21.3).
- Quality metric dashboards (PRD § 21.4):
  - AE reporting compliance % within 5 days
  - Annual report on-time rate
  - HFAR on-time rate
  - Patient agreement completion time (median, p95)
  - Informed consent topic coverage %
- North-star: compliant patient-treatment delivered counter (PRD § 21.1).

### 9.3 Pen test

- Vendor: book in Phase 0 for Week 11 slot (Doyensec, Trail of Bits, Cure53, or similar HIPAA-experienced).
- Scope: every API endpoint, RLS bypass attempts, auth/MFA bypass, file storage signed-URL leakage, webhook signature bypass, audit-log tampering, PHI exfil via logs/Sentry/analytics, prompt-injection in patient/staff text fields, SSRF via uploaded PDFs.
- SLA: report by Week 11 day 5; remediation week 12 day 1–3; retest day 4–5.
- **Launch criterion (PRD § 22.3): zero high-severity findings.** Critical findings block launch; mediums tracked for post-launch.

### 9.4 HIPAA readiness review

- Counsel review of:
  - Data flow diagram
  - BAA executions
  - Audit log scope + retention
  - Patient rights mechanisms (PRD § 18.8)
  - Breach notification runbook
  - Incident response playbook
  - Subprocessor list
  - Encryption posture (PRD § 18.2)
- Output: signed memo or explicit gap list to remediate.

### 9.5 A11y audit (PRD § 20.4)

- Patient portal targets WCAG 2.1 AA across all pages.
- axe-core in CI is the floor; this sprint adds:
  - Manual screen-reader pass (NVDA, VoiceOver iOS).
  - Keyboard-only navigation pass.
  - Color-contrast pass on real brand tokens.
  - Live caption status: PRD says Phase 2; MVP 1 ships post-session transcript option already active from Sprint 4.

### 9.6 Performance audit (PRD § 20.1)

- Synthetic Lighthouse runs against staging targeting:
  - p95 page load < 2.0s on broadband, < 4.0s on 4G
  - p95 API response < 400ms read / < 800ms write
  - PDF gen < 8s patient agreement / < 15s license app package
  - Video session join < 3s
- Real-user monitoring via PostHog or Sentry Performance.
- Slow paths surfaced; optimization where targets miss.

### 9.7 DR drill + backups (PRD § 18.6)

- Restore production backup to a fresh Supabase project; verify integrity.
- PITR restore test to a known-good 24h-ago state.
- Daily logical backup pipeline to a separate AWS account verified.
- Document RTO + RPO; current targets: RTO < 4h, RPO < 1h.

### 9.8 Audit log immutability proof

- Live demo: attempt UPDATE on `audit_log` row in staging Postgres → fails.
- Attempt DELETE → fails.
- Attempt service-role bypass → fails (RLS not bypassable per PRD § 14.11).
- Captured as part of HIPAA review packet.

### 9.9 Documentation + runbooks

- `docs/runbooks/`:
  - `incident-response.md` — HIPAA Breach Notification Rule timing, escalation paths, comms templates.
  - `oncall.md` — rotation, paging, escalation.
  - `backup-restore.md` — DR steps with screenshots.
  - `tenant-provisioning.md` — sponsor and ETC creation.
  - `support-access-grants.md` — break-glass procedure.
  - `subprocessor-incident.md` — what to do if a subprocessor has a breach.
- `docs/arch.md` — high-level architecture diagram.
- `CHANGELOG.md` started.

### 9.10 Status page (PRD § 20.2)

- BetterStack status page at `status.corridor.health`.
- Components: app, patient, api, workers, db, storage.
- Public; uptime history; incident posts.

### 9.11 Background jobs added in Sprint 6

- **Audit log compactor** (nightly) — indexes for fast retrieval, never deletes.
- **Backup job** (every 6h) — Supabase PITR snapshot validation.

### 9.12 Soft launch

- WinSanTor's launch ETC tenant in production, license issued by DPHHS, ETRB associated, WST-057 protocol approved.
- First real patient: full Stage 1 → Stage 8 flow on production. Engineering on-call live.
- 24-hour war room.

### 9.13 Sprint 6 acceptance criteria (matches PRD § 22.3 launch criteria, expanded)

- [ ] All Compliance Mapping (PRD § 19) features live with trace tests.
- [ ] All subprocessor BAAs executed.
- [ ] WinSanTor's launch ETC passes end-to-end UAT in staging.
- [ ] WST-057 has been processed through ETRB review and approved (in production).
- [ ] Pen test report has zero high-severity findings.
- [ ] HIPAA readiness review passed (signed memo from counsel).
- [ ] A11y audit on patient portal: WCAG 2.1 AA pass.
- [ ] Performance audit: all PRD § 20.1 targets met.
- [ ] DR drill successful (PITR restore + logical backup restore).
- [ ] Audit log immutability proven.
- [ ] 99.9% uptime sustained for 30 days in staging (cumulative across sprints 5+6).
- [ ] All runbooks written and rehearsed (at least incident response + on-call).
- [ ] Internal Admin Portal: all 7 modules live.
- [ ] Telemetry: every PRD § 21 metric instrumented.
- [ ] Status page live.
- [ ] First real patient successfully completes Stage 1–8 in production.

---

## 10. Phase 7 — Post-launch (Weeks 13–26, first 90 days)

**Goals (PRD § 22.4).** Iterate on patient flow based on real data. Onboard a second sponsor and second ETC. Begin SOC 2 evidence collection. Phase 2 prioritization.

### 10.1 Iteration cadence

- Weekly retro for the first 4 weeks.
- Bi-weekly thereafter.
- WinSanTor + ETC weekly check-in.
- Patient feedback channel: post-treatment survey + the existing Help → Contact Corridor support flow.

### 10.2 Patient flow improvements

Driven by data, not assumption. Likely candidates:

- Reduce H&P upload friction (physicians find it confusing).
- Eligibility self-screen pass-through rate optimization.
- Informed consent session UX polish based on first 5 sessions.
- Patient agreement readability improvements.

### 10.3 Second tenant onboarding

- Second sponsor: validates multi-sponsor isolation in production.
- Second ETC: validates multi-ETC board sharing pattern (or two-board pattern).
- Compliance Watch confirms cross-tenant scoring works.

### 10.4 SOC 2 evidence collection

- 6+ months evidence required for SOC 2 Type II audit (target Phase 8 audit).
- Begin collecting: change management logs, access reviews, vendor reviews, security training records.
- Vanta or Drata recommended for evidence automation.

### 10.5 Phase 8 prioritization

- Quarterly product review against PRD § 7 deferred items.
- First Phase 8 priorities likely: RULE 25 outside-physician network (the WST-057 scale lever), Spanish localization (if patient demand warrants), payment installments (if WinSanTor requests).

### 10.6 BAU engineering

- Bug fixes from production triage queue.
- Sentry/PostHog-driven improvements.
- Compliance health score tuning.

### 10.7 Phase 7 acceptance criteria

- [ ] First-cohort patients (≥5) complete treatment without compliance gaps.
- [ ] Second sponsor onboarded and creating programs.
- [ ] Second ETC licensed and operating on Corridor.
- [ ] Compliance Watch shows healthy scores across tenants.
- [ ] SOC 2 evidence pipeline running.
- [ ] Phase 8 backlog prioritized with WinSanTor + leadership input.

---

## 11. Phase 8 — Phase 2 Readiness (post-MVP 1, ongoing)

The 10 PRD § 7 deferred items, with activation triggers:

| # | Item | Activation trigger |
|---|---|---|
| 7.1 | RULE 25 outside-physician network | ETRB has issued RULE 16(6)(f) for the relevant treatment + commercial demand justifies it |
| 7.2 | Investigational medical device registry depth (RULE 21) | Sprint 1 device stubs already exist; activate full device consent/cybersecurity/long-term tracking when a sponsor brings a device program |
| 7.3 | Inpatient ETC physical plant (RULE 24) | Sprint 1 inpatient profile stubs already exist; activate validation when an inpatient ETC tenant onboards |
| 7.4 | HFAR Path A free-treatment workflow | Sprint 1 allocation stubs already exist; activate when DPHHS publishes "qualifying Montana residents" definition + a sponsor chooses Path A |
| 7.5 | Crypto / alt-currency rails | Sprint 1 payment-rail abstraction already exists; activate a non-USD rail when patient demand and regulatory clarity justify it |
| 7.6 | Native mobile | Patient analytics show mobile-web friction |
| 7.7 | SMS notifications | Patient demand or operational need (urgent AE notifications) |
| 7.8 | Spanish localization | Patient population demand |
| 7.9 | Multi-state expansion | Sprint 1 jurisdiction model already exists; activate when another state passes RTT regime modeled on SB 535 |
| 7.10 | Public ETC directory | ≥3 ETCs operating on Corridor |
| — | Live captions for consent sessions | Accessibility upgrade after MVP post-session transcript is stable |
| — | Direct DPHHS API integration | DPHHS exposes API |
| — | OpenSearch/Algolia | Postgres FTS pageload metrics suffer |
| — | Sponsor outbound webhooks | Sponsor BI integration demand |
| — | Primary-source license verification | Vendor available + worth automation cost |
| — | QuickBooks integration | ETC accounting workflow demand |

---

## 12. Cross-cutting invariants (continuously)

These run throughout every phase, not bound to a sprint:

- **Compliance trace tests** — every shipped feature names its rule.
- **Audit log coverage** — every mutation has a coverage test.
- **RLS coverage** — every new PHI table has a semantic RLS test and static `FORCE ROW LEVEL SECURITY` coverage.
- **PHI redaction posture** — beforeSend hooks tested with synthetic fixtures.
- **i18n string discipline** — react-intl wraps everything.
- **Time discipline** — UTC at rest, America/Denver for deadlines.
- **BAA expiration tracking** — Compliance Watch surfaces.
- **Subprocessor changes** — adding a new vendor that touches PHI requires BAA before staging.
- **Open Questions ledger** — PRD § 23 tracked in `docs/decisions.md`; locked decisions move out.

---

## 13. Risk register

| Risk | Phase | Trigger | Mitigation | Owner |
|---|---|---|---|---|
| BAA execution delay | 0–4 | Vendor legal stalls | Start week -2; have backup vendor for video + e-sign | Founding product |
| ETRB recruitment delay | 3 | Members unavailable | Surface to founder week 1; broaden network | Founding product |
| DPHHS form format changes | 5 | Final rules differ from MAR notice | Templated rendering — re-render from data on rule change | Eng lead |
| Pen test high-severity finding | 6 | Vendor reports issue late | Compress remediation; defer launch by 1 week if needed | Eng lead |
| WinSanTor launch ETC license delay | 6 | DPHHS 90-day clock stalls | Communicate weekly; have synthetic ETC for staging UAT | Founding product |
| Patient flow friction (Sprint 4 spillover) | 4 | Stages 5–6 take longer than estimated | Slip sponsor de-id aggregates to Sprint 6; never slip stages | Eng lead |
| AE 5-day clock job missed run | 5 | Worker outage | Heartbeat monitor + Sentry Cron monitor; redundant scheduling | Eng lead |
| RLS regression | continuous | New table without policy | CI gate via "no new tenant_id column without RLS test" lint | Eng lead |
| Audit log gap | continuous | New mutation without write | CI gate via mutation coverage test | Eng lead |
| Recording storage cost | post-launch | Long sessions + retention | Storage tiering; cold storage for old recordings | Eng lead |
| Counsel review delay | 6 | Counsel availability | Book in week 8; have written prompts ready | Founding product |
| First patient blockers | 6 | Real-world edge cases | War room day-of; engineering on-call live | All |
| BAA renewal lapse | post-launch | Quarterly review missed | Compliance Watch alerts at 90/60/30 days | Founding product |

---

## 14. Coverage matrix — every PRD section is delivered

This proves no PRD section is unaddressed.

### 14.1 PRD §§ 1–8 (foundations and IA)

| PRD § | Where delivered |
|---|---|
| 1 Executive Summary | n/a (context) |
| 2 Problem Statement | n/a (context) |
| 3.1 Why now | Pre-launch comms (parallel) |
| 3.2 Vertical integration thesis | Many-to-many board ↔ ETC schema (Phase 1, locked Phase 3) |
| 3.3 Competitive intel wall | RLS pattern (Phase 1) |
| 4.1 Sponsor persona + sub-roles | Phase 2 (sponsor portal); RBAC packages |
| 4.2 ETC persona + sub-roles | Phases 2–3 (ETC portal); RBAC |
| 4.3 Patient persona + sub-flows | Phase 4 (Stage 2 sub-flows: caregiver, guardian, minor) |
| 5 Product principles | Cross-cutting invariants (§ 12 here) |
| 6 MVP 1 scope | Phases 1–6 (every line item covered below) |
| 7 Phase 2 scope | Phase 8 (§ 11 here) |
| 8.1 Four portals | Phase 1 shells; populated 2–6 |
| 8.2 Tenancy model | Phase 1 (`tenants`, `tenant_memberships`, `tenant_relationships`; boards and patients are first-class tenant kinds) |
| 8.3 Top-level navigation | Phase 1 shells, populated continuously |

### 14.2 PRD § 9 — Sponsor Portal

| PRD § | Where delivered |
|---|---|
| 9.1 Sponsor onboarding | Phase 2 |
| 9.2 Program configuration | Phase 2 |
| 9.3 ETC Network + PPA | Phase 2 |
| 9.4 De-identified aggregates | Phase 5 |
| 9.5 Adverse Events feed | Phase 5 |
| 9.6 Reports | Phase 5 |
| 9.7 Billing | Phase 5 |
| 9.8 Settings | Phases 2–6 (incremental) |

### 14.3 PRD § 10 — ETC Portal (17 sub-sections)

| PRD § | Where delivered |
|---|---|
| 10.1 ETC onboarding + licensure wizard | Phase 2 |
| 10.2 Dashboard | Phases 2 (skeleton) → 5 (full) |
| 10.3 P&P Manual + public page | Phase 3 |
| 10.4 Staff files | Phase 3 |
| 10.5 Patient intake (Stages 1–8) | Phase 4 |
| 10.6 Treatment documentation | Phase 5 |
| 10.7 Transfer agreement + emergency | Phase 3 (renewal), Phase 5 (emergency) |
| 10.8 ETRB workflow | Phase 3 (full); Phase 5 (annual report activated) |
| 10.9 QAPI program | Phase 3 (foundation); Phase 5 (data-driven briefings) |
| 10.10 AE reporting | Phase 5 |
| 10.11 Compliance dashboard | Phase 3 |
| 10.12 HFAR Path B annual workflow | Phase 5 |
| 10.13 DPHHS annual report | Phase 5 |
| 10.14 Grievances | Phase 5 |
| 10.15 Reports | Phase 5 |
| 10.16 Settings (multi-site) | Phase 3 |
| 10.17 Infection control and safety program | Phase 3 |

### 14.4 PRD § 11 — Patient Portal

| PRD § | Where delivered |
|---|---|
| 11.1 Design ethos | Phase 4 (continuous) |
| 11.2 Discovery + self-screen | Phase 4 (refs § 10.5 Stage 1) |
| 11.3 Home | Phase 4 |
| 11.4 My Treatment | Phase 4 |
| 11.5 Documents (incl. right of access) | Phase 4 |
| 11.6 Messages (with emergency banner) | Phase 4 |
| 11.7 Payments | Phase 4 |
| 11.8 Report side effect / problem | Phase 4 (UI) → Phase 5 (AE workflow integration) |
| 11.9 Help (incl. grievance filing) | Phase 4 (UI), Phase 5 (grievance workflow) |

### 14.5 PRD § 12 — Admin Portal

| PRD § | Where delivered |
|---|---|
| 12.1 Tenants | Phases 2 (read-only) → 6 (with risk flags) |
| 12.2 Users | Phase 2 (read-only) → 6 (full) |
| 12.3 Audit Log | Phase 3 → Phase 6 polish |
| 12.4 Compliance Watch | Phase 6 |
| 12.5 Support + scoped access | Phase 6 |
| 12.6 Feature Flags | Phase 1 (DB-backed) → Phase 6 (UI) |
| 12.7 Subprocessors | Phase 2 (markdown) → Phase 6 (DB) |

### 14.6 PRD § 13 — Cross-Cutting

| PRD § | Where delivered |
|---|---|
| 13.1 Audit log | Phase 1 |
| 13.2 Notifications | Phase 1 |
| 13.3 File storage (incl. SHA-256, immutable) | Phase 1 |
| 13.4 PDF generation | Phase 1 (worker), Phases 2/4/5 (templates) |
| 13.5 Signing | Phase 2 (provider integration) |
| 13.6 Search (Postgres FTS) | Phase 1 schema/index foundation; Phase 3 `/v1/search` and per-module rollout |
| 13.7 i18n | Phase 1 (scaffolding) |
| 13.8 Time zones | Phase 1 (helpers) |
| 13.9 Legal content versioning | Phase 0 setup; Phases 2–5 template usage |

### 14.7 PRD § 14 — Data Model (every domain)

| PRD § | Migrations land in |
|---|---|
| 14.1 Tenancy | Phase 1 |
| 14.2 Sponsor domain | Phase 2; sponsor access/export events Phase 5 |
| 14.3 ETC domain | Phases 2–3; drug accountability activation Phase 5; inpatient stubs Phase 1 |
| 14.4 ETRB domain | Phase 3 |
| 14.5 Patient domain | Phase 4; drug dispensing/outcome observations Phase 5; device registry stubs Phase 1 |
| 14.5A Patient communications and rights | Phase 4 (messages/access/disclosures), Phase 5 (amendment/restriction) |
| 14.6 Adverse events | Phase 5 |
| 14.7 QAPI | Phase 3 |
| 14.8 Grievances | Phase 5 |
| 14.9 Compliance + reporting | Phase 3 (compliance), Phase 5 (reporting), HFAR Path A stubs Phase 1 |
| 14.9A Architecture-preserved stubs | Phase 1 |
| 14.10 Audit + infra | Phase 1; subprocessor DB portal Phase 6 |
| 14.11 RLS strategy | Phase 1 (policies + semantic SQL RLS suite) |

### 14.8 PRD § 15 — API Surface

| PRD § | Where delivered |
|---|---|
| 15.1 Sponsor endpoints | Phase 1 typed scaffold/service seam; Phases 2 + 5 behavior |
| 15.2 ETC endpoints | Phase 1 typed scaffold/service seam; Phases 2–5 behavior |
| 15.3 ETRB endpoints | Phase 3 |
| 15.4 Patient endpoints | Phase 1 typed scaffold/service seam; Phase 4 behavior |
| 15.5 Inbound webhooks (Clerk/Stripe/Plaid/Resend) | Phase 1 (signature verification skeleton) → Phases 2/4/5 (handlers) |
| 15.6 Outbound webhooks | Phase 8 |
| 15.7 Public endpoints | Phase 3 (manual), Phase 4 (programs), Phase 5 (ETRB report) |

### 14.9 PRD § 16 — Background Jobs (13 worker classes)

| Worker | Phase |
|---|---|
| Compliance scheduler | 3 |
| AE 5-day clock | 5 |
| HFAR annual job | 5 |
| DPHHS annual report job | 5 |
| License renewal | 3 |
| Staff license expiration | 3 |
| Notification dispatcher | 1 |
| Search indexing | 3 |
| PDF generation | 1 (worker), continuous templates |
| Audit log compactor | 6 |
| Backup job | 6 |
| Stripe reconciliation | 5 |
| Consent transcription | Phase 4 |

### 14.10 PRD § 17 — Tech Stack

All stack choices implemented in Phase 0–1. mise + fnox already committed. Subprocessor BAAs tracked Phase 0–6 (§ 12.7).

### 14.11 PRD § 18 — Security/HIPAA

| PRD § | Where delivered |
|---|---|
| 18.1 PHI scope | Phase 1 (BA posture documented) |
| 18.2 Encryption (TLS, AES-256, app-layer, fnox) | Phases 0–1 |
| 18.3 Access control (MFA, RLS, break-glass) | Phase 1 + Phase 6 (break-glass UI) |
| 18.4 Audit logging (7-year retention) | Phase 1 |
| 18.5 Data minimization (k-anonymity ≥ 5) | Phase 5 (sponsor aggregates) |
| 18.6 Backups + DR | Phase 1 (PITR), Phase 6 (DR drill) |
| 18.7 Incident response | Phase 6 (runbook) |
| 18.8 Patient rights (access, amendment, accounting, restriction) | Phase 4 (record requests + disclosure event foundation); Phase 5 (amendment + restriction workflows); Phase 6 polish |
| 18.9 SOC 2 readiness | Phase 7 (evidence collection) |

### 14.12 PRD § 19 — Compliance Mapping

Every row in PRD § 19.1 (SB 535) and § 19.2 (RULES) mapped to a feature in this plan and verified by a compliance trace test. Audit cross-references:

| Statute / Rule | Implementation phase |
|---|---|
| SB 535 § 1(1)(a)–(b), § 1(3) | Phase 2 (licensure wizard, 90-day clock); ongoing compliance dashboard |
| SB 535 § 2(1), § 2(2)(b), § 3 | Phase 5 (HFAR Path B) |
| SB 535 33-1-102(2)(d), 50-12-106 | Phase 4 (consent text, patient agreement) |
| SB 535 50-12-102(1) | Phase 2 (program eligibility validation) |
| SB 535 50-12-103, 50-12-104 | Phase 4 |
| SB 535 50-12-105 (and (3)(b)) | Phase 4 |
| SB 535 50-12-107, 50-12-110 | Phase 4 (patient agreement text) |
| RULE 5 + 5(2) | Phase 2 (licensure wizard, ownership-transfer flow) |
| RULE 6 + 6(4) | Phase 3 (P&P manual + biennial reminder) |
| RULE 7, 7(5), 8, 8(6), 9 | Phase 3 (admin/MD roles, multi-site, on-site prescriber gate) |
| RULE 10, 10(3) | Phase 3 (staff files + out-of-state flag) |
| RULE 11 | Phase 4 (patient agreement) |
| RULE 12, 12(2)(b)(iii), 12(4) | Phase 4 (patient files, H&P validator, retention) |
| RULE 13, 13(2)–(4) | Phase 5 (treatment doc, transfer agreement) |
| RULE 14 | Phase 5 (emergency procedures + transfer) |
| RULE 15, 15(4), 15(5) | Phase 3 (QAPI quarterly + 3-year retention) |
| RULE 16 + sub-rules | Phase 3 (board + composition + protocol approval + retention); Phase 5 (annual report activation) |
| RULE 16(7) provisional gate | Phase 3 (enforcement) |
| RULE 17, 17(1), 17(4) | Phase 5 (AE workflow + occurred/detected/aware/reported timestamps + 5-day clock + QAPI routing) |
| RULE 18, 19 | Phase 3 (infection control and safety operational evidence module); Phase 5 (drug accountability lot/expiration/dispensing controls) |
| RULE 20 | Phase 3 P&P conditional; procedure workflow conditional if applicable |
| RULE 21 | Phase 1 schema stubs; Phase 8 workflow activation |
| RULE 22 + 22(2)(b) | Phase 5 (annual report + provisional consequence flag) |
| RULE 23 | Phase 2 (outpatient physical plant section) |
| RULE 24 | Phase 1 inpatient profile stubs; Phase 8 validation/workflow activation |
| RULE 25 | Phase 8 |

### 14.13 PRD § 20 — Non-Functional Requirements

| PRD § | Where delivered |
|---|---|
| 20.1 Performance | Phase 6 (audit); continuous |
| 20.2 Availability + status page | Phase 1 (uptime), Phase 6 (status page) |
| 20.3 Scalability | Architecture supports; no specific work |
| 20.4 Accessibility (WCAG 2.1 AA) | Phase 4 (build), Phase 6 (audit) |
| 20.5 Browser support | Phase 4 (validation) |
| 20.6 i18n English-only | Phase 1 (scaffold) |
| 20.7 Localization (deadlines MT) | Phase 1 (helpers) |

### 14.14 PRD § 21 — Telemetry

| PRD § | Where delivered |
|---|---|
| 21.1 North-star compliant treatment | Phase 6 (counter); event-driven from Phase 5 onward |
| 21.2 Compliance health score | Phase 3 |
| 21.3 Funnel metrics | Phase 6 (dashboards); events instrumented continuously |
| 21.4 Quality metrics | Phase 6 (dashboards) |
| 21.5 Event taxonomy | Phase 1 (helper), Phase 6 (PostHog wired with redaction) |

### 14.15 PRD § 22 — Milestones

| PRD § | Where delivered |
|---|---|
| 22.1 Pre-development | Phase 0 (this plan § 3) |
| 22.2 Sprint plan | Phases 1–6 |
| 22.3 Launch criteria | Phase 6 acceptance criteria (this plan § 9.13) |
| 22.4 Post-launch 90 days | Phase 7 (this plan § 10) |

### 14.16 PRD § 23 — Open Questions

All PRD § 23 questions have locked-by deadlines in § 2 of this plan.

### 14.17 PRD § 24 — Appendices

Glossary committed in CLAUDE.md; document references kept in `docs/legislation/`; stakeholders maintained in `docs/stakeholders.md` (maintained continuously).

---

## 15. Validation pass

After drafting this plan, I cross-checked it against the PRD section-by-section. Items I verified are explicitly addressed:

- All 8 patient intake stages (PRD § 10.5) — Phase 4.
- All 13 licensure wizard sections (PRD § 10.1) — Phase 2.
- All 20 P&P manual categories (PRD § 10.3) — Phase 3.
- All 8 informed consent topics 50-12-105(2)(a)–(h) — Phase 4 with topic checklist + timestamped coverage.
- All 7 RULE 11(2) elements in patient agreement — Phase 4.
- All 4 patient sub-flows (PRD § 4.3) — Phase 4 with representative authority, signing scope, revocation, and minor assent/waiver.
- Central treatment authorization gate — Phase 4 scheduling, Phase 5 check-in/treatment documentation.
- All 13 background jobs — across Phases 1, 3, 4, 5, 6.
- All 17 ETC portal sub-sections (PRD § 10) — distributed across Phases 2–5.
- All 9 patient portal sub-sections — Phase 4 (with cross-references to Sprint 5 for AE/grievance integrations).
- All 7 admin portal sub-sections — distributed Phases 1–6 (no longer dumped on Sprint 6).
- All 9 cross-cutting modules — Phase 1 foundations + module-specific phases; legal content versioning starts Phase 0.
- All data model sub-sections, including patient communications/rights — distributed by domain.
- All operational subprocessors, including observability, monitoring, analytics, compliance evidence, and pen-test vendors — BAA/no-PHI tracking Phase 0; Daily.co + e-sign by Phase 4 PHI cutoff.
- All 4 patient rights (HIPAA — access, amendment, accounting, restriction) — Phase 4 (record requests + disclosure event foundation), Phase 5 (amendment + restriction), Phase 6 polish.
- RULE 18/19 operational evidence — Phase 3 infection control and safety module.
- AE clock timestamp model — Phase 5 with occurred/detected/aware/reported timestamps and counsel-selected/conservative clock basis.
- All compliance dashboard tracked items, including infection/safety evidence and quarterly cadences — Phase 3.
- Provisional licensure gate (RULE 16(7)) — Phase 3 enforcement before Phase 4 patient flow.
- 5-year and 3-year retention locks — DB-level, Phases 3 and 4.
- 90-day approval clock — Phase 2.
- Annual + biennial timers — Phase 3 background jobs.
- HFAR's "net annual profits" dual interpretation — Phase 5 with explicit logging of choice.
- DPHHS submission via PDF + manual file (no API) — Phases 2 (license app), 5 (AE/annual/HFAR).
- The 6 product principles — operationalized as cross-cutting invariants (§ 12 here) with CI-enforced trace tests.

**One thing I called out that the PRD's existing sprint plan glossed over:** The Internal Admin Portal is too large for Sprint 6. This plan ships pieces incrementally (read-only in Sprint 2, audit log viewer in Sprint 3, full module set in Sprint 6), which matches when each piece is genuinely needed.

**One thing I called out as risk:** The 6-sprint timeline is aggressive for the documented scope with 2 engineers. Phase 4 (patient flow) is the most likely to spillover. The plan's safety valve is the Phase 8 backlog — defer there, never compromise compliance.

---

*End of implementation plan v1.0.*
