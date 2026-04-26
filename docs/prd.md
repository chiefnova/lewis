# Corridor — Product Requirements Document

**MVP 1: Montana Experimental Treatment Center Operating Platform**

| | |
|---|---|
| **Document version** | 1.0 |
| **Author** | Gabriel Viggers, Founding Product |
| **Status** | Draft for engineering and counsel review |
| **Last updated** | April 24, 2026 |

---

## Table of Contents

1. Executive Summary
2. Problem Statement
3. Strategic Context
4. Personas
5. Product Principles
6. MVP 1 Scope
7. Out of Scope (Phase 2)
8. Information Architecture
9. Sponsor Portal — Detailed Specification
10. ETC Portal — Detailed Specification
11. Patient Portal — Detailed Specification
12. Admin Portal — Detailed Specification
13. Cross-Cutting Modules
14. Data Model
15. API Surface
16. Background Jobs and Workers
17. Tech Stack
18. Security, Privacy, and HIPAA Posture
19. Compliance Mapping (SB 535 + ETC Rules → Features)
20. Non-Functional Requirements
21. Telemetry and Success Metrics
22. Milestones and Release Plan
23. Open Questions and Decisions Pending
24. Appendices

---

## 1. Executive Summary

Corridor is the operating platform for Montana's new Experimental Treatment Center (ETC) regime, established by Senate Bill 535 (signed May 13, 2025) and operationalized by MAR Notice 2026-427.1. Corridor serves sponsor/biotech manufacturer, ETC, patient, board reviewer, and Corridor internal users with one platform and one shared data layer. The frontend has two deployable products: `apps/app` for the authenticated staff/business console and `apps/patient` for the patient-facing portal.

MVP 1 launches with WinSanTor as the design-partner sponsor, WST-057 as the launch program, and Montana as the launch geography. The product makes WinSanTor the first Phase 3 biotech to commercially deliver an investigational drug under a state Right-to-Try framework, and gives the ETC operating it a turnkey compliance-and-operations spine that satisfies every requirement in the 25 ETC rules.

The product's strategic intent is twofold. First, to be the system of record for the regulatory regime — meaning every protocol, patient agreement, informed consent recording, adverse event report, ETRB review, QAPI minute, and DPHHS submission flows through Corridor. Second, to position Corridor's operator (us) for vertical integration into ETC ownership in Phase 3+ by accumulating privileged operational data on what works, what scales, and where unit economics break.

Sponsors are the primary buyers. ETCs are the primary operators. Patients are users — they pay only for the drug, never for the platform.

---

## 2. Problem Statement

### 2.1 The regulatory reality

SB 535 created a brand-new licensed health care facility class with no precedent in any other US state. The 25 proposed rules under MAR 2026-427.1 specify a compliance surface that touches:

- Licensure (10K initial, 5K annual renewal, 90-day approval clock)
- Governance roles (administrator, medical director, QAPI program, Experimental Treatment Review Board)
- Documentation (P&P manual covering 20 categories, patient files, treatment documentation, transfer agreements)
- Reporting (5-day adverse event reporting to DPHHS, annual calendar-year reporting due Jan 31, ETRB annual public summary, HFAR Feb 1 documentation)
- Physical plant (specific outpatient and inpatient requirements)
- Outside-physician network gating (RULE 25)

No tooling exists for any of this. Today, the WinSanTor team would coordinate ETC operations through a combination of Notion, email, Google Drive, and ad hoc spreadsheets. That is fragile, non-auditable, and impossible to scale beyond the launch ETC.

### 2.2 The persona problems

**Sponsors** (biotech manufacturers like WinSanTor) need to commercially deliver investigational drugs through ETCs in Montana, track patient outcomes, manage adverse event flow, support ETC partners, and have visibility into program performance. Their alternative today is to do this with bespoke internal tooling per program — expensive, slow, and hostile to multi-ETC scale.

**ETCs** need to operate a brand-new facility class with no playbook, no off-the-shelf software, no peer benchmark, and a regulatory deadline they cannot miss. They need licensure assistance, a P&P manual that doesn't take six months to write, a patient intake flow that holds up under DPHHS audit, an ETRB workflow, a QAPI program, and the ability to file every required report on time without dedicating a full-time compliance officer to it.

**Patients** with serious peripheral neuropathy (in WinSanTor's case) — or whatever indication a future sponsor brings — need a clear, dignified path to discover whether they're eligible for an experimental treatment, complete eligibility verification, give meaningful informed consent, sign a patient agreement, pay for the drug, receive treatment, and have their outcomes (good or adverse) captured in a way that protects their interests.

### 2.3 The unmet need

There is no software that operates the SB 535 regime end-to-end. There is no software even attempting it. First-mover advantage compounds because the platform that becomes the system of record for the first commercial RTT delivery in the United States sets the template every subsequent program will need to integrate with.

---

## 3. Strategic Context

### 3.1 Why now

SB 535 was signed May 13, 2025. MAR 2026-427.1 entered public comment April 10, 2026, with comments closing May 8, 2026. Final rules are expected mid-2026. The first ETCs will license in late 2026. WinSanTor's launch ETC for WST-057 is targeting first-patient milestone in this window.

Building Corridor in parallel with rule finalization means MVP 1 ships with the first ETC's first patient. There is no second mover on this — by the time a competitor sees the opportunity, Corridor is the system of record for the first commercial RTT program in the country.

### 3.2 The vertical integration thesis

MVP 1 is software-only. We do not run an ETC. We do not run an ETRB. We sell a platform.

Phase 3+ (post-MVP, not in this PRD's scope) is where we use the privileged data accumulated in MVP 1 — which programs have demand, which ETCs are well-run, where unit economics hold up — to vertically integrate and operate our own ETCs, possibly as pop-ups under a single licensed entity using the multi-site administrator and medical director patterns explicitly authorized by RULES 7(5) and 8(6).

This sequencing matters for MVP 1 architecture in one specific way: we model boards and ETCs as independent entities with many-to-many relationships from day one (per SB 535 § 6 + RULE 16(2)(b) which authorize shared boards across ETCs), so that future shared-ETRB and multi-ETC operating patterns are not architectural rewrites.

### 3.3 The competitive intelligence wall

When we eventually operate our own ETCs while continuing to serve other ETCs as a software vendor, we face a structural conflict. ETCs running on Corridor will not want their data visible to a competing operator. The MVP 1 architecture must support strict tenant isolation via Postgres Row-Level Security so that, when this conflict materializes in Phase 3+, the answer is a clean data-governance commitment backed by enforceable technical controls, not a promise.

---

## 4. Personas

### 4.1 Persona 1: Sponsor (Biotech Manufacturer)

**Archetype:** WinSanTor — Phase 3 biotech, WST-057 topical neuropathy treatment, has Maruho (Japan) / Lupin (Canada) deals as commercial validation, eight to fifteen people on the team, technical sophistication high.

**Sponsor sub-roles:**

- **Sponsor Admin** — full access; typically the Chief of Staff or Head of BD; configures programs, manages ETC relationships, reviews aggregate data.
- **Sponsor Clinical** — read access to patient-level data on programs they're cleared for; reviews AE reports; receives outcome reports from ETCs.
- **Sponsor Finance** — read access to billing, treatment volumes, payment reconciliation; manages payouts to ETCs and HFAR Path A reconciliation if applicable.

**Jobs to be done:**

- Configure a program (drug + indication + protocol metadata + supply chain + pricing)
- Establish relationships with one or more ETCs to deliver the program
- Receive de-identified outcome data and adverse event flow per program
- Coordinate manufacturing supply to ETCs
- Manage HFAR contributions if path A (free product) is chosen
- Visibility across all ETCs running the program
- Export-quality reporting for internal stakeholders, board, and regulators

**Success criteria for the sponsor:**

- Time from "decided to enable Montana RTT" to "first patient dosed" < 90 days
- AE reporting fidelity matching what FDA-IRB sponsor pharmacovigilance would demand
- Cross-ETC outcome data aggregable into clinical and regulatory submissions

### 4.2 Persona 2: ETC (Experimental Treatment Center Operator)

**Archetype:** A small operating team — administrator, medical director, two to four clinical staff, possibly one operations person. May be a standalone facility or operating inside another health care facility per RULE 23(9) / 24(12). May be operating a single site or multiple sites under one legal entity per RULES 7(5) / 8(6).

**ETC sub-roles:**

- **Administrator** — daily operations responsibility per RULE 7; full operational access.
- **Medical Director** — clinical and QAPI leadership per RULE 8; full clinical access; QAPI chair.
- **Clinical Staff** — physicians, APRNs, PAs, RNs per RULE 9; patient-care access scoped to their assignments.
- **Operations Staff** — schedulers, intake coordinators; access to non-clinical workflows.

**Jobs to be done:**

- Apply for and obtain ETC license (RULE 5)
- Maintain compliant P&P manual covering all 20 RULE 6 categories
- Manage staff files (RULE 10)
- Establish or contract with an Experimental Treatment Review Board (RULE 16)
- Run quarterly QAPI meetings with documented decisions (RULE 15)
- Intake patients: discovery → eligibility → informed consent → patient agreement → treatment → outcomes
- File adverse event reports within 5 days (RULE 17)
- File annual report by January 31 (RULE 22)
- Document and submit HFAR allocation by February 1 (SB 535 § 2)
- Maintain transfer agreement with local hospital, renewed annually (RULE 13)
- For programs cleared for outside-ETC administration, manage RULE 25 physician partner network (Phase 2)

**Success criteria for the ETC:**

- License application approved on first DPHHS review, within the 90-day clock
- Zero overdue regulatory reports
- Patient throughput limited only by clinical capacity, not by paperwork
- Audit-ready 24/7 — pull any patient's complete file in under 60 seconds

### 4.3 Persona 3: Patient (and Legal Representative)

**Archetype:** Adult Montana resident with a serious medical condition (peripheral neuropathy in WinSanTor's launch case), has exhausted or evaluated standard-of-care options, has a treating physician's recommendation, has the means to pay for the drug. May have caregiver or legal guardian involvement.

**Patient sub-flows:**

- **Self-directed adult patient** — full agency, signs all documents themselves.
- **Patient with caregiver** — caregiver has read access to schedule and outcomes; patient signs.
- **Patient with legal guardian** — guardian signs per Title 72 Ch 5; patient may co-sign.
- **Minor patient** — parent or legal guardian signs; pediatric flows.

Representative access is a first-class compliance object, not a UI flag. Corridor must record the representative's authority basis, supporting document when applicable, access scope, signing authority, start/end dates, revocation, and every use of that authority. Caregivers default to read-only schedule/outcome visibility. Legal guardians and parents of minors may sign only after authority is verified and attached to the patient file. Minor patients may have a documented assent/co-sign flow when clinically appropriate.

**Jobs to be done:**

- Discover that an experimental treatment exists for their condition
- Determine eligibility before investing time
- Document that they evaluated other FDA-approved treatments (RULE 12(2)(f))
- Provide treating physician's recommendation and a current H&P (within 12 months per RULE 12(2)(b)(iii))
- Give informed consent through the enhanced digital recorded path (50-12-105(3)(b))
- Sign the patient agreement (RULE 11)
- Pay for the drug
- Show up for treatment
- Report outcomes and any adverse events
- Have access to their complete medical file
- File grievances if needed

**Success criteria for the patient:**

- Discovery → first dose in < 21 days, gated only by clinical eligibility
- Clear, dignified, low-anxiety experience throughout
- Full transparency on cost, risk, and process
- Their data is theirs — exportable on demand

---

## 5. Product Principles

These principles govern every product decision in MVP 1. When a feature requires trade-offs, these principles resolve them.

**Principle 1 — Compliance is a feature, not a chore.**
Every regulatory artifact (P&P manual, ETRB approval, AE report, annual filing, informed consent recording) is a first-class product object with version history, audit trail, and one-click export. The system makes compliance the path of least resistance.

**Principle 2 — The rules are the spec.**
Every feature in MVP 1 maps to a specific section of SB 535 or a specific RULE in MAR 2026-427.1. Section 19 of this PRD is the explicit mapping. If a feature cannot trace to a rule, it does not ship in MVP 1.

**Principle 3 — Patient dignity is non-negotiable.**
Patients in this system have serious illnesses. The product never uses gamification, urgency tactics, or growth-hacking patterns on patient flows. Tone is plain, honest, and respectful. Patients are never billed by Corridor.

**Principle 4 — Audit-ready by default.**
Every state change — every patient file edit, every protocol approval, every consent recording, every payment — is immutably logged with actor, timestamp, before/after, and IP. A DPHHS or FDA inspector should be able to receive a read-only export covering any time window in under five minutes.

**Principle 5 — Multi-tenant from line one.**
The data model uses Postgres Row-Level Security with Clerk JWT-based tenant scoping. There is no admin path that bypasses RLS. ETCs cannot see other ETCs' patient data. Sponsors cannot see other sponsors' programs. Corridor staff have explicit, audited access only.

**Principle 6 — Boring tech, careful integrations.**
Stack choices favor maturity over novelty. Where we integrate (Stripe, Plaid, Clerk, Resend, Sentry), we follow the platform's idiomatic patterns. We do not build what we can buy at this stage.

---

## 6. MVP 1 Scope

The MVP 1 release covers, end-to-end, the operations required for an outpatient ETC to license, intake patients, deliver an experimental treatment, manage adverse events and outcomes, run QAPI and ETRB workflows, and meet every recurring DPHHS reporting obligation.

### 6.1 Included in MVP 1

- Sponsor onboarding and program configuration
- ETC onboarding with licensure application assistance (RULE 5)
- ETC ↔ Sponsor relationship management (program participation agreements)
- ETC P&P manual generator and version control (RULE 6, all 20 categories)
- ETC staff file management (RULE 10)
- ETC roles: administrator, medical director with multi-site support (RULES 7, 8)
- Patient discovery surface (informational, eligibility self-screen)
- Patient eligibility verification including H&P validation (RULE 12)
- Informed consent with enhanced digital recorded path (50-12-105(3)(b))
- Patient agreement (RULE 11) — generated, signed, dated, stored
- Patient files (RULE 12) with 5-year retention enforcement
- Treatment documentation (RULE 13) including transfer agreement workflow
- Drug accountability for WST-057 inventory, lot/expiration, storage, dispensing, and reconciliation
- Structured treatment plans, visit cadence, and outcome measures
- Treatment scheduling
- Patient payment for the drug via Stripe (cards, ACH via Plaid)
- Adverse event reporting workflow with 5-day clock to DPHHS (RULE 17)
- Emergency procedure protocols and staff training documentation (RULE 14)
- Infection control and safety program documentation (RULES 18, 19)
- ETRB workflow — protocol submission, review, approval, voting, conflict declarations, annual public report generator, 5-year retention, multi-ETC-aware data model (RULE 16)
- QAPI program — quarterly meetings, agenda templates, decision log, data pull from AE/grievance/incident sources, 3-year retention (RULE 15)
- HFAR Path B annual workflow — net annual profits capture, 2% calculation, DPHHS form, contribution wire to Insurance Premium Support Account (SB 535 §§ 2, 3)
- DPHHS annual reporting (RULE 22) by January 31
- Grievance management
- Tenant-scoped search across operational records
- Audit log across every state change
- Four portals — Sponsor, ETC, Patient, Internal Admin
- BAAs with all subprocessors
- Architecture-preserved schema stubs for device registry, inpatient fields, alt-currency rails, HFAR Path A, and state-first regulated objects

### 6.2 Sponsor scope clarification

The launch sponsor is WinSanTor. The launch program is WST-057 for peripheral neuropathy. The launch ETC is the WinSanTor-affiliated outpatient ETC in Montana. Corridor is multi-tenant and multi-program-capable on day one, but this PRD's flows, data examples, and worked cases use WinSanTor / WST-057 throughout.

---

## 7. Out of Scope (Phase 2)

These are deliberately deferred. The PRD acknowledges them so that engineering does not foreclose them with MVP 1 architectural choices, but they will not ship in MVP 1.

**7.1 RULE 25 outside-physician network.** The "community physician partner" workflow that lets an ETC distribute pre-approved low-risk treatments through private practicing physicians across Montana. This is the strategic scale lever for WST-057 and any topical/low-risk treatment, but it depends on the ETRB having issued a RULE 16(6)(f) safety determination, which itself requires the ETC to be operating with a track record. Phase 2.

**7.2 Investigational medical device registry depth (RULE 21).** WinSanTor's WST-057 is a topical drug, not a device. The MVP 1 schema includes a basic device registry table for forward compatibility, but the full RULE 21 cybersecurity, device-specific consent, and long-term tracking workflows are Phase 2 and would be triggered by a sponsor whose program includes a connected device.

**7.3 Inpatient ETC physical plant complexity (RULE 24).** MVP 1 targets outpatient ETCs. The schema supports inpatient as a facility type and stores the additional fields, but the validation rules for sprinkler systems, generator backup, AIA-compliant call systems, and so on are Phase 2.

**7.4 HFAR Path A free-treatment workflow (SB 535 § 2(2)(a)).** Path A requires identifying "qualifying Montana residents" (DPHHS has not yet defined this), provisioning free product through the supply chain, and reconciling against net profits. Path B is the chosen default for MVP 1 per principal-stakeholder decision. Path A schema fields exist for future activation.

**7.5 Crypto/alt-currency payment rails.** SB 535 § 10(4) explicitly authorizes "digital and alternative currencies." MVP 1 ships USD-only via Stripe. The payment-rail abstraction in the data model supports future rails without feature-code rewrites.

**7.6 Native mobile applications.** Web responsive only in MVP 1.

**7.7 SMS notifications.** Email-only via Resend in MVP 1. The notification abstraction supports SMS in Phase 2.

**7.8 Spanish localization.** English-only in MVP 1. Internationalization scaffolding present from day one.

**7.9 Multi-state expansion.** Montana-only in MVP 1. Schema supports state as a first-class field on every regulated object.

**7.10 Public ETC directory / patient marketplace.** Patient discovery in MVP 1 is sponsor-driven (you find Corridor through WinSanTor, your treating physician, or direct outreach). A public-facing directory of all licensed ETCs and the programs they offer is Phase 2 once there are more than two or three ETCs operating.

---

## 8. Information Architecture

### 8.1 Four portals, one data layer

- **app.corridor.health** — the primary application. Routes by role to Sponsor, ETC, or Internal Admin views post-login.
- **patient.corridor.health** — patient-only, simplified UX, mobile-first responsive.
- **www.corridor.health** — marketing site. Out of PRD scope, mentioned for completeness.

The two app domains share one Postgres database with RLS. Clerk handles authentication for all of them with a unified user identity that can hold multiple role memberships (a person could be both a sponsor admin at WinSanTor and a clinical staff member at an ETC, though this is uncommon).

### 8.2 Tenancy model

Five tenant kinds form the platform's security boundary:

- **Sponsor** — owns programs, has many users with sponsor roles
- **ETC** — owns operations, has many users with ETC roles
- **Patient** — tenant scoped to one human, plus explicitly authorized representatives
- **Board** — Experimental Treatment Review Board with reviewer users and cross-ETC associations
- **Corridor Internal** — internal support/admin tenant, access only through ticket-scoped support grants

Legal/business entities are separate from the security boundary. Sponsor and ETC organization records store legal names, tax IDs, addresses, licensure details, and billing data, but RLS policies key off tenants and explicit tenant relationships, not a generic organization type.

Boards (ETRBs) are first-class entities, not subordinate to a single ETC. A board can serve many ETCs (RULE 16(2)(b), 16(4)). A board has its own users (reviewers).

Programs are owned by sponsors. ETCs participate in programs via Program Participation Agreements. Patients enroll in programs through ETCs.

### 8.3 Top-level navigation

- **Sponsor Portal nav:** Programs · ETC Network · Patients (de-identified aggregate) · Adverse Events · Reports · Billing · Settings
- **ETC Portal nav:** Dashboard · Patients · Treatments · ETRB · QAPI · Adverse Events · Compliance · Staff · Reports · Settings
- **Patient Portal nav:** Home · My Treatment · Documents · Messages · Payments · Help
- **Internal Admin Portal nav:** Tenants · Users · Audit Log · Compliance Watch · Support · Feature Flags · Subprocessors

---

## 9. Sponsor Portal — Detailed Specification

### 9.1 Sponsor onboarding

**Trigger:** A Corridor sales conversation closes with a signed Master Services Agreement and BAA. Internal admin provisions the sponsor tenant and creates the first sponsor admin user via Clerk invite.

**Flow:**

1. Sponsor admin clicks Clerk invite email, sets credentials, lands on welcome screen.
2. Onboarding wizard collects: legal entity name, primary contact, billing contact, mailing address, federal tax ID (encrypted at rest, not stored as PHI but as confidential business data), regulatory contact for AE flow-down.
3. Sponsor admin invites additional sponsor users with role assignment.
4. Sponsor reaches the "Create your first program" CTA.

**Data captured:** `sponsor_id`, `legal_name`, `primary_contact_user_id`, `billing_contact_user_id`, `mailing_address`, `tax_id_encrypted`, `regulatory_contact_email`, `ae_flowdown_email`, `msa_signed_at`, `baa_signed_at`, `status`.

### 9.2 Program configuration

**Trigger:** Sponsor admin creates a new program.

**Fields:**

- Program name (e.g., "WST-057 for Peripheral Neuropathy")
- Generic name / drug substance (e.g., "WST-057")
- Indication (free text + ICD-10 codes)
- Clinical trial phase (per 50-12-102(1)(a) — must be ≥ Phase 1 complete)
- FDA IND number (if applicable)
- Qualified medical institution attestation (per 50-12-102(1)(b) prong, optional)
- Protocol document upload (PDF; this is what the ETRB will review)
- Treatment form (oral, topical, infusion, device, other)
- Anticipated cost to patient
- Pricing model (cash-pay, sliding scale, free)
- HFAR path selection (Path A or Path B; default Path B)
- Adverse event reporting configuration: sponsor pharmacovigilance contact, escalation thresholds
- Eligibility criteria (structured: age range, indication confirmation requirements, concurrent therapy restrictions, contraindications)
- Treatment plan template: visit cadence, expected duration, milestones, required documentation, and clinical-owner roles
- Outcome measures: measure name, source (provider / patient PRO / lab / validated scale), cadence, unit, expected direction, required/optional status, and reporting label
- Drug accountability setup: product identity, lot/batch fields required, storage requirements, expiration/disposition policy, and dispensing rules
- Patient-facing program description (what patients see during discovery)

**State machine:** Draft → Submitted for ETRB review → Active (one or more ETCs participating) → Paused → Discontinued.

**Key product behaviors:**

- The program protocol PDF is the artifact ETRBs review under RULE 16(6)(a). Corridor stores it in Supabase Storage with an immutable SHA-256 hash, version history, and audit log entries on every replacement.
- Eligibility criteria are structured (not free text) so that the patient eligibility self-screen can run them programmatically.
- The "what patients see during discovery" field is the only patient-facing surface from the sponsor; Corridor does not allow sponsor-direct patient marketing per Principle 3.

### 9.3 ETC Network

**Purpose:** Lets the sponsor establish, view, and manage relationships with ETCs that will deliver the program.

**Sub-flows:**

- **Invite ETC to participate.** Sponsor admin enters ETC legal name and primary contact email. Corridor checks if the ETC tenant exists; if yes, sends an in-app invitation; if no, sends a Clerk-style email invitation that creates a new ETC tenant on acceptance. The invitation references the program.
- **Program Participation Agreement (PPA).** When an ETC accepts, Corridor generates a PPA PDF (template per program, populated with sponsor and ETC details). The PPA covers: scope of program, supply chain logistics, pricing terms, AE flow-down obligations to sponsor pharmacovigilance, data sharing, term, and termination. Both sides sign in-platform via embedded signature flow (HelloSign or Stripe Identity equivalent — picked in implementation; treated as a black-box signing primitive in this PRD).
- **ETC Network table view.** For each participating ETC: legal name, primary contact, status (Invited / PPA Pending / Active / Paused / Terminated), date of first patient dosed, total patients dosed, active patients in treatment, AE count (last 30 days), last AE date.
- **Per-ETC drill-down.** Same fields plus de-identified outcome aggregates, billing reconciliation, drug-accountability status, and supply chain status (Phase 2: integration with sponsor's manufacturing/distribution).

### 9.4 Patients (de-identified aggregate)

The sponsor never sees identified PHI in MVP 1. The sponsor sees de-identified, aggregated data:

- Total patients enrolled, by ETC and program
- Treatment status counts (in screening / active / completed / discontinued)
- Adverse event counts by severity category
- Outcome distributions (per the program's defined outcome measures)
- Anonymized longitudinal cohort views

MVP 1 PPAs may choose either `aggregate_only` or `deidentified_line_level_safety`. De-identified line-level safety access supports sponsor pharmacovigilance review without direct identifiers, patient contact data, free-text PHI, or small-cell cohorts. Identified patient-level sponsor access is not in MVP 1. It requires a future `patient_data_sharing_consents` workflow with patient-visible scope, revocation, disclosure accounting, and RLS/audit tests before activation.

### 9.5 Adverse Events

**View:** Per-program AE list, filterable by program, severity, date range, and status. Each row shows: AE ID, ETC token, date, severity, treatment, and status. ETC legal name is shown only where the PPA permits ETC-level operational visibility; patient identity is never shown to sponsors in MVP 1.

**Drilldown:** Read-only AE detail with de-identified RULE 17(3) fields appropriate for sponsor pharmacovigilance. Sponsor users can add internal notes visible only to the sponsor tenant. Every sponsor line-level safety view/export writes `sponsor_data_access_events` and patient disclosure-accounting events where applicable.

**Flow-down:** When an ETC submits an AE under RULE 17, Corridor immediately notifies the sponsor's regulatory contact via email per the PPA configuration, with a deep link to the AE detail.

### 9.6 Reports

**Standard reports:**

- Program performance (treatments delivered, patients dosed, outcome aggregates) — exportable as PDF and CSV
- Adverse event summary — by program, by ETC, by severity
- HFAR contribution summary (Path A: free-product allocation by program; Path B: contribution amounts) — for sponsor's tax and disclosure purposes
- ETC network health — onboarding pipeline, active partners, churn

Each report supports a date range, JSON export for sponsor's BI pipelines, and PDF export for board / regulatory submission.

### 9.7 Billing

The sponsor is the payer of Corridor's platform fee. MVP 1 supports:

- Per-program flat monthly fee (configurable per sponsor in admin tooling)
- Per-treatment-delivered variable fee
- Combination

Stripe Billing handles invoicing. Sponsor sees their invoice history, payment methods, and upcoming invoice. Billing is a sponsor-only surface; ETCs and patients do not see Corridor's financial relationship with the sponsor.

### 9.8 Settings

Standard: organization profile, users and roles, API keys (Phase 2), webhooks (Phase 2), audit log scoped to this sponsor's actions, BAA status and renewal, MSA status.

---

## 10. ETC Portal — Detailed Specification

This is the largest portal in MVP 1 by surface area. Forty percent of engineering effort lives here.

### 10.1 ETC onboarding and licensure assistance

**Trigger:** Either a sponsor invites the ETC, or a prospective ETC operator signs up directly via marketing site.

**Flow:**

**Step 1 — Tenant creation.** Standard Clerk invite flow. ETC admin creates account, provides legal entity name, primary location address, federal tax ID, primary contact information.

**Step 2 — Licensure wizard.** This is the differentiator. Corridor walks the prospective ETC through the RULE 5 application, generating a DPHHS-ready package on completion. Sections:

- Applicant identity (RULE 5(1) reference per 50-5-203)
- Medical director identity and qualifications (RULE 5(1)(a), (b)) with credential upload
- Administrator identity and qualifications (RULE 5(1)(b)) with credential upload
- Disclosures (RULE 5(1)(c)) — prior facility closures, felonies, prior administrative actions
- Professional staff roster (RULE 5(1)(b))
- General types of experimental treatments to be offered (RULE 5(1)(d))
- Reputable character attestation (RULE 5(1)(e))
- Health Freedom and Access Requirement fulfillment plan (RULE 5(1)(f); SB 535 § 2)
- Outpatient or inpatient designation (RULES 23 vs 24)
- Physical plant attestation with floor plan upload
- Local building authority approval upload (RULES 23(1), 24(1))
- Fire marshal inspection upload (RULES 23(2), 24(2))
- Transfer agreement upload (RULE 13(2))

**Step 3 — Generate application package.** On submission, Corridor produces a single PDF containing all RULE 5 elements plus all required attachments, formatted to DPHHS expectations. Corridor does not file the application with DPHHS on behalf of the ETC (this is a regulated act we choose not to perform in MVP 1); the ETC downloads and files via DPHHS's electronic licensing system.

**Step 4 — License tracking.** The ETC tenant enters "Application Submitted" status. ETC admin updates with DPHHS submission date. Corridor tracks the 90-day approval clock per SB 535 § 1(1)(b) and surfaces it on the dashboard. When license is granted, ETC admin uploads the license, and tenant transitions to "Licensed."

**Key product behaviors:**

- The wizard is the most complex onboarding flow in MVP 1. It is designed as a save-as-you-go experience; an ETC operator may take days or weeks to complete it.
- The wizard's structured outputs become the seed data for the live tenant: medical director becomes the MD user, P&P attestations become the seed P&P manual entries, staff roster populates staff files.
- $10K application fee and $5K annual renewal fee per SB 535 § 1(3) are tracked but not collected through Corridor — the ETC pays DPHHS directly.

### 10.2 Dashboard

**Purpose:** The ETC's home base. Surfaces what needs attention.

**Widgets:**

- License status and renewal countdown
- Today's patient schedule
- Open AE reports with countdown to 5-day deadline
- Open patient grievances
- Upcoming QAPI meeting (and prep status)
- Pending ETRB protocol reviews
- Compliance health score (composite metric — see § 21.2)
- Annual reports due (RULE 22 January 31, HFAR February 1)
- Transfer agreement renewal countdown
- Recent activity feed

### 10.3 P&P Manual

**Purpose:** RULE 6 requires a P&P manual covering 20 enumerated categories, available to patients/visitors/public, with biennial review.

**Structure:** A versioned document with a section for each RULE 6(2) category. Corridor ships templates for each section, Montana-tailored and ETRB-aware, that the ETC's medical director and administrator review and customize.

**Categories (RULE 6(2)(a)–(t)):**

- Preadmission screening and admitting patients
- Informed consent (per 50-12-105)
- Patient requirements documentation (per 50-12-104)
- Staff screening and hiring
- Medical records (retention, retirement, timely entry, release)
- Patient files
- Patient progress notes
- Observation and recovery
- Discharging patients
- Follow-up care
- Patient grievances
- Patient education
- Emergency procedures
- Medically necessary transfers
- Infection control
- Investigational medical device procedures (if applicable; deferred unless device program)
- Anesthesia (if applicable)
- Disaster planning and training
- Staff training on emergency and disaster protocols
- HFAR fulfillment (per SB 535 § 2)

**Workflow:**

- ETC admin creates the manual from templates
- Each section has: status (Draft / Approved / Under Review), last reviewed date, next review due date (biennial per RULE 6(4))
- Approval requires sign-off from administrator and medical director
- Public link (read-only, no auth required) per RULE 6(1) requirement that manual be available to patients/visitors/public
- Version history immutable
- Biennial review reminder fires automatically; lapse marked on compliance health score

**Public viewing surface:** `etc-name.corridor.health/manual` is a read-only public page rendering the manual's current approved version. No PHI on this page.

### 10.4 Staff

**Purpose:** RULE 10 staff files. Every staff member, including out-of-state collaborators per RULE 10(3), has a file.

**Per-staff data (RULE 10(2)):**

- Most recent license/certification (uploaded, with expiration tracking)
- Documented orientation (P&P orientation date, emergency/disaster training date)
- Signed job description for current position
- Evaluations (as applicable)
- Ongoing training records
- Out-of-state status flag (RULE 10(3)) for collaborators

**Workflow:**

- Onboard new staff: role, license type, license number, license expiration, license verification status (manual MVP 1; primary-source verification automation Phase 2), upload all RULE 10(2) artifacts
- License expiration alerts at 90 / 60 / 30 / 7 days (RULE 7(1)(g)(ii) requires annual credential verification)
- Termination flow with offboarding checklist
- Filterable roster (by role, status, license expiration)

### 10.5 Patient intake — the central clinical flow

This is the longest single flow in MVP 1. It implements 50-12-104, 50-12-105, RULE 11, RULE 12, and parts of RULES 6, 13.

**Stage 1 — Patient discovery and self-screen** (typically on patient.corridor.health, but ETC staff can also start from the ETC portal on a patient's behalf).

A prospective patient lands on the program page, sees the patient-facing description, and clicks "Check eligibility." The self-screen runs the program's structured eligibility criteria:

- Age confirmation
- Indication confirmation (free-text + structured)
- Confirmation that other FDA-approved treatments have been evaluated (RULE 12(2)(f); 50-12-104(1))
- Confirmation of treating physician referral availability
- Concurrent therapy restrictions per program

If eligible, patient creates an account (Clerk) and proceeds to Stage 2.

**Stage 2 — Patient registration.**

Patient identification (RULE 12(2)(a)): full name, sex, address, date of birth, emergency contact / next of kin. Allergies and known abnormal drug reactions (RULE 12(2)(e)).

**Stage 3 — Treating physician documentation.**

Patient invites their treating physician via email or uploads on their behalf:

- Treating physician's recommendation letter (50-12-104(2); RULE 12(2)(b)(ii))
- H&P within the last 12 months (RULE 12(2)(b)(iii))
- Documentation that the patient evaluated other FDA-approved options (RULE 12(2)(f); 50-12-104(1))
- Relevant procedure, lab, and pathology reports (RULE 12(2)(c))
- Documentation that patient meets criteria for experimental treatment (RULE 12(2)(b)(i); 50-12-104(4))

H&P age is validated. If older than 12 months, patient is informed and prompted to obtain a current one. Workflow blocks until valid.

**Stage 4 — ETC clinical review.**

ETC clinical staff reviews the submitted package. Decisions:

- **Accept** → patient moves to Stage 5
- **Request additional information** → patient receives email with specifics, workflow re-opens
- **Decline** → patient receives respectful decline email with reason category (medical contraindication, eligibility miss, etc.); workflow archived

**Stage 5 — Informed consent.**

This implements 50-12-105 with the enhanced digital recorded path under § 105(3)(b).

The patient and a treating health care provider from the ETC join a synchronous video session (built on Daily.co or similar — treated as a black-box video primitive in this PRD; chosen in implementation). Corridor records the session with patient's pre-session consent to record. The session must cover all elements of 50-12-105(2)(a)–(h):

(a) Currently approved products, treatments, and services for the disease, condition, or desired health outcomes
(b) Patient's attestation that they concur with the provider that approved treatments are unlikely to achieve their desired outcomes or are otherwise impractically available
(c) Clear identification of the specific experimental treatment
(d) Best-case, worst-case, and most-likely outcomes
(e) Insurance non-obligation statement
(f) Hospice eligibility implications (if applicable)
(g) Patient's liability for expenses, extending to estate unless the patient agreement states otherwise
(h) Acknowledgment that the experimental treatment cannot be used to assist with ending the patient's natural life

Corridor's UI guides the provider through a checklist during the session, marking each topic as covered. The session recording is stored in Supabase Storage (HIPAA-eligible bucket) with the topic-coverage timestamps. A post-session transcript is generated, stored, and linked to the consent record for patient access and audit review. Provider attests at session end that all required topics were covered. Patient verbally consents on recording.

The recorded session, the timestamped topic checklist, and the provider's attestation together constitute "verified comprehension and consent through interactive discussions… recorded using audio, video, or any other digital platform" under 50-12-105(3)(b).

For patients who prefer the traditional path under § 105(3)(a), Corridor also generates a written informed consent document populated with all required elements; patient e-signs, treating provider attests, witness e-signs.

**Stage 6 — Patient agreement.**

RULE 11. Corridor generates the Patient Agreement PDF including all RULE 11(2) elements:

(a) Treatment consent
(b) Admit and discharge criteria
(c) Treatment name, form, and clinical trial phase
(d) Full text of 50-12-110 (Immunity from Suit)
(e) Detailed description of all anticipated costs and billing approach
(f) 50-12-105(2)(e) insurance acknowledgment
(g) ETC's grievance policy

Both the patient (or verified legal representative with signing authority) and an ETC licensed health care professional sign and date before any treatment (RULE 11(3)). The signed agreement is one prerequisite in the central treatment authorization gate; agreement signing alone is not sufficient to schedule or deliver treatment.

**Stage 7 — Payment.**

The patient pays the cost specified in the patient agreement via Stripe (cards, ACH via Plaid Link). Receipt sent via Resend. Payment ledger entry created. ETC admin sees the payment in their billing dashboard.

If the program supports installment payments, Stripe handles via subscription primitive; this is configurable per program.

**Stage 8 — Treatment scheduling.**

ETC clinical staff schedules the patient's visits. Patient sees schedule in patient portal, receives confirmation and reminder emails (24h and 2h before each visit).

**Central treatment authorization gate.**

No treatment visit may be scheduled, checked in, or documented unless Corridor has a current `treatment_authorization` pass for the enrollment. The gate is evaluated by the API immediately before visit creation, check-in, and treatment documentation. It checks, at minimum:

- ETC license is active or otherwise permitted for the action being taken
- Active Program Participation Agreement for sponsor ↔ ETC ↔ program
- ETRB associated with the ETC
- Protocol approved for the ETC/program
- RULE 16(6)(f) risk/outside-ETC evaluation exists for the treatment/device, even if outside-ETC administration is not enabled in MVP 1
- Valid H&P within 12 months of the visit
- Eligibility verified and clinical review accepted
- Informed consent complete, including recording/transcript or written path artifacts
- Patient agreement signed by the patient or verified legal representative and ETC licensed professional
- Payment complete, waived, or explicitly marked not required under the agreement
- Transfer agreement current
- Treating provider credential current and permitted for the action
- Required P&P manual sections approved, including grievance policy

The authorization result is stored with pass/fail status, evaluated version, timestamp, actor/request id, and machine-readable failure reasons. Failures are surfaced to ETC staff as a checklist, not as a generic error.

### 10.6 Treatments and treatment documentation (RULE 13)

**Per-visit workflow:**

- Patient checks in (ETC staff confirms identity)
- Provider conducts treatment per protocol
- Provider documents per RULE 13(1):
  - Treatment provided (auto-populated from program, confirmed by provider)
  - Expected outcomes (program template, customized)
  - Adverse side effects observed (yes/no; if yes, triggers AE workflow per § 10.10)
  - Remedy for adverse effects and outcome
  - Patient response to treatment, side effects, and remedies
- Vitals captured if program requires
- Patient education delivered and documented (RULE 6(2)(l))
- Discharge note for the visit including discharge instructions (RULE 12(2)(l))

**Treatment plan:** A program-level treatment plan template is instantiated per patient and tracks visit cadence, expected duration, milestones, required documentation, and outcome measures. Visits and treatment documentation are linked back to the instantiated plan so missing visits, overdue milestones, and missing outcomes are reportable.

**Outcome capture:** Provider observations, patient-reported outcomes, labs, and validated scales are stored as structured `outcome_measure_observations` mapped to the program's outcome definitions. After each visit, the patient receives an emailed link to a brief patient-reported outcome survey scoped to the program. Responses are stored in the patient file under interdisciplinary progress notes (RULE 12(2)(j)) and are available for sponsor aggregates and ETRB safety/outcome reports only after de-identification rules are applied.

**Drug accountability:** WST-057 inventory is tracked by product, lot/batch, expiration, storage location, condition logs, receipt, dispensing, waste/return/destruction, and reconciliation. Treatment documentation cannot reference an expired, quarantined, or unaccounted lot. Expiration monitoring feeds RULE 19 safety alerts and sponsor operational reports without exposing identified patient data.

### 10.7 Transfer agreement and emergency transfer (RULES 13(2)–(4), 14)

**Transfer agreement management:**

- ETC uploads transfer agreement with local hospital
- Annual renewal countdown (RULE 13(4))
- Renewal reminder at 60 days, 30 days, 7 days
- Compliance health score impact if expired

**Emergency transfer workflow:**

- ETC clinical staff initiates "Emergency Transfer" from a patient's record
- Workflow:
  - Notify receiving hospital (per RULE 13(3)(a)) — Corridor surfaces the hospital's contact per the active transfer agreement; ETC staff calls and confirms in app
  - Document confirmation that hospital can provide necessary services
  - Document medically appropriate life support measures used to stabilize and sustain (RULE 13(3)(b))
  - Generate transfer record packet (RULE 13(3)(c)) — patient summary, current treatment, vitals, AE if applicable, allergies — as a printable PDF and an electronic transfer to the receiving hospital's preferred intake channel (email/fax with secure link in MVP 1; FHIR Phase 2)
  - For non-emergency transfers, document patient or representative informed of risks/benefits (RULE 13(3)(d))
  - AE workflow is invoked if the underlying cause is an adverse event

### 10.8 ETRB workflow (RULE 16)

**Concept:** The ETRB is a first-class entity in Corridor. An ETC has zero-or-one active board association at any time (boards can be replaced). A board can serve many ETCs (RULE 16(2)(b), (4)).

**Board setup:**

- ETC admin either creates a new board (entering board members and credentials) or selects an existing board they have permission to associate with
- Each board member is a Clerk-authenticated user with role ETRB Reviewer
- Conflict of interest declarations per RULE 16(3) and 1-6-105 MCA — each member declares no personal, financial, employment, or ownership interest in the ETC; declaration timestamped, signed, retained per RULE 16(6)(d)
- Board composition validated against RULE 16(5): minimum 4 members, including ≥1 MT-licensed physician, ≥1 researcher with clinical outcome expertise, ≥1 ethicist; credentials provided to DPHHS

**Protocol review (RULE 16(6)(a)):**

- Sponsor uploads protocol (per § 9.2) → ETC associates protocol with their board
- Reviewers receive notification, access read-only protocol artifact
- Each reviewer:
  - Confirms or updates conflict declaration
  - Reviews per RULE 16(6)(a)(i)–(iv): safety standards, informed consent procedures, risk-benefit analysis, alternatives evaluation
  - Casts vote: Approve / Request Changes / Reject; with rationale
- Board chair (one of the reviewers, designated per board) closes review when quorum reached and majority votes approve
- Approved protocol artifact created with timestamp, voting record, conflict declarations
- Approval is required before the program can be offered at the associated ETC

**Quality and safety outcome evaluation (RULE 16(6)(b)):**

- Quarterly board meeting (board can sync with ETC's QAPI cadence or independent)
- Outcome data pulled from treatment documentation across all ETCs the board serves (per RULE 16(4)(c) — "consolidated quarterly safety outcome reports… clearly identify outcomes by center")
- Board reviews and produces minutes

**Annual public report (RULE 16(6)(c)):**

- Generated automatically annually, from board's data
- Contents per RULE 16(6)(c)(i)–(iv):
  - Aggregate treatments reviewed and approved
  - Aggregate safety outcomes (de-identified per RULE 16(6)(c)(ii))
  - General approval timeframes
  - Recommended system-wide quality improvements (board adds narrative)
- Published to the ETC's public page (`etc-name.corridor.health/etrb-report`)

**Adverse event review (RULE 16(6)(e)):**

- AE reports flow to the board's review queue from RULE 17 workflow
- Board reviews quarterly minimum

**Outside-ETC safety determination (RULE 16(6)(f)):**

- Per treatment, board evaluates whether the treatment is safe to administer outside the ETC
- This determination is the gating event for RULE 25 (Phase 2)
- Determination recorded with rationale, board vote, date

**Records retention:** RULE 16(6)(d) requires 5-year retention of all protocol reviews, approvals, safety evaluations, and reports. Corridor enforces this retention with deletion locks on ETRB records < 5 years old.

**Provisional licensure path:** RULE 16(7) allows an ETC to be licensed without a board, but no treatments may be delivered until the board is established and has issued the RULE 16(6)(f) evaluations for each treatment. Corridor's gate logic enforces this: an ETC in "Provisional" status can configure programs but cannot enroll patients into treatment until the board is associated and approvals exist.

### 10.9 QAPI program (RULE 15)

**Concept:** Quarterly internal quality program. Led by medical director (RULE 15(2)). At least one member from each department (RULE 15(3)). 3-year retention of meeting documentation (RULE 15(5)).

**Workflow:**

- ETC admin (or medical director) configures QAPI committee membership
- Quarterly meeting cadence; calendar invites generated with prep materials
- Pre-meeting data pull, presented as read-only meeting briefing:
  - Patient and staff incidents since last meeting (RULE 15(6)(a))
  - Treatments with adverse side effects since last meeting (RULE 15(6)(b))
  - Patient grievances since last meeting (RULE 15(6)(c))
  - Clinical and administrative issues
  - Unresolved matters from previous QAPI meeting (RULE 15(6)(e))
  - Adverse event data per RULE 17 (RULE 15(6)(f))
- Live meeting interface (used during the meeting) for chair to annotate decisions, capture action items, assign owners and due dates, mark unresolved matters for next meeting
- Post-meeting: minutes generated, signed by chair, immutable. 3-year retention enforced.

### 10.10 Adverse event reporting (RULE 17)

**Trigger:** AE detected during treatment documentation, by patient self-report through patient portal, by ETC staff observation, or by medical director's clinical judgment.

**Severity classification per RULE 17(2):** "Serious" if it results in death, life-threat, hospitalization or prolongation, persistent significant incapacity, congenital anomaly/birth defect, or in medical-judgment important medical events.

**Workflow:**

- Anyone with appropriate role (clinical staff, medical director, patient via patient portal) initiates an AE report
- Initial capture (within minutes of detection):
  - Type of experimental treatment involved (RULE 17(3)(a))
  - Nature and severity (RULE 17(3)(b))
  - Date of occurrence (RULE 17(3)(c))
  - Patient medical condition (RULE 17(3)(e))
- Timestamp capture includes occurrence, detection, ETC awareness, and report creation times. Counsel selects the formal clock basis; until resolved, Corridor warns from the earliest known timestamp and stores the selected `clock_basis` when finalized. Visible countdown appears on the dashboard, on the AE record, and in daily admin/MD digest emails.
- Medical director assigned for review and severity classification
- Corrective actions taken documented (RULE 17(3)(d))
- Submission to DPHHS:
  - **MVP 1:** Corridor generates a DPHHS-formatted AE report PDF; ETC submits via DPHHS's electronic system; ETC records submission timestamp in Corridor
  - **Phase 2:** Direct API integration with DPHHS's electronic system if/when available
- AE record routed to:
  - Sponsor's regulatory contact per program's PPA (immediate notification)
  - QAPI program's review queue (RULE 17(4))
  - ETRB's review queue (RULE 16(6)(e))

**Patient self-report path:** Patient portal has a prominent "Report a side effect or problem" CTA. Patient submits with severity self-assessment. ETC staff triages, may contact patient, escalates to formal AE workflow if warranted.

### 10.11 Compliance dashboard

**Purpose:** A single view of every recurring compliance obligation with status, due dates, and ownership.

**Tracked items:**

- License renewal (annual; SB 535 § 1(3)(b))
- HFAR Path B reporting (Feb 1 annually; SB 535 § 2(1))
- DPHHS annual report (Jan 31; RULE 22)
- ETRB annual public report (annual; RULE 16(6)(c))
- Transfer agreement renewal (annual; RULE 13(4))
- Fire marshal inspection (annual; RULES 23(2), 24(2))
- Fire alarm system / suppression system inspection (annual; RULES 23(3), 24(3))
- P&P manual review (biennial; RULE 6(4))
- Staff license expirations (variable)
- QAPI quarterly meetings (quarterly; RULE 15(4))
- ETRB quarterly safety review (quarterly; RULE 16(6)(b))
- Infection control officer/training current (RULE 18)
- Open infection/safety corrective actions (RULES 18, 19)
- Expiring products requiring disposition (RULE 19)

Each item shows: due date, days remaining, status (On track / At risk / Overdue), owner, last completed.

### 10.12 HFAR Path B annual workflow (SB 535 § 2(1)–(2)(b), § 3)

**Timing:** Annually, ahead of February 1 deadline.

**Workflow:**

- December: ETC admin receives reminder to begin year-end HFAR process
- ETC admin enters or imports net annual profits figure (CSV upload from accounting system; manual entry; QuickBooks integration Phase 2)
- Corridor calculates 2% contribution
- Corridor generates DPHHS HFAR documentation form with all required fields per SB 535 § 2(1)
- ETC admin reviews, approves, signs
- ETC initiates contribution to Insurance Premium Support Account per SB 535 § 3(2):
  - **MVP 1:** Corridor displays the wire / ACH instructions; ETC sends from their bank; ETC confirms transfer with reference number in Corridor
  - **Phase 2:** Direct ACH via Plaid if DPHHS supports
- Corridor generates contribution receipt and stores in compliance archive
- Submission of HFAR form to DPHHS by Feb 1 (analogous to AE — Corridor produces the PDF; ETC files via DPHHS system in MVP 1)

**Net annual profits ambiguity:** SB 535 does not define "net annual profits." Until DPHHS publishes guidance, Corridor presents two interpretations side-by-side (GAAP net income; tax-basis profits) and lets the ETC choose, with a note flagging the policy uncertainty. The chosen interpretation is logged.

### 10.13 DPHHS annual report (RULE 22)

**Timing:** Annually, by January 31, covering the prior calendar year.

**Workflow:**

- December: Corridor begins assembling the annual report data automatically — pulling from treatment documentation, AE archive, ETRB archive, QAPI archive, patient files
- ETC admin and medical director review the assembled data
- Corridor generates the report in DPHHS's required format (RULE 22(1))
- ETC admin reviews, signs, files via DPHHS's electronic licensing system

If filing is missed, RULE 22(2)(b) allows DPHHS to reduce the ETC to a provisional license. Corridor surfaces this consequence prominently to drive timely filing.

### 10.14 Grievances

Per RULE 6(2)(k) and 11(2)(g):

**Workflow:**

- Patient files grievance via patient portal (or ETC staff files on behalf)
- Grievance enters ETC's grievance queue
- ETC admin acknowledges within ETC's policy timeline
- Investigation, resolution, response to patient
- All grievances reviewed at QAPI meetings per RULE 15(6)(c)
- Records retained

### 10.15 Reports

**ETC-scoped reports:**

- Patient census (active, completed, discharged)
- Treatment volume and outcomes
- AE summary
- Compliance status
- Financial summary (treatments, payments collected, refunds, HFAR contribution year-to-date)
- Audit log export

### 10.16 Settings

Standard plus:

- Facility profile (name, location, outpatient/inpatient designation, license number, license expiration)
- Multi-site management (RULES 7(5), 8(6))
- ETRB association
- Transfer agreement(s)
- Custom fields per program participation

### 10.17 Infection control and safety program

RULES 18 and 19 require more than P&P text. MVP 1 includes an operational infection-control and safety module:

- Designated infection control officer, linked to staff file, license, and infection-control training evidence
- Nationally recognized infection-control guideline selection and implementation documentation
- Cleaning logs for treatment areas before use and between patients
- High-level disinfection / sterilization / equipment cleaning logs when applicable
- Infection surveillance observations and corrective/preventive actions
- Safety hazard / near-miss / incident reporting
- Medication error reduction process and medication-error event records
- Fall or physical injury event records for patients, staff, and visitors
- Product expiration monitoring for medications, reagents, solutions, and other expiring products
- QAPI routing for infection/safety incidents and unresolved corrective actions

The P&P manual provides policy language; this module records execution evidence.

---

## 11. Patient Portal — Detailed Specification

### 11.1 Design ethos

The patient portal must feel calm. Every screen is plain language, large text, generous spacing, no marketing copy, no urgency manipulation. Color palette is warm and quiet (a pre-existing aesthetic decision aligned with Faro's amber direction is appropriate here too — though the brand for Corridor's patient surface is its own).

### 11.2 Discovery and self-screen

(Detailed in § 10.5 Stage 1.)

### 11.3 Home

After authentication, patient lands on a home view that shows:

- Their treatment status in plain language ("You're scheduled for your next visit on May 8 at 10:00 AM at the Bozeman ETC")
- Action items requiring their attention (sign agreement, complete consent, upload H&P, pay balance)
- Recent messages from ETC staff
- Quick links to documents, payments, help

### 11.4 My Treatment

- Treatment plan in plain language (visit cadence, expected duration, what to expect)
- Visit history with provider notes shared with patient
- Outcomes captured (PRO survey responses, provider observations marked as patient-shareable)
- Schedule view with reschedule request flow

### 11.5 Documents

All patient-facing documents in one place, downloadable as PDFs:

- Patient Agreement
- Informed Consent record (including video recording link if applicable)
- H&P uploaded
- Receipts for payments
- Discharge summaries
- Test results (provider chooses what to share with patient)
- Their full file on request (RULE 12; patient has right to their record)

### 11.6 Messages

Asynchronous messaging with ETC clinical staff. Used for non-urgent questions, scheduling adjustments, and follow-ups. Important: the patient portal explicitly says "For emergencies, call 911. For urgent medical concerns, call your treating physician or [ETC's after-hours line]."

Messaging is part of the patient file when it contains care, scheduling, safety, payment, or grievance context. Message threads have explicit participants, clinical visibility classification, attachment support, read receipts, retention, and audit events. Representatives can participate only if their representative access scope permits messaging. Internal Corridor support cannot view clinical message threads except through a ticket-scoped support-access grant.

### 11.7 Payments

- Outstanding balance
- Payment history
- Payment method management (Stripe Customer Portal embed)
- Receipt downloads

### 11.8 Report a side effect or problem

A prominent, always-visible CTA. Single-page form: what happened, when, severity self-assessment, current status. On submission, ETC staff is paged. This is the patient-side entry to the AE workflow.

### 11.9 Help

- FAQ
- Contact ETC
- Contact Corridor support (limited to platform issues, not medical questions)
- Grievance filing

---

## 12. Admin Portal — Detailed Specification

For Corridor's internal team only.

### 12.1 Tenants

List of all sponsor tenants and ETC tenants with status, key counts, and risk flags.

### 12.2 Users

All users across tenants, role, last active, status. Used for support and offboarding.

### 12.3 Audit Log

Immutable log of every state change across the platform. Filterable by tenant, user, action, time range. Supports the Principle 4 "audit-ready by default" commitment.

### 12.4 Compliance Watch

Cross-tenant view of every ETC's compliance health score, flagging any tenant at risk of falling out of compliance (license renewal, HFAR deadline, RULE 22 deadline, expired transfer agreement, etc.). Triggers proactive customer success outreach.

### 12.5 Support

In-app support tickets from any user, with secure scoped-access tooling for support staff to investigate without granting permanent PHI access.

### 12.6 Feature Flags

Standard feature flag management (LaunchDarkly or in-house).

### 12.7 Subprocessors

List of all subprocessors with BAA status, SOC2 status, last review date. Aligns with HIPAA Business Associate Agreement requirements.

---

## 13. Cross-Cutting Modules

### 13.1 Audit log

Every state change writes an audit log entry: `tenant_id`, `actor_user_id`, `action`, `target_object_type`, `target_object_id`, `before_value`, `after_value`, `ip_address`, `user_agent`, `timestamp`. Append-only (Postgres trigger prevents UPDATE/DELETE on audit_log table).

### 13.2 Notifications

Email-only in MVP 1, via Resend. Templates per event type. Patient-facing emails are warm and plain. Sponsor and ETC emails are operational and concise. SMS is Phase 2 — abstracted notification interface so the channel is a parameter.

### 13.3 File storage

All documents and recordings live in Supabase Storage with HIPAA-eligible bucket configuration. SHA-256 hash on upload, immutable references from regulated objects (patient agreements, informed consent recordings, ETRB approvals) so a file replacement creates a new version rather than overwriting.

### 13.4 PDF generation

Server-side PDF rendering for patient agreements, ETRB approvals, AE reports, HFAR forms, DPHHS annual reports, license application packages. Implementation: Puppeteer in a worker; templates as React components rendered server-side.

### 13.5 Signing

E-signature for patient agreements and other in-platform signed documents. Integration with a signing primitive (HelloSign / Stripe Identity / Documenso self-hosted — picked in implementation). Treated as black-box in this PRD with the requirement that signing events produce immutable signing records with timestamps, IP, and signer identity.

### 13.6 Search

Tenant-scoped search across patients, treatments, AEs, protocols, staff, and documents. Postgres full-text search in MVP 1; OpenSearch or Algolia Phase 2 if needed.

MVP 1 search is implemented inside Postgres with `search_index_documents` and `search_index_jobs`; it never sends PHI or operational text to an external search vendor. Search results are filtered by the same RLS/session context as direct reads. Every indexed document stores source table, source id, owner tenant, optional patient tenant, visibility class, title, redacted snippet, weighted tsvector, and last-indexed timestamp. Mutations enqueue reindex jobs so search is eventually consistent without bypassing table-level authorization.

### 13.7 Internationalization

i18n scaffolding (react-intl) present from day one with all strings externalized. Only English shipped in MVP 1.

### 13.8 Time zone handling

All timestamps stored as UTC. All deadlines per Montana statute (5-day AE clock, Jan 31 annual report, Feb 1 HFAR) use America/Denver for display and deadline calculation.

### 13.9 Legal content versioning

Regulated text is versioned content, not hard-coded copy. P&P templates, informed consent text, patient agreement templates, 50-12-110 statutory text, grievance policy text, PPA data-sharing language, AE/DPHHS submission attestations, and patient-rights notices must be stored as immutable `legal_content_template_versions` with counsel approval metadata before use in production.

Every rendered regulated document stores the exact template version ids, input data hash, rendering timestamp, signer identities, and file hash. If counsel changes a template, Corridor creates a new version; previously rendered documents remain linked to the old version for audit.

---

## 14. Data Model

The following is a logical data model. Postgres-specific column types and constraints are derived in implementation.

### 14.1 Tenancy

- `tenants` — security boundary. Kind enum: sponsor, etc, patient, board, corridor_internal.
- `users` — Clerk identity, email, name, phone (optional)
- `tenant_memberships` — user ↔ tenant with role, status, starts_at, ends_at
- `tenant_relationships` — cross-tenant grants and relationships (PPA, board-to-ETC, caregiver/guardian, future partner grants), with scope_json and status
- `support_access_grants` — ticket-scoped Corridor support access; staff_user_id, target_tenant_id, scopes, starts_at, expires_at, approved_by_user_id, revoked_at
- `regulatory_jurisdictions` — state/country jurisdiction registry; launch seed is Montana, with timezone, effective date, and status
- `regulatory_rule_versions` — immutable rule/source snapshots per jurisdiction with source citations, effective dates, supersession, and counsel review

Every regulated object created in MVP 1 carries a `jurisdiction_id` and, where a rule interpretation matters, the applicable `regulatory_rule_version_id`. This includes programs, ETC profiles, license applications, P&P manuals, consents, agreements, AEs, QAPI, reports, HFAR filings, device stubs, and payment obligations.

### 14.2 Sponsor domain

- `sponsor_organizations` — legal/business profile for sponsor tenants; tenant_id, legal_name, billing profile, tax_id_encrypted, regulatory contacts
- `programs` — name, drug, indication, phase, IND number, protocol_file_id, treatment_form, pricing_model, hfar_path, eligibility_criteria_json, patient_facing_description, status, sponsor_tenant_id
- `program_versions` — immutable history of program edits
- `program_participation_agreements` — PPA between sponsor tenant and ETC tenant for a program; status, signed_at, terms_file_id, ae_flowdown_email, data_sharing_level (`aggregate_only` / `deidentified_line_level_safety` in MVP 1); creates the relevant tenant_relationship grant
- `program_treatment_plan_templates` — program-level treatment plan template with expected duration, visit cadence, milestones, required documentation, and owner role
- `program_visit_schedule_templates` — visit sequence definitions, timing windows, required provider role, required outcome measures, and treatment documentation requirements
- `program_outcome_measures` — structured outcomes with source, unit, cadence, expected direction, required flag, and sponsor/ETRB reporting label
- `sponsor_data_access_events` — sponsor read/export events for aggregate and de-identified line-level safety data; actor, program, PPA, sharing level, data scope, occurred_at
- `sponsor_deidentified_exports` — export manifests with cohort rules, k-anonymity checks, de-identification version, file_id, and generated_by
- `patient_data_sharing_consents` — Phase 2/8 stub for future identified sponsor PHI sharing; patient_tenant_id, sponsor_tenant_id, program_id, scope_json, starts_at, revoked_at, inactive in MVP 1

### 14.3 ETC domain

- `etcs` — legal/licensure profile for ETC tenants; tenant_id, license_number, license_expires_at, designation outpatient/inpatient, primary_address, status
- `etc_sites` — for multi-site ETCs under one license
- `etc_administrators` — current and historical admin assignments
- `etc_medical_directors` — current and historical MD assignments
- `etc_staff` — staff records joined to RULE 10 staff_files
- `staff_files` — RULE 10 artifacts (license, orientation, job description, evaluations, training)
- `license_applications` — RULE 5 application packages, status, dphhs_submitted_at, dphhs_approved_at
- `pp_manuals` — manual root
- `pp_manual_sections` — one per RULE 6(2) category, with status, current_version
- `pp_manual_section_versions` — immutable history with author, approved_by_admin, approved_by_md, approved_at
- `transfer_agreements` — hospital, expires_at, file_id
- `infection_control_programs` — ETC tenant, infection_control_officer_staff_id, selected_guidelines, implementation_file_id, status
- `cleaning_logs` — treatment area, before_use/between_patients marker, completed_by, completed_at, exception_notes
- `equipment_disinfection_logs` — equipment/instrument, method, completed_by, completed_at, result, exception_notes
- `infection_surveillance_events` — suspected infection/communicable disease observations, corrective/preventive action, qapi_routed_at
- `safety_reports` — hazard, near miss, adverse incident, medication error, fall/injury, reporter, severity, corrective_action, qapi_routed_at
- `expiring_products` — medication/reagent/solution/product name, lot, expiration_date, disposition_status, disposed_at
- `drug_products` — program-linked treatment products; sponsor tenant, program, name, form, strength/concentration, storage requirements, active status
- `drug_lots` — product lot/batch, manufacturer/sponsor lot reference, expiration date, quantity received, certificate/file references, quarantine/disposition status
- `drug_inventory_locations` — ETC storage locations with temperature/security requirements and responsible staff
- `drug_inventory_movements` — receive, transfer, dispense, waste, quarantine, return, destroy; quantity, lot, location, actor, reason, evidence file
- `drug_storage_condition_logs` — storage temperature/condition observations, excursions, corrective actions, qapi_routed_at
- `drug_accountability_reconciliations` — periodic lot balance reconciliation, variance explanation, approver, report file
- `inpatient_facility_profiles` — disabled-by-default inpatient evidence fields for RULE 24: bed count, plant/equipment evidence, generator/sprinkler/call-system fields, validation status

### 14.4 ETRB domain

- `boards` — first-class board tenant profile; tenant_id, name, status; can serve many ETCs
- `board_etc_associations` — many-to-many board ↔ ETC; written_agreement_file_id (RULE 16(4)(b))
- `board_members` — user ↔ board, role (physician / researcher / ethicist / other), credentials_file_id
- `board_member_conflict_declarations` — per member per ETC association, declared_at, declaration_text (1-6-105 MCA aligned)
- `protocol_reviews` — board, program, status, decided_at
- `protocol_review_votes` — per reviewer, vote, rationale, conflict_reaffirmed_at
- `board_meetings` — type (protocol_review / quarterly_safety / ad_hoc), date, minutes_file_id
- `board_safety_evaluations` — RULE 16(6)(b) outcome reviews
- `board_outside_etc_determinations` — RULE 16(6)(f) per-treatment safety determinations
- `board_annual_reports` — RULE 16(6)(c)

### 14.5 Patient domain

- `patients` — patient tenant profile; tenant_id, primary_user_id, full_name, sex, dob, address, emergency_contact, allergies
- `patient_representatives` — patient_tenant_id, representative_user_id, relationship_type (caregiver / legal_guardian / parent_guardian / other), authority_basis, authority_document_file_id, access_scope_json, can_sign, can_message, starts_at, expires_at, revoked_at, verified_by_user_id
- `minor_assents` — enrollment_id, patient_tenant_id, assent_file_id, assent_at, co_signed_by_representative_user_id, waived_reason
- `patient_program_enrollments` — patient_tenant_id ↔ program ↔ ETC tenant; status (screening / active / completed / discontinued)
- `patient_treatment_plans` — instantiated from program template for the enrollment; status, start/end targets, treating provider, individualized notes
- `patient_treatment_plan_milestones` — per-enrollment milestones, due windows, completed_at, completion evidence
- `eligibility_screens` — self-screen results
- `physician_referrals` — treating physician name, license, recommendation_file_id, hp_file_id, hp_date (validated within 12 months at point of treatment)
- `other_treatments_evaluated` — RULE 12(2)(f) documentation
- `informed_consents` — patient ↔ enrollment; path (digital_recorded | written); recording_file_id (if applicable); transcript_file_id; written_consent_file_id (if applicable); attesting_provider_user_id; witness_user_id; patient_signer_user_id; signer_capacity; signed_at; topics_covered_json (50-12-105(2)(a)–(h) checklist)
- `patient_agreements` — RULE 11; agreement_file_id; legal_template_version_id; signed_by_patient_or_rep_user_id; signed_by_patient_or_rep_at; patient_signer_capacity; signed_by_provider_user_id; signed_by_provider_at
- `patient_payments` — Stripe payment intent reference, amount, status, ledger entries
- `treatment_authorizations` — enrollment_id, status (pass / fail), evaluated_at, evaluated_by_user_id, gate_version, failure_reasons_json, source_snapshot_json
- `treatments_delivered` — per-visit; provider_user_id, treatment_id, treatment_plan_id, drug_dispense_id nullable, outcome_observation_summary, observed_response, ae_id nullable
- `patient_visits` — scheduled and completed visits; check_in_at, check_out_at, provider_user_id
- `drug_dispenses` — patient/enrollment/visit dispense record; product, lot, quantity, expiration check, administered_or_dispensed_at, witnessed_by, waste/return disposition
- `patient_pro_responses` — patient-reported outcomes mapped to program_outcome_measure_id and visit/milestone where applicable
- `outcome_measure_observations` — structured provider, patient, lab, or scale observations for a program measure; value, unit, collected_at, source, visit_id, file_id
- `patient_device_registry_entries` — Phase 2/8 stub linking patients/enrollments to investigational devices, device identifier, status, outcomes summary, and AE reference
- `discharges` — date, circumstances (RULE 12(4)), discharge_summary_file_id
- `patient_file_retention_locks` — patient_tenant_id, discharge_id, retain_until, locked_object_type, locked_object_id; prevents deletion before five years after discharge

### 14.5A Patient communications and rights

- `message_threads` — patient_tenant_id, etc_tenant_id, enrollment_id, subject, visibility_classification (clinical / scheduling / billing / support), status, retained_until
- `message_thread_participants` — thread_id, user_id, participant_role, representative_id nullable, can_send, can_view
- `messages` — thread_id, sender_user_id, body, sent_at, edited_at, deleted_at nullable, audit classification
- `message_attachments` — message_id, file_id
- `message_read_receipts` — message_id, user_id, read_at
- `record_requests` — patient_tenant_id, requester_user_id, request_type (full_file / specific_records), status, requested_at, fulfilled_at, export_file_id
- `amendment_requests` — patient_tenant_id, requester_user_id, target_record_type, target_record_id, requested_change, status, clinical_decision_by_user_id, decision_reason, response_file_id
- `disclosure_events` — patient_tenant_id, disclosed_to_tenant_id/user_id, purpose, legal_basis, data_scope_json, occurred_at, source_object_type, source_object_id
- `privacy_restrictions` — patient_tenant_id, requested_by_user_id, restriction_scope_json, status, approved_by_user_id, starts_at, ends_at, revoked_at

### 14.6 Adverse events

- `adverse_events` — RULE 17; treatment_id, patient_id, etc_id, program_id, severity, occurred_at, detected_at, became_aware_at, reported_at, clock_basis, dphhs_deadline_at, dphhs_submitted_at, sponsor_notified_at, qapi_reviewed_at, etrb_reviewed_at, status (open / under_review / resolved / closed), corrective_actions, patient_medical_condition
- `ae_attachments` — supporting files

### 14.7 QAPI

- `qapi_committees` — ETC's committee, members
- `qapi_meetings` — quarterly; date, agenda, briefing_data_snapshot
- `qapi_meeting_minutes` — minutes file, signed by chair
- `qapi_action_items` — assigned to user, due date, status
- `qapi_unresolved_carryovers` — items rolling to next meeting

### 14.8 Grievances

- `grievances` — patient, ETC, filed_at, status, resolution

### 14.9 Compliance and reporting

- `compliance_obligations` — per ETC, generated from rule set with due dates
- `compliance_obligation_completions` — historical
- `dphhs_annual_reports` — RULE 22; year, report_file_id, submitted_at
- `hfar_filings` — RULE/SB §2; year, net_profits_basis, net_profits_amount, contribution_amount, contribution_path (a/b), contribution_evidence_file_id, dphhs_form_file_id, submitted_at
- `hfar_path_a_allocations` — Phase 2/8 stub for future free-treatment allocation, qualifying-resident basis, product quantity, fulfillment evidence, reconciliation status

### 14.9A Architecture-preserved stubs

These tables ship in MVP 1 even when their workflows are inactive. They protect the architecture from later primary-key rewrites, RLS rewrites, or payment-data rewrites when Phase 2 programs activate.

- `investigational_devices` — program-linked device stubs with sponsor tenant, device type, identifier schema, connectivity flag, status, and protocol file references
- `payment_rails` — rail abstraction for Stripe/card/ACH active in MVP 1 and disabled future rails such as digital or alternative currency
- `payment_obligations` — patient/program/ETC obligation with amount, currency, selected rail, legal basis, due date, waiver status, and jurisdiction
- `payment_transactions` — concrete payment attempts/settlements linked to an obligation and rail; external provider reference, amount, currency, status, occurred_at

### 14.10 Audit and infra

- `audit_log` — append-only; tenant, actor, action, target, before, after, ip, ua, ts
- `file_storage_objects` — pointer to Supabase Storage object with SHA-256, size, mime, uploaded_by, uploaded_at, encrypted bucket
- `notifications` — email queue, status, attempts
- `feature_flags` — per tenant overrides
- `search_index_documents` — tenant-scoped Postgres FTS rows with source table/id, visibility class, title, redacted snippet, weighted tsvector, and indexed_at
- `search_index_jobs` — async reindex queue with source table/id, requested_at, processed_at, failure reason
- `subprocessors` — operational vendor inventory with category, data allowed, PHI posture, BAA/DPA status, owner, review dates, and evidence file ids
- `subprocessor_reviews` — quarterly review records and launch/change approvals for vendors that may receive operational data
- `legal_content_templates` — logical template name and regulated use case
- `legal_content_template_versions` — immutable template body, jurisdiction, effective_at, superseded_at, counsel_approved_by, counsel_approved_at, source_citation
- `rendered_legal_documents` — rendered artifact with template_version_ids, input_data_hash, output_file_id, rendered_at, signer metadata

### 14.11 Row-Level Security strategy

Every PHI-containing table has RLS policies keyed off transaction-local application context set by the Hono API after Clerk JWT verification. Clerk authenticates the user; Postgres tenant memberships and tenant relationships authorize access.

- ETC users see only rows owned by their active ETC tenant.
- Sponsor users see their sponsor tenant's rows, plus PPA-scoped aggregate or de-identified line-level safety data from ETC tenants. Identified patient data is unavailable in MVP 1 and remains blocked unless a future patient-consented grant is implemented and active.
- Patient users see only their own patient tenant records.
- Board reviewers see only records assigned to their board tenant and associated ETC relationships.
- Patient representatives see only the records granted through caregiver, guardian, or minor-representative tenant relationships.
- Corridor support users have access only through explicit, time-boxed support grants with ticket references and PHI access logging.

The API opens a transaction and sets `app.user_id`, `app.active_tenant_id`, `app.request_id`, and optional `app.support_ticket_id` via `set local`. RLS helper functions read those settings and never read raw Clerk JWT claims.

Application and worker database roles do not have `BYPASSRLS` and must not own application tables. Every RLS-enabled table must use `FORCE ROW LEVEL SECURITY` so owner-level bypass cannot become an application-runtime escape hatch. Migration/admin roles are not available to app or worker runtimes.

---

## 15. API Surface

REST over Hono. JSON request/response. Clerk JWT for authentication. Versioned at `/v1`.

### 15.1 Sponsor endpoints

- `POST /v1/sponsors/:id/programs` — create program
- `GET /v1/sponsors/:id/programs` — list
- `PATCH /v1/sponsors/:id/programs/:programId` — update (creates new version)
- `POST /v1/sponsors/:id/programs/:programId/protocol` — upload protocol file
- `POST /v1/sponsors/:id/etcs/invite` — invite an ETC to participate
- `GET /v1/sponsors/:id/etcs` — ETC network
- `GET /v1/sponsors/:id/programs/:programId/aggregates` — de-identified aggregate data
- `GET /v1/sponsors/:id/adverse-events` — AE feed (aggregate or de-identified line-level safety depending on PPA; no identified PHI in MVP 1)
- `GET /v1/sponsors/:id/reports/...` — reports

### 15.2 ETC endpoints

- `POST /v1/etcs/:id/license-application` — start / save / submit
- `GET /v1/etcs/:id/dashboard` — composed dashboard payload
- `POST /v1/etcs/:id/staff` / `GET` / `PATCH` / `DELETE`
- `POST /v1/etcs/:id/pp-manual/sections/:sectionId/versions` — new version
- `POST /v1/etcs/:id/pp-manual/sections/:sectionId/approve` — admin and MD approval
- `POST /v1/etcs/:id/transfer-agreements` / `GET`
- `POST /v1/etcs/:id/patients` — register patient
- `POST /v1/etcs/:id/patients/:patientId/representatives` — add/verify caregiver, guardian, or parent representative
- `PATCH /v1/etcs/:id/patients/:patientId/representatives/:representativeId` — update scope or revoke representative authority
- `POST /v1/etcs/:id/patients/:patientId/eligibility-screen` — record screen
- `POST /v1/etcs/:id/patients/:patientId/referral` — physician referral upload
- `POST /v1/etcs/:id/patients/:patientId/informed-consent/session` — start session
- `POST /v1/etcs/:id/patients/:patientId/informed-consent/session/:sessionId/topic-covered` — mark topic
- `POST /v1/etcs/:id/patients/:patientId/informed-consent/session/:sessionId/finalize` — finalize
- `POST /v1/etcs/:id/patients/:patientId/agreement` — generate agreement
- `POST /v1/etcs/:id/patients/:patientId/agreement/sign` — countersign
- `POST /v1/etcs/:id/patients/:patientId/payments/intent` — create Stripe intent
- `POST /v1/etcs/:id/patients/:patientId/treatment-authorization/evaluate` — evaluate and persist central treatment gate result
- `POST /v1/etcs/:id/drug-inventory/lots` / `GET` — receive and list product lots
- `POST /v1/etcs/:id/drug-inventory/movements` — receive, transfer, quarantine, waste, return, destroy, or dispense inventory
- `POST /v1/etcs/:id/drug-inventory/storage-logs` — record storage condition observations and excursions
- `POST /v1/etcs/:id/patients/:patientId/visits` — schedule
- `POST /v1/etcs/:id/visits/:visitId/treatment-doc` — RULE 13 documentation
- `POST /v1/etcs/:id/adverse-events` — file AE
- `PATCH /v1/etcs/:id/adverse-events/:aeId` — update AE through workflow
- `POST /v1/etcs/:id/adverse-events/:aeId/dphhs-submission` — record submission
- `POST /v1/etcs/:id/qapi/meetings` — schedule
- `POST /v1/etcs/:id/qapi/meetings/:meetingId/minutes` — record
- `POST /v1/etcs/:id/qapi/action-items` — create
- `POST /v1/etcs/:id/etrb/associate` — associate or change board
- `GET /v1/etcs/:id/compliance` — health score and obligations
- `POST /v1/etcs/:id/hfar-filings` — annual HFAR
- `POST /v1/etcs/:id/dphhs-annual-reports` — annual report
- `POST /v1/etcs/:id/grievances` / `GET`
- `GET /v1/etcs/:id/messages` / `POST /v1/etcs/:id/messages` — ETC-side patient message threads
- `POST /v1/etcs/:id/privacy/amendment-requests/:requestId/decision` — accept/deny patient amendment request
- `POST /v1/etcs/:id/privacy/restrictions/:restrictionId/decision` — accept/deny privacy restriction request

### 15.3 ETRB endpoints

- `POST /v1/boards` — create
- `POST /v1/boards/:id/members` — add member
- `POST /v1/boards/:id/members/:memberId/conflict-declaration` — declare
- `GET /v1/boards/:id/queue` — pending reviews
- `POST /v1/boards/:id/protocol-reviews/:reviewId/votes` — cast vote
- `POST /v1/boards/:id/protocol-reviews/:reviewId/close` — close
- `POST /v1/boards/:id/safety-evaluations` — record
- `POST /v1/boards/:id/outside-etc-determinations` — RULE 16(6)(f)
- `GET /v1/boards/:id/annual-report` — generate / fetch
- `POST /v1/boards/:id/meetings` — record meeting

### 15.4 Patient endpoints

- `POST /v1/patient/eligibility-screen` — public; pre-account
- `POST /v1/patient/account` — create
- `GET /v1/patient/me/treatment` — current treatment
- `GET /v1/patient/me/documents` — list
- `GET /v1/patient/me/documents/:id` — download
- `GET /v1/patient/me/representatives` / `POST` — manage caregiver/guardian access requests
- `GET /v1/patient/me/messages` / `POST` — message threads
- `POST /v1/patient/me/record-requests` — request full file or scoped records
- `POST /v1/patient/me/amendment-requests` — request record amendment
- `POST /v1/patient/me/privacy-restrictions` — request privacy restriction
- `GET /v1/patient/me/disclosures` — accounting of disclosures
- `POST /v1/patient/me/adverse-events/self-report` — patient-initiated AE
- `GET /v1/patient/me/payments` / `POST /v1/patient/me/payments/intent`
- `POST /v1/patient/me/grievances`
- `POST /v1/patient/me/visits/:visitId/reschedule-request`

### 15.5 Webhooks (inbound)

- `POST /v1/webhooks/clerk` — user lifecycle
- `POST /v1/webhooks/stripe` — payment events
- `POST /v1/webhooks/plaid` — bank link events
- `POST /v1/webhooks/resend` — bounce / delivery

Each verified via signature header per provider's spec.

### 15.6 Webhooks (outbound, Phase 2)

Sponsor webhook subscriptions for AE events, treatment milestones, etc.

### 15.7 Public endpoints

- `GET /v1/public/etcs/:slug/manual` — public P&P manual view
- `GET /v1/public/boards/:slug/annual-report` — public ETRB annual report
- `GET /v1/public/programs/:slug` — patient-facing program page

### 15.8 Search endpoints

- `GET /v1/search?q=...` — tenant-scoped global search over the caller's authorized records
- `POST /v1/internal/search/reindex` — worker/admin-only reindex trigger; no browser access

---

## 16. Background Jobs and Workers

BullMQ queues backed by Redis on Railway. Job classes:

**Compliance scheduler.** Runs daily. Computes due dates, generates obligation reminders, fires notifications at appropriate intervals (90/60/30/7 days), updates compliance health scores.

**AE 5-day clock.** Runs every 15 minutes. For each open AE, computes time-to-deadline, fires escalation notifications at 96h / 72h / 48h / 24h / 6h marks.

**HFAR annual job.** Runs weekly starting Nov 1 each year. Notifies ETC admins of upcoming Feb 1 deadline. Begins data assembly.

**DPHHS annual report job.** Runs weekly starting Nov 1. Begins assembling prior calendar year data; notifies admin and MD to begin review in early January.

**License renewal.** Runs daily. ETC license, transfer agreement, fire marshal inspection, fire alarm inspection — fires renewal notifications at 90/60/30/7 days.

**Staff license expiration.** Runs daily. Per RULE 7(1)(g)(ii) annual credential verification, fires notifications at 90/60/30/7 days before any staff member's license expires.

**Notification dispatcher.** Consumes notification queue, sends via Resend, tracks delivery, retries on failure.

**Search indexing.** Consumes `search_index_jobs`, refreshes `search_index_documents`, applies redaction/visibility classification, and never writes PHI to external search services.

**PDF generation.** Renders patient agreements, AE reports, HFAR forms, DPHHS annual reports, license application packages, ETRB annual reports, P&P manual public pages.

**Audit log compactor.** Runs nightly. Indexes audit log for fast retrieval but never deletes.

**Backup job.** Runs every 6 hours. Triggers Supabase point-in-time recovery snapshot validation.

**Stripe reconciliation.** Runs daily. Reconciles Stripe payment intents against patient_payments table.

**Consent recording transcription.** MVP 1 generates post-session transcripts for informed consent recordings and stores them as regulated artifacts linked to `informed_consents.transcript_file_id`. Live captions remain Phase 2.

---

## 17. Tech Stack

### 17.1 Frontend

- Vite + React 18 + TypeScript for both deployable frontend products (`app` and `patient`)
- Frontend product boundaries:
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
- `apps/app` is the authenticated staff/business console for sponsor/biotech manufacturer, ETC, and Corridor internal admin workflows.
- `apps/patient` is a separate patient-facing product because it has different auth posture, UX, PHI exposure, analytics/logging constraints, accessibility review, bundle, and release risk.
- Tailwind CSS for styling
- shadcn/ui for component primitives
- React Router for routing
- TanStack Query for server state
- react-hook-form + zod for forms and validation
- Recharts for any data visualization
- Clerk React SDK for auth
- Stripe Elements + Stripe Checkout for payment surfaces
- Plaid Link for bank account verification
- react-intl for i18n scaffolding

### 17.2 Backend

- Node.js + TypeScript
- Hono as the API framework
- BullMQ + Redis for background jobs
- Drizzle + Postgres driver for all API and worker database access, always through RLS-enforced app roles
- Supabase JS only for the backend storage adapter; no frontend Supabase database client and no service-role Postgres access in app or worker runtimes
- Zod for request/response validation, shared schemas with frontend
- Puppeteer for PDF generation
- Resend SDK for email
- Stripe SDK + Plaid SDK for payments
- Sentry for error tracking

### 17.3 Data layer

- Supabase — Postgres 15+, Storage, RLS
- Postgres extensions: pgcrypto, uuid-ossp, pg_trgm, pgaudit (if available on Supabase)
- Migrations: drizzle-kit or sqitch (chosen in implementation)

### 17.4 Infrastructure

- **Vercel** — frontend hosting (both app.corridor.health and patient.corridor.health), preview deployments per PR, edge CDN
- **Railway** — API server, BullMQ workers, Redis, Dockerized; one project per environment (dev, staging, prod)
- **Supabase** — managed Postgres + Storage; HIPAA-eligible Team plan with signed BAA
- **Cloudflare** — DNS, WAF, DDoS, custom domain certificates

### 17.5 Auth and identity

- **Clerk** — identity, MFA, session management, and webhooks for user lifecycle. Clerk organizations may support UX but are not authoritative for database authorization.
- **RLS pattern:** Hono verifies Clerk identity, resolves the active Corridor tenant from Postgres, sets transaction-local `app.*` variables, and Postgres RLS policies authorize via `tenant_memberships`, `tenant_relationships`, and support grants.

### 17.6 Observability

- Sentry — frontend and backend errors
- Better Stack or Axiom for log aggregation
- Uptime monitoring — BetterStack or Checkly

### 17.7 Email

- Resend with a transactional template library; React Email for template authoring

### 17.8 Future-state portability note

The MVP 1 stack is portable to Aptible (HIPAA PaaS) and AWS (raw cloud). When Phase 2+ requirements push us off Supabase or Railway:

- API is plain Node + Hono in Docker → trivial port to Aptible / ECS / EKS
- Workers are plain BullMQ in Docker → same
- Postgres migrates to RDS or Aptible Postgres with pg_dump/restore
- Storage migrates to S3 with signed URL pattern
- Frontend stays on Vercel indefinitely (no reason to move)

This portability is by design. We optimize for MVP 1 velocity (Supabase) without locking ourselves out of future compliance maturity (Aptible / AWS).

### 17.9 Subprocessor list (and BAA status required)

- **Vercel** — BAA required (Vercel Enterprise has BAA)
- **Railway** — BAA required (Railway Pro has BAA)
- **Supabase** — BAA required (Team plan)
- **Clerk** — BAA required (Clerk has BAA on appropriate plan)
- **Stripe** — BAA required (Stripe has BAA on healthcare plans)
- **Plaid** — BAA required (Plaid signs BAA)
- **Resend** — BAA required (Resend signs BAA on enterprise tier)
- **Sentry** — BAA required (Sentry has BAA on Business plan)
- **Cloudflare** — BAA available (Cloudflare Enterprise)
- **Daily.co** (or chosen video provider) — BAA required
- **Better Stack or Axiom** — log aggregation; no PHI by configuration in MVP 1, BAA required before any PHI-bearing logs are permitted
- **Checkly or BetterStack uptime** — synthetic checks against public/health endpoints only; no PHI, synthetic test data only
- **PostHog** — product analytics; self-hosted or no-PHI hosted configuration preferred, BAA/DPA required before any hosted PHI exposure
- **Vanta or Drata** — compliance evidence automation; scrubbed security/compliance metadata only, no patient screenshots or exports; BAA/DPA required if any PHI-adjacent evidence is uploaded
- **Pen-test vendor** — security testing; synthetic data only unless a BAA is executed and scope explicitly permits PHI

Procurement and BAA execution is a P0 blocker for any subprocessor before that subprocessor sees any real PHI.

### 17.10 Local development toolchain

Toolchain versions and task graph are pinned in `mise.toml` at repo root and managed via [mise](https://mise.jdx.dev). A single `mise install` after clone provisions:

- Node 20
- pnpm 9
- Postgres 15 client tools
- Docker Compose-backed Postgres and Redis for local infrastructure

All developer commands — `dev`, `typecheck`, `lint`, `format`, `test`, `test:e2e`, `test:a11y`, `build`, the `db:*` family, and the consolidated `ci` gate — are mise tasks (`mise run <task>`) with explicit `depends = [...]` edges so prerequisites (e.g., `db:up` before `db:rls:test`) are not implicit. CI executes `mise run ci` to mirror local pre-commit behavior exactly.

The choice of mise (over plain pnpm scripts or Make) is motivated by reproducibility: HIPAA posture benefits from pinned, declarative toolchain versions in the same file as the task graph, including non-Node tools such as the Postgres client that pnpm scripts cannot pin.

---

## 18. Security, Privacy, and HIPAA Posture

### 18.1 PHI scope

PHI is in scope from MVP 1 day one. Corridor is a Business Associate to ETCs (which are Covered Entities) and to sponsors when sponsors receive identifiable patient data.

### 18.2 Encryption

- TLS 1.3 in transit everywhere
- AES-256 at rest (Supabase default)
- Application-layer encryption for highly sensitive fields (tax IDs, payment method last-4, SSN if ever captured — though MVP 1 should not capture SSN)
- Storage objects encrypted with bucket-level keys; sensitive objects (informed consent recordings, AE reports) additionally signed for tamper detection
- Local-development and CI secrets are encrypted at rest in the repo via age, configured in `fnox.toml` with an explicit `[providers.age].recipients` list (developer pubkeys + a CI pubkey whose private half lives only in the CI secret store). Profiles (`api_dev`, `workers_dev`, `workers_elevated_dev`, `frontend_app_dev`, `frontend_patient_dev`, `ci`) scope which secrets each runtime receives. `SUPABASE_SERVICE_ROLE_KEY` is allowed only in the isolated `workers_elevated_dev` profile and is forbidden from API, regular worker, frontend, and CI profiles. **Staging and production secrets live exclusively in Vercel and Railway environment variables; they never appear in `fnox.toml` or its encrypted blobs.** Recipient changes (onboarding, revocation) are auditable in git history; revocation triggers value rotation per HIPAA hygiene

### 18.3 Access control

- Clerk MFA required for all sponsor and ETC users
- Patient MFA optional (encouraged during onboarding)
- RLS as the primary tenant-isolation enforcement
- Role-based access within tenants (admin, MD, clinical, ops, reviewer, etc.)
- Break-glass access for Corridor support uses explicit support-access grants, not user impersonation. Grants require a ticket reference, scope, expiration, PHI access logging, and tenant-admin notification.

### 18.4 Audit logging

Per Principle 4. Every state change writes an immutable audit log entry. Logs retained for 7 years (HIPAA standard).

### 18.5 Data minimization

PII collection limited to what each persona needs. Sponsors never see identified patients in MVP 1. Aggregate and de-identified line-level safety views enforce k-anonymity and redaction rules to prevent re-identification of small cohorts.

### 18.6 Backups and disaster recovery

- Supabase point-in-time recovery 7 days minimum (Team plan supports up to 35 days)
- Daily logical backups exported to S3-equivalent storage with separate AWS account
- Quarterly DR drills

### 18.7 Incident response

Incident response plan documented. Notification SLAs aligned with HIPAA Breach Notification Rule (60 days max; we target 7 days). Sentry alerts trigger on-call.

### 18.8 Patient rights

- **Right of access** — patients can request/download their full file or scoped records through `record_requests`
- **Right of amendment** — patients submit dedicated `amendment_requests`; grievances may reference amendments but do not replace the amendment workflow
- **Right of accounting of disclosures** — generated from `disclosure_events`
- **Right of restriction** — handled through `privacy_restrictions` with status, scope, decision, and revocation history

### 18.9 Compliance readiness

MVP 1 is built to be SOC 2 Type II auditable in Phase 2 (when we have 6+ months of evidence). HITRUST is a Phase 3 consideration if a customer demands it.

---

## 19. Compliance Mapping

This section explicitly maps every regulatory requirement to a feature in MVP 1.

### 19.1 SB 535 mapping

| Statute | Requirement | MVP 1 feature |
|---|---|---|
| § 1(1)(a) | License application content | ETC licensure wizard (§ 10.1) |
| § 1(1)(b) | 90-day approval clock | Compliance dashboard widget (§ 10.2, 10.11) |
| § 1(2) | DPHHS administrative rules | Implemented across MVP 1 per § 19.2 |
| § 1(3) | $10K initial / $5K renewal | Tracked in compliance, paid by ETC to DPHHS |
| § 2(1) | 2% net profits, Feb 1 documentation | HFAR Path B annual workflow (§ 10.12) |
| § 2(2)(b) | Path B contribution to ISP account | HFAR Path B annual workflow (§ 10.12) |
| § 3 | Insurance Premium Support Account | Contribution receipts archived (§ 10.12) |
| 33-1-102(2)(d) | Insurance code carve-out | Contractual / informational; surfaced in patient consent (§ 10.5 Stage 5) |
| 50-12-102(1) | Experimental treatment definition | Program eligibility validation (§ 9.2); ETRB review (§ 10.8) |
| 50-12-103 | Availability | Program ↔ ETC participation (§ 9.3, 10.5) |
| 50-12-104 | Patient eligibility | Eligibility screen + clinical review (§ 10.5) |
| 50-12-105 | Informed consent | Stage 5 informed consent (§ 10.5); both paths supported |
| 50-12-105(3)(b) | Digital recorded consent | Video session + topic checklist + recording (§ 10.5 Stage 5) |
| 50-12-106 | Insurance / facility effects | Patient agreement § 11(2)(f); program pricing (§ 9.2) |
| 50-12-106(4) | Provider agreements + alt-currency | Provider agreement objects; `payment_rails` abstraction in MVP 1; alt-currency activation Phase 2 |
| 50-12-107 | Heir non-liability | Patient agreement and consent text (§ 10.5 Stages 5, 6) |
| 50-12-108 | No discipline | Informational; not a feature |
| 50-12-109 | No state blocking | Informational |
| 50-12-110 | Immunity from suit | Full text included in patient agreement (§ 10.5 Stage 6) |

### 19.2 Rules mapping (MAR 2026-427.1)

| Rule | Requirement | MVP 1 feature |
|---|---|---|
| RULE 1 | Purpose | n/a |
| RULE 2 | Scope | n/a |
| RULE 3 | Application of other rules | Informational |
| RULE 4 | Definitions | Schema reflects definitions |
| RULE 5 | Application and licensing | ETC licensure wizard (§ 10.1) |
| RULE 5(2) | Change of ownership = new license | Tenant ownership-transfer flow triggers re-licensure (§ 10.1) |
| RULE 6 | Policies and procedures (20 categories) | P&P Manual module (§ 10.3) |
| RULE 6(4) | Biennial review | Automatic biennial reminder (§ 10.3) |
| RULE 7 | Administrator | Role + responsibilities; 30-day absence notice (§ 10.4) |
| RULE 7(5) | Multi-site administrator | Multi-site support (§ 10.16) |
| RULE 8 | Medical director | Role + QAPI lead + safety officer (§ 10.4, 10.9) |
| RULE 8(6) | Multi-site medical director | Multi-site support (§ 10.16) |
| RULE 9 | Staff requirements | On-site prescriber gate (§ 10.4); MT license validation |
| RULE 10 | Staff files | Staff Files (§ 10.4) |
| RULE 10(3) | Out-of-state collaborators | Out-of-state flag with same documentation (§ 10.4) |
| RULE 11 | Patient agreement | Patient agreement (§ 10.5 Stage 6) |
| RULE 12 | Patient files | Patient files (§ 10.5, schema § 14.5) |
| RULE 12(2)(b)(iii) | H&P within 12 months | H&P age validation (§ 10.5 Stage 3) |
| RULE 12(4) | 5-year retention post-discharge | Retention lock on patient files |
| RULE 13 | Treatment documentation | Treatment doc (§ 10.6) |
| RULE 13(2)–(4) | Transfer agreement, annual renewal | Transfer agreement (§ 10.7, 10.11) |
| RULE 14 | Emergency procedures | Emergency procedures + transfer (§ 10.7) |
| RULE 15 | QAPI program | QAPI program (§ 10.9) |
| RULE 15(4) | Quarterly meetings | Auto-scheduled quarterly cadence (§ 10.9) |
| RULE 15(5) | 3-year retention | Retention lock on QAPI minutes |
| RULE 16 | ETRB | ETRB workflow (§ 10.8) |
| RULE 16(2)(b),(4) | Shared board across ETCs | Multi-ETC board model (§ 10.8, schema § 14.4) |
| RULE 16(3) | No conflict | Conflict declaration per RULE 1-6-105 (§ 10.8) |
| RULE 16(5) | Composition (≥4, MD, researcher, ethicist) | Composition validation (§ 10.8) |
| RULE 16(6)(a) | Protocol approval | Protocol review workflow (§ 10.8) |
| RULE 16(6)(c) | Annual public report | Auto-generated public report (§ 10.8) |
| RULE 16(6)(d) | 5-year retention | Retention lock on ETRB records |
| RULE 16(6)(f) | Outside-ETC determination | Determination object; gates RULE 25 (Phase 2) |
| RULE 16(7) | Provisional licensure | Tenant status gate (§ 10.8) |
| RULE 17 | Adverse event reporting | AE workflow (§ 10.10) |
| RULE 17(1) | 5-day clock | AE timestamp model + counsel-selected/conservative clock basis + 5-day clock job (§ 16); UI countdown (§ 10.10) |
| RULE 17(4) | Flow to QAPI | Auto-routing to QAPI (§ 10.10, 10.9) |
| RULE 18 | Infection prevention and control | Infection control program with officer, guideline, cleaning/disinfection logs, surveillance, corrective actions (§ 10.17) |
| RULE 19 | Safety program | Safety module with hazards, adverse incidents, medication errors, falls/injuries, product expiration monitoring, and drug accountability controls (§§ 10.6, 10.17) |
| RULE 20 | Anesthesia (if applicable) | Conditional flow; not in MVP 1 default for WST-057 |
| RULE 21 | Investigational medical devices | MVP 1 device registry stubs; full cybersecurity/device consent/workflows Phase 2 |
| RULE 22 | Annual report by Jan 31 | DPHHS annual report (§ 10.13) |
| RULE 23 | Outpatient physical plant | Licensure wizard physical plant section (§ 10.1) |
| RULE 24 | Inpatient physical plant | MVP 1 inpatient profile stubs; full validation workflow Phase 2 |
| RULE 25 | Outside entity agreements | Phase 2 |

---

## 20. Non-Functional Requirements

### 20.1 Performance

- p95 page load < 2.0s on broadband, < 4.0s on 4G mobile
- p95 API response < 400ms for read, < 800ms for write
- PDF generation < 8s for patient agreement, < 15s for license application package
- Video session join < 3s

### 20.2 Availability

- 99.9% monthly uptime SLA (43.8 min downtime / month allowed)
- Maintenance windows announced 7 days in advance, off-hours Mountain Time
- Status page at status.corridor.health

### 20.3 Scalability

- MVP 1 designed to comfortably handle 10 ETCs, 5 sponsors, 1,000 active patients, 50,000 visits/year
- Architecture supports 10x without changes; 100x requires Postgres read replicas (Phase 2)

### 20.4 Accessibility

- WCAG 2.1 AA compliance on patient portal
- Keyboard navigation, screen reader support, color contrast ≥ 4.5:1
- Live caption on informed consent video sessions (Phase 2; MVP 1 has post-session transcript option)

### 20.5 Browser support

Chrome, Edge, Safari, Firefox — last two stable versions. iOS Safari 15+, Android Chrome 100+.

### 20.6 Internationalization

English only in MVP 1; i18n scaffolding present.

### 20.7 Localization (deadlines and timezones)

All deadlines display in America/Denver. Server stores UTC. Localization of dates/times based on user's browser locale; deadlines remain Mountain Time regardless.

---

## 21. Telemetry and Success Metrics

### 21.1 North-Star Metric

**Compliant patient-treatment delivered.** A treatment is "compliant" if every gate is satisfied: eligibility verified, informed consent recorded, patient agreement signed, payment processed, treatment documented, AE reporting clock honored if applicable. Counted per ETC per program.

### 21.2 Compliance health score

Per ETC, composite of:

- Active license (binary)
- All recurring obligations on track (weighted)
- All open AEs within 5-day window (weighted heavy)
- All staff licenses current
- ETRB associated and protocol-approved before any treatment delivered
- P&P manual approved and within biennial review window
- Transfer agreement current
- Last QAPI meeting < 100 days ago

Score 0–100. Surfaced on ETC dashboard, Internal Admin compliance watch, and aggregate metric to sponsor for their ETC network view.

### 21.3 Funnel metrics

**Sponsor funnel:** MSA signed → first program created → first ETC invited → first PPA signed → first patient enrolled → first treatment delivered.

**ETC funnel:** Tenant created → license application started → application submitted to DPHHS → license granted → ETRB associated → first protocol approved → first patient enrolled → first treatment delivered.

**Patient funnel:** Eligibility self-screen passed → account created → physician referral submitted → ETC accepted → informed consent recorded → patient agreement signed → first dose received.

### 21.4 Quality metrics

- AE reporting compliance: % of AEs submitted to DPHHS within 5 days
- Annual report on-time rate: % of ETCs filing DPHHS annual report by Jan 31
- HFAR on-time rate: % of ETCs filing HFAR docs by Feb 1
- Patient agreement completion time (registration → signed): median, p95
- Informed consent session quality: % of required topics marked covered

### 21.5 Event taxonomy

Events follow `domain.subject.verb` (e.g., `etc.patient.enrolled`, `sponsor.program.created`, `etrb.protocol.approved`). Routed to PostHog (or Amplitude — chosen in implementation) with tenant-scoping and PHI redaction.

---

## 22. Milestones and Release Plan

### 22.1 Pre-development

- Subprocessor BAA execution (P0 blocker)
- Final domain decisions (corridor.health DNS, subdomains)
- Clerk application setup, Supabase project, Railway project, Vercel project
- Stripe account setup with healthcare-eligible configuration
- Toolchain bootstrap via `mise install` (Node 20, pnpm 9, Postgres 15 client tools per `mise.toml`) and Docker Compose local Postgres/Redis; CI runs `mise run ci` as the consolidated pre-merge gate (§ 17.10)
- Secrets bootstrap: each developer's age public key registered in `fnox.toml` `[providers.age].recipients`; CI age pubkey registered, private half loaded into the CI secret store; non-prod values seeded into the relevant profiles (§ 18.2)

### 22.2 Sprint plan (2-week sprints, 6 sprints to MVP 1)

**Sprint 1 — Foundation.**

- Repos, CI, deployment pipelines
- Clerk auth integrated end-to-end on app and patient portals
- Supabase project with first migrations: tenants, users, tenant_memberships, tenant_relationships, support_access_grants, audit_log, file_storage_objects
- RLS policy patterns established and tested
- Empty Sponsor/ETC/Internal Admin product surfaces inside `apps/app`, plus Patient product surface inside `apps/patient`, with role-based routing
- Resend integration, basic notification dispatcher

**Sprint 2 — Sponsor and ETC onboarding.**

- Sponsor onboarding + program creation (§ 9.1, 9.2)
- ETC tenant creation
- ETC licensure wizard (§ 10.1)
- ETC ↔ Sponsor invitation and PPA flow (§ 9.3)

**Sprint 3 — ETC operational backbone.**

- P&P manual (§ 10.3)
- Staff files (§ 10.4)
- ETRB module: board entity, members, conflict declarations, protocol review (§ 10.8)
- QAPI module foundation (§ 10.9)
- Compliance dashboard (§ 10.11)

**Sprint 4 — Patient flow.**

- Patient discovery + eligibility self-screen (§ 10.5 Stage 1)
- Patient registration (Stage 2)
- Physician referral upload (Stage 3)
- ETC clinical review (Stage 4)
- Informed consent — both paths, including video recording (Stage 5)
- Patient agreement (Stage 6)
- Stripe payment (Stage 7)
- Visit scheduling (Stage 8)
- Patient portal end-to-end

**Sprint 5 — Treatment, AE, and reporting.**

- Treatment documentation (§ 10.6)
- Transfer agreement and emergency transfer (§ 10.7)
- AE workflow with 5-day clock (§ 10.10)
- DPHHS annual report (§ 10.13)
- HFAR Path B annual flow (§ 10.12)
- Grievance workflow (§ 10.14)
- Sponsor de-identified aggregates and reports (§ 9.4, 9.6)

**Sprint 6 — Hardening and launch.**

- End-to-end testing with WinSanTor team
- Pen test
- HIPAA readiness review by counsel
- Performance and accessibility audits
- Internal Admin portal completion
- Documentation, runbooks, on-call rotation
- Soft launch with WinSanTor's launch ETC

### 22.3 Launch criteria

MVP 1 ships when:

- All Compliance Mapping (§ 19) features are live and tested
- All subprocessor BAAs executed
- WinSanTor's launch ETC has passed end-to-end UAT
- First protocol (WST-057) has been processed through ETRB review and approved
- Pen test report has zero high-severity findings
- Audit log proves immutability
- Backup and DR drills passed
- 99.9% uptime sustained for 30 days in staging

### 22.4 Post-launch (first 90 days)

- Iterate on patient flow based on first cohort feedback
- Phase 2 prioritization based on actual usage patterns
- Begin SOC 2 evidence collection
- Onboard second sponsor and second ETC

---

## 23. Open Questions and Explicit Decisions

These are either resolved MVP guardrails or remaining decisions that do not block MVP 1 architecture.

1. **"Net annual profits" definition.** SB 535 § 2 leaves this undefined. Decision pending DPHHS guidance or counsel opinion. MVP 1 supports both GAAP and tax-basis interpretations side-by-side.
2. **ETRB-as-a-service business decision.** Architecture supports it; operating decision deferred to Phase 2+.
3. **Direct DPHHS API integration.** RULE 22(1) references DPHHS's electronic licensing system. MVP 1 generates DPHHS-formatted PDFs; ETC files via the system. If DPHHS exposes an API, we integrate.
4. **Sponsor data sharing default.** Resolved for MVP 1: sponsor sees aggregate data and, if the PPA allows it, de-identified line-level safety/AE records only. Identified sponsor PHI access is Phase 2/8 and requires explicit patient data-sharing consent, revocation, disclosure accounting, and new RLS tests.
5. **Video provider final selection.** Daily.co vs. alternatives. Decision in Sprint 4 implementation.
6. **E-signature provider final selection.** HelloSign vs. Stripe Identity vs. Documenso. Decision in Sprint 2 implementation.
7. **Public ETC slug strategy.** Per-ETC subdomain (`etc-name.corridor.health`) vs path-based (`corridor.health/etcs/etc-name`). Subdomain is cleaner; pricing on Cloudflare for wildcard + per-ETC certs needs validation.
8. **Search engine upgrade trigger.** Resolved for MVP 1: Postgres FTS. OpenSearch or Algolia is Phase 2 only if pageload/search metrics suffer and a HIPAA/subprocessor review clears the vendor.
9. **Payment installments.** Default off for MVP 1 unless WinSanTor explicitly requests it before Sprint 4. Schema can support Stripe Subscriptions, but the baseline payment flow is one-time USD card/ACH.
10. **Brand and aesthetic system.** Out of this PRD. Brand work runs in parallel with engineering.
11. **RULE 17 adverse-event clock basis.** Counsel must decide whether the 5-day report clock runs from occurrence, detection, ETC awareness, formal report creation, or another legally defensible basis. Until resolved, Corridor computes warning clocks from the earliest known timestamp and stores the formal selected `clock_basis` once counsel decides.

---

## 24. Appendices

### 24.1 Glossary

- **ETC** — Experimental Treatment Center, the new licensed facility class created by SB 535
- **ETRB** — Experimental Treatment Review Board, RULE 16's protocol-and-safety review body
- **HFAR** — Health Freedom and Access Requirement, SB 535 § 2's 2%-of-net-profits obligation
- **QAPI** — Quality Assurance and Performance Improvement program, RULE 15
- **PPA** — Program Participation Agreement, the contract between a sponsor and an ETC to deliver a program
- **MSA** — Master Services Agreement, the contract between Corridor and a sponsor or ETC tenant
- **BAA** — Business Associate Agreement, HIPAA-required contract between a CE and BA
- **DPHHS** — Montana Department of Public Health and Human Services
- **PHI** — Protected Health Information per HIPAA
- **PII** — Personally Identifiable Information
- **PRO** — Patient-Reported Outcome
- **AE** — Adverse Event per RULE 17

### 24.2 Document references

- SB 535 (69th Montana Legislature, 2025) — full text in source PDF
- MAR Notice 2026-427.1 (April 10, 2026) — full text in source PDF
- 50-12-102, 50-12-104, 50-12-105, 50-12-110, 33-1-102, 50-5-101, 50-5-203, 1-6-105 MCA — referenced throughout

### 24.3 Stakeholders

- **Product:** Gabriel Viggers (Founding Product)
- **Engineering:** TBD — lead engineer hire is concurrent with this PRD's review
- **Counsel:** TBD — biotech / health IT counsel
- **Design partner sponsor:** WinSanTor — Stanley Kim (CEO), Gabriel Viggers (Chief of Staff)
- **Design partner ETC:** TBD pending licensure
- **Compliance / regulatory:** Angela (pharmacovigilance contact)

---

*End of PRD v1.0.*
