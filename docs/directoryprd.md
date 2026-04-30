# Lewis Health — Public Patient Directory

**Product Requirements Document — Build-Ready Specification**

| | |
|---|---|
| **Document version** | 1.1 |
| **Author** | Gabriel Viggers, Founding Product |
| **Status** | Build-ready spec for engineering and design execution |
| **Last updated** | April 29, 2026 |
| **Scope** | `lewis.health` (public patient directory only). Out of scope: `app.lewis.health`, `patient.lewis.health`. |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement & Strategic Context](#2-problem-statement--strategic-context)
3. [Hard Constraints (Non-Negotiable)](#3-hard-constraints-non-negotiable)
4. [Personas & Jobs-to-be-Done](#4-personas--jobs-to-be-done)
5. [Persona × Intent Matrix](#5-persona--intent-matrix)
6. [Voice & Copy Constraints](#6-voice--copy-constraints)
7. [Current Implementation State (What Exists Today)](#7-current-implementation-state-what-exists-today)
8. [Information Architecture](#8-information-architecture)
9. [Site Map (Complete Route Inventory)](#9-site-map-complete-route-inventory)
10. [Navigation: TopNav, Footer, Cross-Linking](#10-navigation-topnav-footer-cross-linking)
11. [Homepage — Detailed Specification](#11-homepage--detailed-specification)
12. [Patient Funnel — End-to-End](#12-patient-funnel--end-to-end)
13. [Search — Detailed Specification](#13-search--detailed-specification)
14. [Conditions Index & Detail — Detailed Specification](#14-conditions-index--detail--detailed-specification)
15. [Programs (Treatment Detail) — Detailed Specification](#15-programs-treatment-detail--detailed-specification)
16. [ETCs Index & Profile — Detailed Specification](#16-etcs-index--profile--detailed-specification)
17. [Eligibility Self-Screen — Detailed Specification](#17-eligibility-self-screen--detailed-specification)
18. [Connect Handoff & Confirmation — Detailed Specification](#18-connect-handoff--confirmation--detailed-specification)
19. [Patient Education Pages](#19-patient-education-pages)
20. [B2B Track — Clinicians (`/for-clinicians`)](#20-b2b-track--clinicians-for-clinicians)
21. [B2B Track — Sponsors (`/for-sponsors`)](#21-b2b-track--sponsors-for-sponsors)
22. [B2B Track — ETC Operators (`/for-etcs`)](#22-b2b-track--etc-operators-for-etcs)
23. [Shared Platform Page (`/platform`)](#23-shared-platform-page-platform)
24. [Company Pages (`/about`, `/feedback`)](#24-company-pages-about-feedback)
25. [Legal Pages (`/privacy`, `/terms`, `/cookies`)](#25-legal-pages-privacy-terms-cookies)
26. [SEO Infrastructure](#26-seo-infrastructure)
27. [Content Seed Data — Required at Launch](#27-content-seed-data--required-at-launch)
28. [Technical Architecture & Bundle Discipline](#28-technical-architecture--bundle-discipline)
29. [Accessibility Requirements](#29-accessibility-requirements)
30. [Analytics & Telemetry](#30-analytics--telemetry)
31. [Compliance & Counsel Review Gates](#31-compliance--counsel-review-gates)
32. [Build Plan — Prioritized Work Order](#32-build-plan--prioritized-work-order)
33. [Acceptance Criteria & Launch Gates](#33-acceptance-criteria--launch-gates)
34. [Open Questions](#34-open-questions)
- [Appendix A — Voice cheat sheet for copy team](#appendix-a--voice-cheat-sheet-for-copy-team)
- [Appendix B — Acceptance criteria quick checklist (pre-launch)](#appendix-b--acceptance-criteria-quick-checklist-pre-launch)

---

## 1. Executive Summary

Lewis Health is the public, anonymous, SEO-critical patient directory for Montana's Experimental Treatment Center regime under SB 535 (2025) + MAR 2026-427.1 (April 2026). It is one of two frontend products in the Lewis monorepo. The other, `app.lewis.health`, is the authenticated staff console; PHI flows through a third surface, `patient.lewis.health`. This PRD covers only `lewis.health` — the directory.

The directory's purpose is threefold:

1. Connect patients to investigational treatments available at licensed Montana ETCs.
2. Serve as a B2B funnel for sponsors and ETC operators considering the Lewis platform.
3. Provide treating physicians with clinical legitimacy signals and program briefs to support patient referrals.

The directory is currently partially implemented. A homepage, browse/catalog, treatment detail, ETC profile, eligibility self-screen, connect handoff, working search page, and conditions index/detail surfaces are functional or implemented locally pending PR. B2B funnels (`/for-sponsors`, `/for-etcs`), patient education, legal pages, and the canonical FAQ remain placeholder.

This PRD documents what exists, what needs to be built, what needs to be tweaked, and what needs to be removed, in a single end-to-end specification that engineering, design, and copy can execute against.

---

## 2. Problem Statement & Strategic Context

### 2.1 The directory's role in the Lewis platform

Patient acquisition is the bottleneck for the entire three-sided Lewis platform thesis. Drug manufacturers cannot directly market unapproved drugs to consumers under FDA pre-approval marketing rules. ETCs are clinical operators, not marketing organizations. State regulators do not maintain a consumer-facing directory of programs offered. The directory is the only legal patient-acquisition surface available for Montana RTT.

It is also the most visible artifact of the Lewis brand. The first time a journalist, a regulator, a sponsor's BD lead, or a treating physician encounters Lewis, they encounter the directory. Its credibility, design quality, and editorial judgment establish the brand's posture in every other room.

### 2.2 What the directory must accomplish

- **For patients:** answer "is there a real treatment for my condition that I can actually access in Montana, where, at what cost, and how fast" — without requiring an account to find out.
- **For treating clinicians:** provide clinical depth (mechanism, phase, evidence citations) and a downloadable program brief suitable for chart review and case conference.
- **For biotech sponsors:** explain the SB 535 regulatory framework, both manufacturer-ETC paths (partner-ETC vs. operate-own-ETC), the operating platform's modules, and a clear path to a BD conversation.
- **For ETC operators:** explain how Lewis covers every RULE compliance surface, how the ETRB workflow specifically works, what HFAR Path B looks like in practice, and a path to platform onboarding.

### 2.3 What the directory is not

- Not a clinic, not a manufacturer, not a referral-fee broker.
- Not a clinical-trial registry (clinicaltrials.gov is the canonical registry; Lewis is the access layer for commercial RTT under SB 535).
- Not a marketing site for any specific sponsor or ETC.
- Not a place where PHI flows. All PHI handling lives on `patient.lewis.health`.

### 2.4 Sponsor & Condition Rollout Strategy

The directory is built to scale across many sponsors and many conditions, but launch sequencing is deliberately narrow. A "slow sniper" rollout — perfect the operating model with the first sponsor before adding the second; perfect with two sponsors before opening to a broader bench.

**Phase 1 — WST-057 / WinSanTor (live at MVP 0).**
The launch program is WST-057®, an investigational topical small-molecule from WinSanTor in Phase 2 for peripheral neuropathy. WST-057 is listed across four indications:

- Diabetic peripheral neuropathy
- Chemotherapy-induced peripheral neuropathy
- HIV-induced peripheral neuropathy
- Idiopathic peripheral neuropathy

Each indication gets its own `/conditions/:slug` page; all four condition pages link to the same `/programs/wst-057` conversion page. The four conditions cover the dominant SEO long-tail for "peripheral neuropathy experimental treatment Montana" queries while accurately representing the program's labeled indications. **Big Sky ETC** in Bozeman is the launch ETC partner. Phase 1 success criteria: end-to-end patient enrollment, ETRB approval, AE reporting under the 5-day clock, HFAR Path B annual workflow completed, DPHHS annual report filed by January 31.

**Phase 2 — Psilocybin for PTSD (next sponsor onboard).**
After Phase 1 has run end-to-end, the second sponsor onboards: Psilocybin for PTSD. Patient framing on the directory is condition-first — `/conditions/ptsd` is the primary surface, with the Psilocybin program page as the conversion. Sponsor and ETC partners TBD. The PTSD-Psilocybin pairing was selected as the Phase 2 candidate because (a) it is sponsor-type-different from WST-057 (different therapeutic area, different operational profile, different ETRB review pattern), so onboarding it stress-tests the platform's generality, and (b) the patient population is large and underserved in standard-of-care.

**Phase 3 — Open onboarding to other small biotech sponsors.**
Once Phases 1 and 2 have demonstrated the operating model across two distinct sponsor types, the platform opens to other small biotech sponsors on a per-program basis. Each new program follows the same path: ETRB approval at a licensed Montana ETC, listing on `/conditions/:slug` and `/programs/:slug`, integration into the operating platform.

**What this means for the directory PRD.**
At MVP 0 launch, the live data is one program (WST-057) listed across four condition pages, with a single launch ETC (Big Sky). At Phase 2, that becomes two programs across at least five condition pages, with at least two ETCs. The IA, search, and analytics surfaces in this PRD are designed to scale to many sponsors without restructuring; only data seeding and content authoring expand. Long-tail conditions outside the active sponsor pipeline (ALS, MS, rare cancers, autoimmune, etc.) ship as "Not currently offered" stubs per § 14.2 State C — present in the conditions index for SEO and graceful fallback, but not actively marketed.

---

## 3. Hard Constraints (Non-Negotiable)

These constraints govern every product decision in the directory. Violations are blockers; deviation requires explicit re-specification.

1. **Anonymous-first.** No account required to browse. Clerk SDK is lazy-loaded only on `/connect/*` routes and `/eligibility/*` routes that may surface auth post-conversion.
2. **No PHI in URLs, analytics, logs, or page copy.** Anonymous eligibility self-screens use opaque tokens stored in `localStorage`.
3. **No marketing patterns aimed at patients.** No urgency, no gamification, no testimonial-heavy social proof, no "limited time," no countdown timers, no growth-hacking.
4. **Bundle budget.** Above-the-fold homepage JS < 120KB. Below-the-fold lazy-loads. Clerk SDK is excluded from above-the-fold and excluded from any unauthenticated patient-discovery route.
5. **Compliance is the spec.** Every feature traces to SB 535 § or a MAR RULE. Every regulated claim cites the source.
6. **Lewis never charges patients.** Patients pay ETCs directly. Insurance does not cover RTT under SB 535.
7. **WCAG 2.1 AA.** Patient-facing surfaces target this — keyboard navigation, screen reader announcements, no auto-advance on radio inputs, focus management on route changes.
8. **Public-read RLS posture.** Directory backend access is restricted to `/v1/public/*` endpoints plus two semi-authenticated endpoints (`/v1/patient/me/context`, `/v1/patient/account/link-anonymous-screen`). No service-role queries from the directory bundle.
9. **Independence framing.** The directory is independent of any sponsor or ETC. Footer trust signal must say so on every page.

---

## 4. Personas & Jobs-to-be-Done

### 4.1 Persona 1 — Patient (Primary)

**Archetype:** Adult Montana resident or out-of-state patient with a serious medical condition who has evaluated standard-of-care options. May arrive via Google search ("ALS experimental treatment Montana", "WST-057 trial", "diabetic neuropathy clinical trial"), via word-of-mouth from a treating physician, or via a forum/Reddit link from another patient. May be the patient themselves, or a desperate spouse, parent, or adult child researching on their behalf.

**Emotional state:** exhausted, often comparing against clinicaltrials.gov, often skeptical of healthcare branding.

**Wants:** confirmation that a real treatment exists for the patient's condition that can actually be accessed; geographic feasibility; cost transparency; clinical legitimacy signals (license #, medical director, ETRB existence).

**Decision triggers:** condition match, eligibility fit, geographic feasibility, cost transparency, license and credential verification.

**Sub-types:**

- Self-directed adult patient
- Caregiver researching on behalf of a patient
- Treating physician's referred patient

### 4.2 Persona 2 — Treating Clinician / Referring Physician

**Archetype:** A neurologist, oncologist, primary care physician, or specialist whose patient brings up Lewis at an appointment, or who arrives looking for options before referring.

**Wants:** clinical depth — mechanism of action, phase, published evidence with citations; contact for the ETC's medical director; downloadable program one-pager for chart review.

**Decision triggers:** evidence quality, ETRB approval reference, medical director credentials, FDA pre-approval marketing posture clarity (so they know their licensing board considers this acceptable per SB 535 § 12 / 50-12-108).

**Behavior:** will not submit a connect form; refers patients and may want to call the ETC directly.

### 4.3 Persona 3 — Biotech Sponsor / Drug Manufacturer

**Archetype:** Corporate development VP, head of medical affairs, or regulatory lead at a Phase 1+ biotech. Hits the site after a Montana ETC inquired about adding their compound, after seeing Lewis at a conference, or after a competitor got listed.

**Wants:** SB 535 regulatory framework explanation; how a program gets listed (process, timeline, requirements); the operating platform's modules; the business model and pricing; BAA/HIPAA posture; a path to a BD conversation.

**Voice they respond to:** corporate-respectful, document-heavy, citation-grounded, peer-level.

### 4.4 Persona 4 — ETC Operator

**Archetype:** Clinic operator, medical director, or clinical research coordinator at a Montana facility considering applying for an ETC license, or already licensed and choosing whether to use Lewis as their operating platform.

**Wants:** practical operations detail on the ETC license process; what Lewis does for them across the 25 RULE compliance surface; ETRB workflow specifics; HFAR Path B mechanics; pricing; reference to design partner / who else is on the platform.

**Voice they respond to:** operations-focused, RULE-number citations, audit-readiness emphasis.

---

## 5. Persona × Intent Matrix

The five top jobs-to-be-done per persona, mapped to the directory pages that serve them.

| Persona | JTBD 1 | JTBD 2 | JTBD 3 | JTBD 4 | JTBD 5 |
|---|---|---|---|---|---|
| **Patient** | Confirm a treatment exists for my condition in Montana → `/conditions/:slug` → `/programs/:slug` | Decide if I'm likely eligible → `/eligibility/:programSlug` | Understand cost and what insurance does/doesn't cover → `/programs/:slug` cost panel + `/faq` | Verify this is a real licensed clinic → `/etcs/:slug` (license #, medical director, public docs) | Start a connection → `/connect/:programSlug` |
| **Clinician** | Confirm clinical legitimacy → `/programs/:slug` Evidence panel | Get a downloadable brief → `/programs/:slug/brief.pdf` | Reach the ETC's medical director → `/etcs/:slug` | Understand FDA pre-approval marketing posture → `/for-clinicians` | Refer my patient → `/programs/:slug` clinician CTA → `/connect/:programSlug?referrer=clinician` |
| **Sponsor** | Understand the SB 535 framework → `/for-sponsors` regulatory section | Understand listing process → `/for-sponsors` listing-process section | Understand the operating platform → `/platform` | Understand business model and pricing → `/for-sponsors` business-model section | Reach a BD contact → sponsors@lewis.health mailto |
| **ETC Operator** | Understand the ETC license process → `/for-etcs` license-process section | See Lewis covers every RULE → `/for-etcs` compliance-surface table | Understand pricing → `/for-etcs` pricing section | See design partner / who else is on the platform → `/for-etcs` design-partner block | Start a conversation → operators@lewis.health mailto |

---

## 6. Voice & Copy Constraints

### 6.1 Lewis voice characteristics

- Plain, calm, dignified language. Adult tone.
- Serif headlines with exactly one italic word in accent color, used sparingly for emphasis.
- No exclamation points. No emoji.
- No "discover," "unlock," "transform," "empower," or similar marketing verbs.
- No phrases like "your journey," "take control," "join thousands of patients."
- Use "you" sparingly. Lead with the noun, not the second person.
- Cite the law by name (SB 535, MAR 2026-427.1, RULE 16(6)(d)) when relevant — it's a trust signal, not legalese.
- Never use urgency manipulation ("limited time," "spots filling up," "act now").
- Never use testimonial-heavy social proof.

### 6.2 In-voice phrases (already on the site, validate against these)

- "Find experimental treatments available in Montana."
- "Some treatments don't exist anywhere else."
- "How Montana's program actually works."
- "Lewis never charges patients."
- "Three steps. No account required to browse."

### 6.3 Out-of-voice phrases (forbidden)

- "Take control of your health journey"
- "Join thousands of patients"
- "Limited spots available"
- "Discover breakthrough treatments"
- "Get matched to your perfect treatment"
- "Don't wait — apply today"

### 6.4 Counsel review marker

Where copy makes a regulated factual claim that has not yet been verified by counsel, use the marker `[COUNSEL REVIEW]` inline in the source. These markers must not ship to production. A pre-launch lint check should fail the build if `[COUNSEL REVIEW]` appears in any committed copy.

---

## 7. Current Implementation State (What Exists Today)

This section is the canonical record of the directory as of the date of this PRD. Engineering should treat this as the baseline; everything else in the PRD is build, tweak, or remove.

### 7.1 Technical foundation

- Vite + React SPA at `lewis.health`.
- Bundle limited to `/v1/public/*` API endpoints; Clerk lazy-loaded only inside `/connect` flow.
- Above-the-fold homepage JS budget: 120KB.
- Skip-to-main link present.
- Programmatic focus reset on every route change.
- `localStorage` token for anonymous eligibility screens (key: `lewis:eligibility:<slug>`).
- `robots.txt` disallows `/eligibility/*` and `/connect/*`.
- `sitemap.xml` indexes: `/`, `/browse`, `/conditions`, nine `/conditions/:slug` entries, `/etcs`, `/how-it-works`, `/faq`, `/for-etcs`, `/for-sponsors`, `/privacy`, `/terms`, `/cookies`, `/programs/wst-057`, `/etcs/big-sky`.

### 7.2 Global chrome

- **AnnouncementStrip** (top): Montana flag + "Lewis Health is just getting started. New programs and ETCs are added as Montana licenses them." + "Get notified" CTA. CTA is currently disabled — email signup endpoint not wired.
- **TopNav** (sticky, 80px): Wordmark left ("Lewis · . · health" with italic "health"). Right: "Browse Treatments" outline pill + magnifier icon → `/search` filled accent square.
- **Footer**: Montana flag + wordmark · links: Privacy, Terms, Share Feedback, For ETCs, For Sponsors.

### 7.3 Pages — implementation status

| Route | Status | Notes |
|---|---|---|
| `/` | Implemented | Hero, ProblemSection, HowItWorks, FeaturedTreatments, ForPhysicians, FaqSection (15 Qs), BeginningSection. Search submits to `/search?q=` (broken target). Several CTAs disabled. |
| `/browse` | Implemented | Filter rail (checkboxes only, not wired). Sort dropdown. Grid of program cards. 1 live program (WST-057), 5 "Coming soon" cards. |
| `/programs/:slug` | Implemented for WST-057 | Split layout. Panels for About, Who-this-is-for, Where-to-access, How-enrollment-works, Cost. Two `[COUNSEL REVIEW]` markers (evidence link, cost). |
| `/etcs/:slug` | Implemented for big-sky | SVG map placeholder. Panels for About, Treatments offered, Location, Public documents, Medical Director. |
| `/eligibility/:programSlug` | Implemented for WST-057 | 4 questions, progress dots, no auto-advance, anonymous token. |
| `/eligibility/:programSlug/result` | Implemented | Pass/fail branches with "Connect" or "Reach out anyway" CTAs. |
| `/connect/:programSlug` | Implemented | Lead form with name, email, phone, best time to contact, brief situation. POST stubbed. |
| `/connect/confirmed` | Implemented | Confirmation page with checklist of what to prep. |
| `/search` | ✅ Implemented (v0.0.7.0) | Surface 1 (Radix Dialog overlay, lazy-loaded, debounced live-suggest, combobox/listbox a11y) + Surface 2 (results page, three states, `noindex, follow` on query results, canonical strips `?q=`). Sectioned response (Conditions → Treatments → ETCs) enforced server-side. |
| `/conditions` | 🟡 Implemented locally (Sprint 2 PR pending) | API-driven conditions index grouped by state, alphabetized within each section, ItemList JSON-LD, unit/a11y coverage, and Playwright E2E coverage. |
| `/conditions/:slug` | 🟡 Implemented locally (Sprint 2 PR pending) | Full three-state condition detail: live program cards, standard-of-care framing where applicable, plain-language explainers, MedicalCondition JSON-LD, coming-soon disabled notify CTA, and not-offered three-path panel (ClinicalTrials.gov, treating physician, disabled notify). |
| `/etcs` | Placeholder | Index of all licensed ETCs. |
| `/etcs/:slug/manual` | Placeholder | Public P&P manual rendering (RULE 6(1)). |
| `/etcs/:slug/etrb-report` | Placeholder | ETRB annual public report (RULE 16(6)(c)). |
| `/etcs/:slug/ae-summary` | Placeholder | Recommendation: remove this route. Fold into `/etrb-report` per RULE 16(6)(c)(ii). |
| `/how-it-works` | Placeholder | Patient education page. |
| `/faq` | Placeholder | Currently labeled "homepage FAQ is canonical" — incorrect, will be inverted. |
| `/for-etcs` | Placeholder | B2B funnel — full content draft in this PRD. |
| `/for-sponsors` | Placeholder | B2B funnel — full content draft in this PRD. |
| `/feedback` | Placeholder | Feedback form. |
| `/privacy` | Placeholder | Counsel-required. |
| `/terms` | Placeholder | Counsel-required. |
| `/cookies` | Placeholder | May fold into `/privacy`. |
| `*` (NotFound) | Implemented | 404 page. |

### 7.4 Data seed (current — v0.0.8.0 local)

- 1 live program: **WST-057®** (WinSanTor, topical, Phase 2, peripheral neuropathy, Bozeman MT) — linked to all 4 PN indications via the `program_conditions` join.
- 1 live ETC: **Big Sky ETC** (Bozeman, License ETC-2025-001, Dr. Helena Marsh MD) — connected to WinSanTor via an active PPA `tenant_relationships` row that drives the ETC's catalog-term aggregation in `search_index_documents`.
- 9 conditions in the new `conditions` table per § 27.3:
  - Live: `diabetic-peripheral-neuropathy`, `chemotherapy-induced-peripheral-neuropathy`, `hiv-induced-peripheral-neuropathy`, `idiopathic-peripheral-neuropathy` — all linked to WST-057.
  - Coming-soon: `ptsd` (Phase 2 sponsor onboarding next per § 2.4).
  - Not-offered: `als`, `multiple-sclerosis`, `rare-cancers`, `autoimmune-diseases` — long-tail SEO + graceful fallback per § 14.2 State C.
- All seed data is FORCE RLS'd; the new `app.role = 'directory_anonymous'` context is the only path that can read the published catalog.
- The previous frontend condition scaffold has been replaced by the public conditions API. Programs and ETC profiles remain on the local catalog until their later API slices.

### 7.5 Disabled CTAs (must be wired or removed before public launch)

- AnnouncementStrip "Get notified" button
- BeginningSection email signup
- ForPhysicians "Browse the clinical reference"
- `/programs/:slug` "Used Lewis? Share Feedback"
- `/browse` bottom email signup

---

## 8. Information Architecture

### 8.1 IA principles

- **Patient mental model is condition-first.** Patients arrive thinking about their condition, not about a specific drug. Drug names are destinations, not entry points. Every primary patient surface — homepage, TopNav, search, browse — must privilege the condition path. Drug-first paths exist for clinicians and sophisticated users but are secondary in the patient funnel.
- **Patient funnel is the spine.** Every primary navigation decision is made through the lens of a patient arriving from a Google search for a condition.
- **B2B tracks are parallel branches.** Clinician, sponsor, and ETC tracks branch off the spine and do not share visual real estate with the patient flow.
- **Browse paths are duplicated by mental model.** Patients who think in conditions ("does anything exist for ALS?") and patients who think in drugs ("is WST-057 available?") both have a primary-nav entry point.
- **Fail states are designed.** Empty results, ineligibility, condition-not-found — each has its own respectful, useful page.
- **Aggressive pruning.** A directory that has 8 pages a patient actually reads beats one with 40 pages they ignore. Every page must justify its existence by serving a JTBD that no other page serves.

### 8.2 IA map (high-level structure)

```
PATIENT SPINE (primary nav)
  /                        → Hero + featured conditions + featured treatments + how-it-works
  /conditions              → Conditions index (disease-first mental model — PRIMARY)
  /conditions/:slug        → Per-condition page (primary patient waypoint + SEO destination)
  /browse                  → Catalog with filters (drug-first mental model — secondary, power-user)
  /programs/:slug          → Treatment detail (conversion page)
  /etcs                    → Licensed ETC index
  /etcs/:slug              → ETC profile (legitimacy signal)
  /search                  → Cross-content search

PATIENT CONVERSION FLOW (unindexed)
  /eligibility/:programSlug          → Anonymous self-screen
  /eligibility/:programSlug/result   → Pass/fail with graceful paths
  /connect/:programSlug              → Lead form + handoff
  /connect/confirmed                 → Confirmation + checklist

PATIENT EDUCATION (footer)
  /how-it-works            → SB 535 explainer
  /faq                     → Canonical extended FAQ

B2B TRACK 1 — CLINICIAN
  /for-clinicians          → Peer-level framing + brief library
  /programs/:slug/brief.pdf → Downloadable program brief

B2B TRACK 2 — SPONSOR
  /for-sponsors            → Regulatory + listing + business model

B2B TRACK 3 — ETC OPERATOR
  /for-etcs                → Compliance + ETRB + pricing

SHARED CONVERGENCE
  /platform                → Operating platform overview (sponsor + ETC)

COMPANY (footer)
  /about                   → Founding story, leadership, contact
  /feedback                → Multi-persona feedback intake

LEGAL (footer)
  /privacy
  /terms
  /cookies (may fold into /privacy)

ETC PUBLIC DOCUMENTS (linked from /etcs/:slug)
  /etcs/:slug/manual         → P&P manual (RULE 6(1))
  /etcs/:slug/etrb-report    → ETRB annual public report (RULE 16(6)(c))
```

---

## 9. Site Map (Complete Route Inventory)

```
lewis.health/
│
├── PATIENT SPINE — primary nav, indexed, SEO-critical
│   │
│   ├── /                                    [EXISTS — restructure]
│   │   H1: Find experimental treatments available in *Montana*.
│   │   Purpose: Hero; primary search; featured conditions (top carousel) +
│   │     featured treatments (secondary carousel); abridged FAQ.
│   │   Nav: primary (wordmark links here)
│   │
│   ├── /conditions                          [IMPLEMENTED LOCALLY — Sprint 2]
│   │   H1: Conditions with experimental treatments in *Montana*.
│   │   Purpose: Primary patient browse surface AND highest-value SEO
│   │     landing surface; alphabetical/grouped index of every condition
│   │     with a current or expected program. Per § 14.0, the condition
│   │     page is the door; the program page is the conversion.
│   │   Nav: primary (FIRST in TopNav, before "Browse Treatments")
│   │
│   ├── /conditions/:slug                    [IMPLEMENTED LOCALLY — Sprint 2]
│   │   H1: Experimental treatments for {condition} in *Montana*.
│   │   Purpose: Primary patient waypoint AND highest-value SEO destination
│   │     for "{condition} experimental treatment Montana" queries. Lists
│   │     programs (1:N), explains standard-of-care framing per
│   │     RULE 12(2)(f), graceful fail for not-yet-offered conditions.
│   │     Per § 14.0, content depth on this page matches or exceeds
│   │     /programs/:slug; long-tail SEO volumes are 10–50x higher than
│   │     drug-name queries (per § 26.2).
│   │   Nav: indexed only — entered via search engines, /conditions, or the
│   │     homepage FeaturedConditions carousel
│   │
│   ├── /browse                              [EXISTS — keep, wire filters]
│   │   H1: Browse experimental treatments available in *Montana*.
│   │   Purpose: Secondary, drug-first / power-user catalog surface for
│   │     clinicians and sophisticated browsers who already know the drug
│   │     name. /conditions is the primary patient browse surface; /browse
│   │     exists for browsing by attribute (treatment form, manufacturer,
│   │     location, phase). Visually subordinate in TopNav (outline pill,
│   │     right of "Conditions" plain-text link).
│   │   Nav: primary ("Browse Treatments" — secondary to "Conditions")
│   │
│   ├── /programs/:slug                      [EXISTS — add Evidence + brief.pdf]
│   │   H1: {Drug name}® — *Available now* in Montana.
│   │   Purpose: Conversion page. Patient learns what it is, who it's for,
│   │     where it's offered, what it costs, how to enroll. Clinician gets
│   │     evidence + downloadable brief.
│   │   Nav: indexed only — entered via search engines, /browse, /conditions/:slug
│   │
│   ├── /programs/:slug/brief.pdf            [NEW — server-rendered PDF]
│   │   Purpose: Clinician one-pager. Mechanism, phase, evidence citations,
│   │     ETRB approval, ETC contact, eligibility criteria.
│   │   Nav: linked from /programs/:slug "Download clinical brief" CTA.
│   │
│   ├── /etcs                                [REWRITE — placeholder today]
│   │   H1: Licensed Experimental Treatment Centers in *Montana*.
│   │   Purpose: List of every licensed ETC in Montana. Sourced from DPHHS
│   │     Bounds when ETC license type goes live in mt-reports.com (mid-late
│   │     2026); manual entry until then.
│   │   Nav: primary
│   │
│   ├── /etcs/:slug                          [EXISTS — keep, add MD direct line]
│   │   H1: {ETC name} — Bozeman, *Montana*.
│   │   Purpose: ETC profile. License #, medical director credentials,
│   │     ETRB existence, programs offered, public documents.
│   │   Nav: indexed only — entered via /etcs, /programs/:slug, search
│   │
│   ├── /etcs/:slug/manual                   [REWRITE — placeholder today]
│   │   H1: Policies and procedures — {ETC name}.
│   │   Purpose: Public P&P manual per RULE 6(1).
│   │   Nav: linked from /etcs/:slug, indexed.
│   │
│   ├── /etcs/:slug/etrb-report              [REWRITE — placeholder today]
│   │   H1: ETRB annual public report — {ETC name}.
│   │   Purpose: Annual public report per RULE 16(6)(c) including aggregate
│   │     safety outcomes per RULE 16(6)(c)(ii) (formerly proposed as
│   │     /ae-summary; consolidated here).
│   │   Nav: linked from /etcs/:slug, indexed.
│   │
│   └── /search                              [IMPLEMENTED — v0.0.7.0]
│       H1: Search Lewis.
│       Purpose: Cross-content search — programs, conditions, ETCs.
│       Nav: primary (magnifier icon).
│
├── PATIENT CONVERSION FLOW — unindexed
│   │
│   ├── /eligibility/:programSlug            [EXISTS — keep, refine fail copy]
│   │   H1: See if you're likely a fit for *{drug name}*.
│   │   Purpose: Anonymous self-screen. localStorage token. No PHI.
│   │   Nav: unindexed (robots.txt disallow ✓).
│   │
│   ├── /eligibility/:programSlug/result     [EXISTS — keep, expand fail branch]
│   │   H1: Based on what you shared, you *may* be a fit. (or "may not")
│   │   Purpose: Pass/fail result. Pass routes to /connect; fail offers
│   │     three graceful paths (reach out anyway, browse other treatments,
│   │     search clinicaltrials.gov).
│   │   Nav: unindexed.
│   │
│   ├── /connect/:programSlug                [EXISTS — keep, verify Clerk gating]
│   │   H1: Connect with the ETC offering *{drug name}*.
│   │   Purpose: Lead-form handoff. Anonymous submission accepted; account
│   │     creation post-conversion only.
│   │   Nav: unindexed (robots.txt disallow ✓).
│   │
│   └── /connect/confirmed                   [EXISTS — keep]
│       H1: We've connected you with *{ETC name}*.
│       Purpose: Confirmation + 4-item prep checklist.
│       Nav: unindexed.
│
├── PATIENT EDUCATION — footer
│   │
│   ├── /how-it-works                        [REWRITE — placeholder today]
│   │   H1: How Montana's *Right to Try* program works.
│   │   Purpose: SB 535 explainer; what an ETC is; consent process; patient
│   │     rights; cost framing; AE process.
│   │   Nav: footer.
│   │
│   └── /faq                                 [REWRITE — canonical FAQ home]
│       H1: Frequently asked questions.
│       Purpose: Canonical extended FAQ. Homepage shows abridged top 5;
│       /faq is the canonical destination including caregiver, clinician,
│       sponsor, ETC questions.
│       Nav: footer.
│
├── B2B TRACK 1 — CLINICIAN
│   │
│   └── /for-clinicians                      [NEW]
│       H1: For treating physicians considering an *experimental* treatment.
│       Purpose: Peer-level framing; how to refer; brief library; FDA
│       pre-approval marketing posture explainer (SB 535 § 12 / 50-12-108);
│       contact.
│       Nav: secondary nav drawer.
│
├── B2B TRACK 2 — SPONSOR
│   │
│   └── /for-sponsors                        [REWRITE — placeholder today]
│       H1: List a program with *Lewis*.
│       Purpose: Regulatory framework; two paths (partner-ETC vs. own-ETC);
│       operating platform overview; listing process; business model;
│       BAA/HIPAA posture; BD contact.
│       Nav: secondary nav drawer.
│
├── B2B TRACK 3 — ETC OPERATOR
│   │
│   └── /for-etcs                            [REWRITE — placeholder today]
│       H1: For Montana clinics operating under *SB 535*.
│       Purpose: License process; RULE-by-RULE compliance coverage table;
│       ETRB workflow; HFAR Path B; pricing; design partner reference;
│       operations contact.
│       Nav: secondary nav drawer.
│
├── SHARED CONVERGENCE
│   │
│   └── /platform                            [NEW]
│       H1: The operating platform behind every Montana *ETC*.
│       Purpose: Module-by-module overview of app.lewis.health for sponsor
│       and ETC audiences; compliance mapping; security posture.
│       Nav: linked from /for-sponsors and /for-etcs; not in primary nav.
│
├── COMPANY — footer
│   │
│   ├── /about                               [NEW]
│   │   H1: About Lewis.
│   │   Purpose: Founding story (Meriwether Lewis, *Lewisia rediviva*,
│   │     first commercial RTT regime); leadership; design partner
│   │     reference; press contact; investor contact.
│   │   Nav: footer.
│   │
│   └── /feedback                            [REWRITE — placeholder today]
│       H1: Share feedback.
│       Purpose: Multi-persona feedback intake (patient, caregiver,
│       clinician, ETC operator, sponsor); routes to support@lewis.health.
│       Nav: footer.
│
└── LEGAL — footer
    │
    ├── /privacy                             [REWRITE — counsel-required]
    │   H1: Privacy policy.
    │   Nav: footer.
    │
    ├── /terms                               [REWRITE — counsel-required]
    │   H1: Terms of use.
    │   Nav: footer.
    │
    └── /cookies                             [REWRITE — may fold into /privacy]
        H1: Cookies and tracking.
        Nav: footer.
```

### Routes explicitly removed from scope

- `/etcs/:slug/ae-summary` — fold the aggregate safety outcomes per RULE 16(6)(c)(ii) into `/etcs/:slug/etrb-report`. One regulated artifact, one route.
- Any blog, press, team, careers, login, signup, or dashboard route at the directory level — out of scope for MVP 0.

### Indexing posture summary

| Route | sitemap.xml | robots.txt allow |
|---|---|---|
| `/`, `/browse`, `/conditions`, `/conditions/:slug`, `/programs/:slug`, `/programs/:slug/brief.pdf`, `/etcs`, `/etcs/:slug`, `/etcs/:slug/manual`, `/etcs/:slug/etrb-report` | ✓ | ✓ |
| `/how-it-works`, `/faq`, `/about`, `/for-clinicians`, `/for-sponsors`, `/for-etcs`, `/platform` | ✓ | ✓ |
| `/privacy`, `/terms`, `/cookies`, `/feedback` | ✓ | ✓ |
| `/search` | ✗ (query-string canonical) | ✓ |
| `/eligibility/*`, `/connect/*` | ✗ | ✗ (already disallow) |

---

## 10. Navigation: TopNav, Footer, Cross-Linking

### 10.1 TopNav specification

**Layout (left-to-right):**

```
┌──────────────────────────────────────────────────────────────────────┐
│  [Lewis · . · health]    Conditions    Browse Treatments    [⌕]   ⋯  │
└──────────────────────────────────────────────────────────────────────┘
```

**Components:**

1. **Wordmark** (left): "Lewis · . · health" with italic `health` in accent color. Links to `/`.
2. **"Conditions"** plain text link → `/conditions`. Disease-first mental model entry point. **PRIMARY for patient persona.**
3. **"Browse Treatments"** outline pill button → `/browse`. Drug-first mental model entry point. Power-user / clinician view.
4. **Magnifier icon** filled accent square. Triggers in-place search overlay (NOT navigation to `/search`).
5. **More menu (⋯)**: Opens secondary nav drawer.

**Secondary nav drawer contents:**

- For Physicians → `/for-clinicians`
- For Sponsors → `/for-sponsors`
- For ETCs → `/for-etcs`
- How it works → `/how-it-works`
- About → `/about`

**Trade-offs defended:**

- "Conditions" appears FIRST in primary nav (left of "Browse Treatments") because patients overwhelmingly arrive thinking in disease terms. "Browse Treatments" is a secondary, drug-first surface for clinicians and sophisticated browsers who already know the drug name. Both surface the same underlying programs through different mental models, but their visual weight reflects their relative importance to the patient persona.
- B2B links live in the drawer, not primary nav — exposing "For Sponsors" to a patient is confusing and slightly off-putting. Drawer preserves access for B2B audiences without diluting the patient surface.
- Magnifier triggers overlay, not navigation — enables in-page search from any route without losing the patient's current context.

**Sticky behavior:** TopNav stays sticky at 80px height. On mobile, "Conditions" link moves into the drawer; primary mobile nav becomes `[Wordmark]` + `[magnifier]` + `[☰]`.

### 10.2 Footer specification

**Layout:**

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  [Lewis · . · health]                                                            │
│                                                                                  │
│  PATIENTS              CLINICIANS         PARTNERS              COMPANY          │
│  Browse treatments     For physicians     For sponsors          About            │
│  Conditions            Clinical briefs    For ETCs              How it works     │
│  ETCs                                     Operating platform    Frequently asked │
│  Eligibility / Connect                                                           │
│                                                                                  │
│  LEGAL                                                                           │
│  Privacy                                                                         │
│  Terms                                                                           │
│  Cookies                                                                         │
│  Share feedback                                                                  │
│                                                                                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│  © 2026 Lewis Health · Independent directory · Not affiliated with any sponsor   │
│  or ETC. Information sourced from Montana DPHHS public records and licensed      │
│  program operators.                                                              │
└──────────────────────────────────────────────────────────────────────────────────┘
```

Trust-signal text in the bottom bar is non-negotiable. It establishes Lewis's independence on every page and protects against being perceived as a manufacturer-affiliated marketing site. This text must appear on every page of the directory.

### 10.3 Cross-linking conventions

- Every `/programs/:slug` page links to: `/conditions/:condition-slug`, `/etcs/:etc-slug`, `/eligibility/:slug`, `/programs/:slug/brief.pdf`.
- Every `/conditions/:slug` page links to: any associated `/programs/:slug`, plus a footer link to `/browse` and `/how-it-works`.
- Every `/etcs/:slug` page links to: `/etcs/:slug/manual`, `/etcs/:slug/etrb-report`, each `/programs/:slug` offered.
- Every B2B page (`/for-clinicians`, `/for-sponsors`, `/for-etcs`) links to `/platform` and to a mailto contact.
- The patient flow (`/eligibility/*`, `/connect/*`) is a closed loop — no outbound links to non-funnel pages from these routes, except a "back to {treatment}" link at the top.

---

## 11. Homepage — Detailed Specification

### 11.1 Section ordering

Current homepage has 7 sections in this order: Hero → ProblemSection → HowItWorks → FeaturedTreatments → ForPhysicians → FaqSection → BeginningSection.

**Required reordering:**

1. AnnouncementStrip (top, fixed)
2. Hero
3. FeaturedConditions — primary carousel, first below-hero (condition-first)
4. FeaturedTreatments — secondary carousel, immediately below FeaturedConditions (drug-first)
5. HowItWorks
6. ProblemSection — moved below HowItWorks
7. ForPhysicians
8. AbridgedFAQ (5 questions only)
9. BeginningSection

**Rationale:** The patient who arrived via "{condition} experimental treatment Montana" search needs to see *which conditions are covered* before being re-explained the framework. Answer-first, then framing. The first below-hero block names conditions (the patient's mental model), with each condition card sub-lining the program(s) available — drug names are destinations, not entry points.

### 11.2 AnnouncementStrip

Current copy: "Lewis Health is just getting started. New programs and ETCs are added as Montana licenses them."

**Required revision:**

> Lewis is just getting started. WST-057 is live; new Montana programs are added as ETCs onboard.

**CTA:** "Get notified" button. Action required: wire the email signup endpoint, OR remove the button entirely. A disabled CTA is a credibility hit.

### 11.3 Hero

**H1 (existing — keep):** "Find experimental treatments available in Montana."

**Subhead:** "Currently offering treatments for diabetic peripheral neuropathy. New programs added as Montana ETCs onboard."

This subhead explicitly names the live condition above the fold. As more conditions onboard, this subhead is updated; it becomes a content-managed string in the codebase.

**Search pill placeholder behavior:**

- *Current:* Rotating placeholder, 5 prompts, 2.8s interval.
- *Required revision:* Replace with a single static placeholder: **"Search by your condition"** — singular, not "condition, treatment, or ETC."
- *Rationale:* The previous "Search by condition, treatment, or ETC" placeholder was technically accurate but diluted the primary patient mental model. Most patients don't know what they're searching for; the placeholder should tell them what to type. "Search by your condition" gives the patient a clear instruction and reflects how 95% of patient queries actually arrive. Drug-name searches and ETC searches still work — the search backend handles all three types — but the placeholder primes the most common case. Rotating placeholders also fail accessibility for cognitively-loaded users (the placeholder visible at second 0 is not the one visible when they begin typing at second 4); a single static placeholder resolves this.

**Submit behavior:** On submit, route to `/search?q=<query>` (functional after Phase 13 build).

### 11.4 FeaturedConditions

**H2 (existing — revised):** "Conditions with experimental treatments in *Montana*."

**Layout:** Horizontal carousel, condition-first. Per § 2.4 Phase 1, the launch state lists **four live** Diabetic / Chemotherapy-induced / HIV-induced / Idiopathic peripheral neuropathy cards (each sub-lined "Available now via WST-057® at Big Sky ETC, Bozeman") + **one muted "Coming soon for PTSD"** card foreshadowing Phase 2 (Psilocybin sponsor onboarding next). Each condition card links to `/conditions/:slug`, not directly to a program — `/programs/wst-057` is reached via any of the four PN condition pages. Carousel scrolls horizontally on mobile and on desktop overflow.

**Revision:** This block was previously named "FeaturedTreatments" and led with drug names. Reframed to lead with conditions — the patient's mental model. As more conditions onboard, replace muted "Coming soon for…" cards with live condition cards. The "Coming soon for…" framing is honest forward-looking signaling; its presence communicates momentum without overstating availability. A separate FeaturedTreatments secondary carousel sits directly below this block (see § 11.4b) — both surfaces exist; conditions are visually first.

**CTA:** "Browse all conditions" → `/conditions`.

### 11.4b FeaturedTreatments (secondary carousel)

**H2:** "Treatments available now in *Montana*."

**Layout:** Horizontal carousel of program cards, immediately below FeaturedConditions. Visual weight is secondary — smaller card height, lighter heading treatment, less above-the-fold real estate. Currently 1 live (WST-057®) + muted "Coming soon" placeholders. Each program card links to `/programs/:slug`.

**Rationale:** Patients who already know the drug name (referred by a treating physician, or returning from a published-evidence link) and clinicians scanning for a specific compound benefit from a drug-first browse without leaving the homepage. Keeping FeaturedConditions on top preserves the condition-first mental model for the dominant patient case; the secondary FeaturedTreatments carousel serves the smaller power-user case without privileging it.

**CTA:** "Browse all treatments" → `/browse`.

### 11.5 HowItWorks

**H2 (existing — keep):** "How Montana's program actually works."

**3-step grid, current copy retained:**

1. Find a treatment for your condition.
2. Connect with a licensed ETC.
3. Work with their clinical team to enroll.

### 11.6 ProblemSection

**H2 (existing — keep):** "Some treatments don't exist anywhere else."

Two-column copy: SB 535 framing + Lewis's role (independent, not a manufacturer or clinic).

No change to copy. Position changes (moves below HowItWorks).

### 11.7 ForPhysicians

**H2 (existing — keep):** "For treating physicians researching options for a patient."

**Required revision:** Replace disabled CTA "Browse the clinical reference" (currently disabled) with a real link to `/for-clinicians`.

**CTA copy revision:** "For physicians" → `/for-clinicians`.

### 11.8 AbridgedFAQ

**Current state:** 15 questions in two accordion groups (10 patient + 5 physician/ETC).

**Required revision:** Reduce to 5 patient questions on the homepage. The full 15-question FAQ migrates to `/faq` as the canonical destination.

**Homepage 5 questions (recommended):**

1. What is Lewis?
2. What is Right to Try in Montana?
3. Does Lewis charge me anything?
4. Do I need an account to browse?
5. How do I know if I'm eligible?

Below the 5 questions: "More questions" link → `/faq`.

### 11.9 BeginningSection

**H2 (existing — keep):** "More treatments are coming."

**Action required:** Wire the email signup endpoint OR remove the input field. Same logic as AnnouncementStrip CTA.

### 11.10 Schema markup

Existing JSON-LD: `WebSite` schema with `SearchAction` pointing at `/search?q=...`. Keep. Required for Google site-link search box.

---

## 12. Patient Funnel — End-to-End

### 12.1 Funnel diagram

```
[Google search: "{condition} experimental treatment Montana"]
                              │
                              ▼
                ┌─────────────────────────┐
                │   Landing page entry    │
                │  /conditions/:slug      │  ← DOMINANT for patients
                │  /                      │  ← homepage if direct nav
                │  /programs/:slug        │  ← only if patient knows drug name
                └─────────────────────────┘
                              │
                              ▼
                ┌─────────────────────────┐
                │ Decision 1: Is this for │
                │     my condition?       │
                │  (answered ON           │
                │   /conditions/:slug)    │
                └─────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
            YES                              NO
              │                               │
              ▼                               ▼
    /conditions/:slug                bounce → clinicaltrials.gov
        │ click "Learn more"             OR back to Google
        ▼
    /programs/:slug
              │
              ▼
    ┌─────────────────────────┐
    │ Decision 2: Is this     │
    │     real / legit?       │
    └─────────────────────────┘
              │
              ▼ (legitimacy signals satisfied)
    /eligibility/:slug
              │
              ▼
    ┌─────────────────────────┐
    │ Decision 3: Am I a fit? │
    └─────────────────────────┘
              │
      ┌───────┴────────┐
    PASS              FAIL
      │                │
      ▼                ▼
  /connect/      Graceful fail:
  :slug           - Reach out anyway
      │           - Browse other tx
      │           - clinicaltrials.gov
      │
      ▼
    ┌─────────────────────────┐
    │ Decision 4: Share       │
    │   contact info?         │
    └─────────────────────────┘
      │
      ▼
    Form submission (anonymous accepted)
      │
      ▼
    ┌─────────────────────────┐
    │ Optional: Account       │
    │   creation (post-       │
    │   conversion only)      │
    └─────────────────────────┘
      │
      ▼
    /connect/confirmed
      │
      ▼
[ETC clinical coordinator outreach within 2 business days]
      │
      ▼
[Patient onboarded to patient.lewis.health for treatment]
```

### 12.2 Decision-point fixes

**Decision 1 — "Is this for my condition?"**

- *Drop-off cause:* Patient lands on `/conditions/:slug` and finds either (a) no Montana ETC currently offers a program for this condition (long-tail conditions), or (b) a "coming soon" stub with no actionable next step. Without graceful fallbacks, the patient bounces back to Google or to clinicaltrials.gov. (The pre-condition-first failure mode — patient arriving for ALS and accidentally landing on `/programs/wst-057` — is eliminated by the fix below; condition pages exist for every condition we expect to support, so off-topic program impressions don't happen.)
- *Fix:* Build `/conditions/:slug` for every condition with current OR expected programs. Each condition page either shows the program or shows "no Montana ETC currently offers a program for {condition}" with graceful fallbacks (email-notify signup, clinicaltrials.gov filtered by condition, link to talk to a treating physician). See § 14.2 for the three-state condition page spec.

**Decision 2 — "Is this real?"**

- *Drop-off cause:* `[COUNSEL REVIEW]` markers on `/programs/wst-057` evidence and cost panels.
- *Fix:* Replace with real content before public launch (Lancet eBioMedicine citation; vetted cost range from WinSanTor + counsel). Add "Clinical evidence" block with ClinicalTrials.gov registration #, IND #, published-paper citation with DOI, ETRB approval date.

**Decision 3 — "Am I eligible?"**

- *Drop-off cause:* Patient sees plain-language eligibility but isn't sure if they qualify; doesn't click through.
- *Fix:* Make criteria summary on `/programs/:slug` more concrete — "If you have a confirmed diagnosis of diabetic peripheral neuropathy, have tried at least one standard-of-care treatment, are 18 or older, and can travel to Bozeman, you may be a fit. Take the eligibility self-screen to confirm."

**Decision 4 — "Share contact info?"**

- *Drop-off cause:* Form feels exposing.
- *Fix:* Add explicit privacy framing on `/connect/:slug`: "Your information goes only to {ETC name}. Lewis does not sell or share contact information." Make the situation textarea optional.

**Decision 5 — "Create account?"**

- *Drop-off cause:* Account creation gate before submission.
- *Fix:* Anonymous submission accepted via `POST /v1/public/connect-requests`; account creation is offered post-confirmation as optional ("track this request" / "receive updates"). Verify current implementation matches this; if it doesn't, revise.

### 12.3 Minimum viable patient funnel

If forced to ship the patient funnel today with the absolute minimum number of pages:

1. `/` — the homepage (already exists, restructure per Phase 11)
2. `/conditions/diabetic-peripheral-neuropathy` — primary patient waypoint and SEO landing page (must build)
3. `/programs/wst-057` — the conversion page (already exists, fill `[COUNSEL REVIEW]`)
4. `/eligibility/wst-057` — the self-screen (already exists, refine fail copy)
5. `/connect/wst-057` and `/connect/confirmed` — the handoff (already exists, verify Clerk gating)
6. `/search` — the rescue page for off-condition queries (must build)

The single highest-leverage build is `/search` together with `/conditions/:slug`. The single highest-leverage content fix is finalizing `/programs/wst-057`. The condition page is the door; the program page is the conversion.

---

## 13. Search — Detailed Specification

### 13.1 Two surfaces, not one

**Surface 1 — In-place search overlay** (triggered by TopNav magnifier or homepage hero search pill):

- Modal or full-viewport overlay with a single input field
- Live-suggest as user types: programs, conditions, ETCs, each tagged by type
- **Result ordering biases to conditions: Conditions appear first in the live-suggest dropdown, then Treatments, then ETCs.** This reflects the patient mental model — a patient typing "neuro" sees "Neuropathy" before "WST-057."
- Keyboard-navigable (arrow keys + enter), screen reader announces result count changes
- Submitting without selecting a suggestion routes to `/search?q=<query>`
- Closes on Escape, on click outside, or on selecting a suggestion

**Surface 2 — Search results page** (`/search?q=...`):

```
┌──────────────────────────────────────────────────────────┐
│ Showing results for "ALS"                                │
│                                                          │
│ CONDITIONS (1)                                           │
│ → Amyotrophic Lateral Sclerosis (ALS)                    │
│   No Montana programs yet. Get notified when one is.     │
│                                                          │
│ TREATMENTS (0)                                           │
│ No experimental treatments for ALS are currently         │
│ available at a Montana ETC. We add programs as ETCs      │
│ onboard them.                                            │
│ → Browse all conditions                                  │
│ → Search clinicaltrials.gov for ALS trials               │
│                                                          │
│ ETCs (0)                                                 │
│ No ETCs match this query.                                │
└──────────────────────────────────────────────────────────┘
```

### 13.2 Three result states

**State A — Active query with results:**

- **Conditions appear first.** Patients overwhelmingly arrive thinking in disease terms; the search results page reflects this priority. Treatment results follow; ETC results last (geographic/operator searches are the rarest patient pattern).
- Each section shows count + result cards
- "No results in this section" is rendered as a respectful message, not absence

**State B — Active query with no results:**

- "No matches for '{query}'. Try one of these starting points:" + curated list of available programs/conditions/ETCs.

**State C — Empty query (page entry without query):**

```
Search Lewis.
Find programs, conditions, and Experimental Treatment
Centers across Montana.

[search input]

Recent on Lewis:
→ WST-057 for diabetic peripheral neuropathy
→ Big Sky ETC, Bozeman
→ How Montana's program works
```

### 13.3 Backend

- Postgres FTS on a `search_index_documents` table (per main PRD § 13.6). Tenant scoped. PHI-redacted.
- API: `GET /v1/public/search?q=<query>&type=<treatment|condition|etc>` returning sectioned JSON.
- Rate-limit at 60 req/min/IP at edge (Cloudflare).

### 13.4 Disambiguation

For ambiguous queries (e.g., "neuropathy" matches diabetic peripheral neuropathy specifically AND a broader conditions index):

- Return both as separate sections
- **Conditions section appears first** (most accessible patient mental model)
- Within the Conditions section, most-specific match first (a query for "neuropathy" surfaces "Diabetic peripheral neuropathy" before generic neuropathy entries)
- Below conditions, the Treatments section surfaces drug-name matches (WST-057 for queries that match a drug)

### 13.5 Off-topic queries — search relevance must respect query semantics

A search for a condition not in the live catalog (e.g., "ALS Montana treatment") **must never** promote an unrelated live program (e.g., WST-057 for peripheral neuropathy) as a primary match. Doing so is misleading and patronizing — a patient searching for ALS does not want to see neuropathy content first. Specifically:

- The Conditions section returns the queried condition with appropriate framing ("Amyotrophic Lateral Sclerosis (ALS) — no Montana programs yet. Get notified when one is.")
- The Treatments section returns 0 with graceful fallbacks (email-notify signup, link to clinicaltrials.gov filtered by the queried condition)
- Unrelated live programs may surface only as a footer-level "Other conditions on Lewis" or "Related conditions" section, clearly visually subordinate and labeled as such — never inline with the queried condition, never as a primary match
- The search ranker scores query-condition relevance, not just catalog presence. A live program that does not match the queried condition does not earn a top result slot by virtue of being the only live program in the directory.

This principle applies to both Surface 1 (in-place search overlay live-suggest) and Surface 2 (search results page).

---

## 14. Conditions Index & Detail — Detailed Specification

### 14.0 Strategic role of `/conditions`

`/conditions` and `/conditions/:slug` are the primary patient browse surfaces, not just SEO landing pages. Every patient arriving from a Google search for "{condition} experimental treatment Montana" lands on `/conditions/:slug`. Every patient arriving directly via the homepage clicks through "Conditions" in the TopNav or the FeaturedConditions homepage block to land on `/conditions/:slug`. The condition page is the door; the program page (`/programs/:slug`) is the conversion.

This positioning has implications:

- Content depth on `/conditions/:slug` matches or exceeds `/programs/:slug` (more thorough symptom and standard-of-care content for SEO depth and patient education).
- Internal link structure favors `/conditions/:slug` → `/programs/:slug`, not the inverse.
- Schema.org `MedicalCondition` markup on these pages is the highest-value structured data in the directory.
- A patient should be able to complete a full mental model of "what's available for my condition" on `/conditions/:slug` alone, without needing to land on a program page first.

### 14.1 `/conditions` (index)

**H1:** Conditions with experimental treatments in Montana.

**Layout:** Alphabetical list, optionally grouped by body system or therapeutic area (TBD with content team).

**Per-entry display:**

- Condition name
- ICD-10 code(s) (small, secondary)
- Brief one-line description
- Status indicator: "Available now" / "Coming soon" / "Not currently offered"

**Empty-state behavior at MVP 0:** With only 1 live program, show the live condition prominently and 4-5 "Coming soon" stub conditions. Be honest about scope.

### 14.2 `/conditions/:slug` (detail)

**H1:** Experimental treatments for {condition} in Montana.

**Three states the page can be in:**

**State A — Live (e.g., diabetic peripheral neuropathy):**

- Plain-language condition explainer (sourced from MedlinePlus / authoritative public sources, with attribution)
- Standard-of-care section: "Currently FDA-approved treatments for {condition} include..." — required framing because RULE 12(2)(f) and 50-12-104(1) require patients to evaluate other FDA-approved treatments first
- Available experimental programs (cards): name, drug, manufacturer, ETC offering, "Learn more" → `/programs/:slug`
- Educational sidebar: "Why experimental treatments?"
- Disclaimer: "Not medical advice. Consult your treating physician."

**State B — Coming soon (e.g., ALS once a sponsor is in conversation):**

- Plain-language condition explainer (same as State A)
- Standard-of-care section (same as State A)
- "Lewis expects a program for {condition} to be available in {timeframe}. Get notified when it's listed." with an email signup specific to that condition
- Sidebar: "While you wait" — link to clinicaltrials.gov filtered by condition

**State C — Not currently offered (long tail):**

- Plain-language condition explainer
- "No Montana ETC currently offers a program for {condition}."
- "You may want to:" — three options:
  1. Search clinicaltrials.gov for active trials
  2. Talk to your treating physician about other options
  3. Get notified if a Montana ETC adds a program

### 14.3 Schema markup

Each `/conditions/:slug` page emits Schema.org `MedicalCondition` JSON-LD with:

- `name` (condition name)
- `code` (ICD-10)
- `possibleTreatment` (array of treatments offered, where applicable)

### 14.4 Launch-priority condition list

Per § 2.4 Phase 1, the launch state covers WST-057's four labeled indications. Phase 2 adds PTSD as the next sponsor onboards. Long-tail "not currently offered" stubs ship at MVP 0 for SEO and graceful fallback.

**First 5 conditions to launch with full content (Phase 1):**

1. Diabetic peripheral neuropathy (live, WST-057)
2. Chemotherapy-induced peripheral neuropathy (live, WST-057)
3. HIV-induced peripheral neuropathy (live, WST-057)
4. Idiopathic peripheral neuropathy (live, WST-057)
5. PTSD — coming soon stub (Phase 2 — Psilocybin sponsor onboarding next per § 2.4)

**Long-tail "not currently offered" stubs to ship at MVP 0** (State C per § 14.2 — present for SEO and graceful fallback, not actively marketed):

- Amyotrophic Lateral Sclerosis (ALS)
- Multiple sclerosis
- Rare cancers (umbrella)
- Autoimmune diseases (umbrella)

Add 10-15 more long-tail stubs in Phase 2 of build as Phase 3 sponsor pipeline takes shape.

---

## 15. Programs (Treatment Detail) — Detailed Specification

### 15.1 Existing layout (keep)

Split layout: floating product photograph left (`--paper-deep` background, full-bleed), all interactive content right.

### 15.2 Right-column section list (in order)

1. **Header block** — H1 with ®, "Available now in Montana" tag, manufacturer line
2. **About this treatment** — mechanism + Phase status, plain language
3. **Clinical evidence** (NEW BLOCK — required for clinician persona)
4. **Who this is for** — eligibility plain language with concrete criteria, CTA "Check my eligibility"
5. **Where to access this treatment** — ETC card(s) with "Currently accepting new patients" tag, profile + connect links
6. **How enrollment works** — 3-step ordered list, "Lewis never charges patients" reminder
7. **What this typically costs** — range + insurance disclaimer (currently `[COUNSEL REVIEW]`)
8. **Used Lewis? Share Feedback** — currently disabled; wire or remove

### 15.3 Clinical evidence block specification

**H2:** Clinical evidence.

**Required content:**

- Trial registration: ClinicalTrials.gov registration number + active link
- IND number (if disclosable)
- Trial phase
- Published paper citation with DOI link (e.g., for WST-057: Lancet eBioMedicine Phase 2a paper, p=0.006 IENFD high dose)
- ETRB approval date and board name (ties to RULE 16(6)(a))
- Mechanism summary in 2 paragraphs (peer-level, not patient-level)
- Key safety findings summary

**Placement:** Above "Who this is for" block.

**Voice:** Peer-level for clinicians, but readable by sophisticated patients/caregivers. No marketing language. Citations attached.

### 15.4 Counsel review markers — must be cleared before public launch

| Marker | Location | Required content |
|---|---|---|
| `[COUNSEL REVIEW]` evidence link | Clinical evidence block | Lancet eBioMedicine Phase 2a citation + DOI |
| `[COUNSEL REVIEW]` cost range | Cost panel | Vetted "X–X–X–Y per course" language from WinSanTor + counsel sign-off |

**Pre-launch lint check:** A CI step must fail the build if `[COUNSEL REVIEW]` appears anywhere in committed copy.

### 15.5 Clinician CTA

Add new CTA on `/programs/:slug`: "Refer this patient" outline pill button.

- Routes to `/connect/:programSlug?referrer=clinician`
- Pre-fills the connect form context to indicate clinician origin
- Tracking: `program.clinician.refer_clicked` event

### 15.6 Brief PDF download

Add new CTA: "Download clinical brief" outline pill button.

- Links to `/programs/:slug/brief.pdf`
- Tracking: `program.brief.downloaded` event

**PDF specification:**

- Single page, 8.5×11
- Header: drug name, indication, phase
- Sections: Mechanism, Eligibility criteria, ETRB approval, ETC contact, Trial registration, Published evidence, Key safety findings
- Designed in restrained serif aesthetic matching the website
- Saved with descriptive filename: `lewis-brief-{drug-slug}-{yyyymmdd}.pdf`

### 15.7 Schema markup

Existing `Drug` JSON-LD — keep. Augment with:

- `clinicalPharmacology` (where appropriate)
- `medicineSystem`: `WesternConventional`
- `prescribingInfo`: link to ClinicalTrials.gov entry

---

## 16. ETCs Index & Profile — Detailed Specification

### 16.1 `/etcs` (index)

**H1:** Licensed Experimental Treatment Centers in Montana.

**Layout:**

- List view + map (Mapbox light-themed to match palette)
- Each entry: ETC name, city, programs offered count, license status, "View profile"
- Filters: by region, by programs offered, by accepting new patients

**Empty state at MVP 0:** With only Big Sky ETC live, show the one ETC plus a "Coming soon" framing — "Montana's ETC licensure is rolling out. Check back as more centers license."

**Source of truth:** Manual entry at MVP 0; nightly Bounds sync (mt-reports.com) once ETC license type goes live in DPHHS Bounds (mid-late 2026). Schema in `etc_public_listings` table per main PRD § 9.1.

### 16.2 `/etcs/:slug` (profile)

**Existing sections — keep:**

- Header: ETC name, city/state, license badge with #
- About
- Treatments offered (program cards with "Currently accepting new patients" tag)
- Location and contact
- Public documents (link to manual + ETRB report)
- Medical Director name + credentials

**Required additions:**

**Direct medical director contact line** — for clinicians. Either:

- A dedicated email (e.g., `medical.director@bigskyetc.com`)
- A "Clinical inquiries" phone extension
- Specifically labeled: "For physicians: clinical inquiries"

**Claim status badge** (for unclaimed ETCs sourced from public records):

- "Claimed by operator" badge (default for Big Sky)
- "Public listing — operator can claim this profile" for unclaimed (Phase 2)

### 16.3 Schema markup

Existing `MedicalClinic` JSON-LD — keep. Augment with:

- `medicalSpecialty`: array of specialties offered
- `availableService`: array of program references

### 16.4 Sub-pages

- `/etcs/:slug/manual` — renders the current approved version of the ETC's P&P manual (RULE 6(1) public-availability requirement). Auto-rendered from `app.lewis.health` once the operating platform is live.
- `/etcs/:slug/etrb-report` — renders the ETRB annual public report (RULE 16(6)(c)). Includes aggregate safety outcomes (RULE 16(6)(c)(ii)). Auto-rendered from `app.lewis.health`.
- `/etcs/:slug/ae-summary` — **REMOVED.** Folded into `/etrb-report`.

---

## 17. Eligibility Self-Screen — Detailed Specification

### 17.1 Existing flow (keep)

- 4 questions for WST-057 (per current implementation)
- Progress dots
- Radio cards with no auto-advance (WCAG 2.2.1, 3.2.2 compliance)
- Back/Next pill buttons
- "Answers are saved anonymously to this device" disclosure
- Anonymous token in `localStorage` keyed `lewis:eligibility:<slug>`

### 17.2 Backend wiring

**Required:** Server-side bootstrap via `POST /v1/public/eligibility/:slug/start` (currently stubbed). When wired:

- Call on screen entry; receives an opaque session token
- Each answer submission: `POST /v1/public/eligibility/sessions/:token/answers`
- Completion: `POST /v1/public/eligibility/sessions/:token/complete` returns the result
- Token expires server-side at 30 days
- Token persisted client-side in `localStorage` for resume-on-return

### 17.3 Result page — pass branch

Existing copy — keep, with refinement:

**H1:** Based on what you shared, you may be a fit.

**Body:** "Final eligibility is determined by the ETC's clinical team after they review your treating physician's recommendation and current History & Physical."

**CTA:** "Connect with the ETC" → `/connect/:programSlug`.

### 17.4 Result page — fail branch (REVISION REQUIRED)

**Current state:** Generic "may not be the right fit" + "Reach out anyway" + "Back to treatment."

**Required revision:**

**H1:** Based on what you shared, you may not be a fit.

**Specific reason block:** "This program may not be the right fit because {specific failed criterion}."

**Examples:**

- "...the program requires a confirmed diabetic peripheral neuropathy diagnosis from a treating physician."
- "...the program currently accepts patients age 18 and older."
- "...the program requires the ability to travel to Bozeman, Montana for in-person visits."

**Three graceful paths CTA block:**

```
Reach out anyway
The ETC's clinical team makes the final eligibility
determination, not this self-screen.

Browse other treatments
See if another Montana program may be a fit.

Look for clinical trials elsewhere
Search clinicaltrials.gov for trials related to your condition.
```

### 17.5 Accessibility requirements

- No auto-advance on radio inputs (already implemented)
- Screen reader announces step changes
- Keyboard navigation: Tab/Shift+Tab between options, Space/Enter to select, Enter on Next button
- Focus management: focus moves to step heading on each step change
- `prefers-reduced-motion` honored on any transitions

---

## 18. Connect Handoff & Confirmation — Detailed Specification

### 18.1 `/connect/:programSlug`

**Existing fields — keep:**

- Your name (required)
- Email (required)
- Phone (optional)
- Best time to contact (optional)
- Brief situation (textarea with explicit warning)

**Required revisions:**

Add explicit privacy framing block above the form:

> Your information goes only to {ETC name}. Lewis does not sell or share contact information. Lewis is not a marketing company.

Make the situation textarea optional (remove required-field behavior).

Refine the textarea warning copy:

> Please don't share specific medical details here — your ETC clinical team will collect those securely after they reach out.

### 18.2 Submission flow (verify current implementation)

```
Patient submits form
        │
        ▼
POST /v1/public/connect-requests
  - Anonymous accepted (no Clerk required)
  - Anonymous eligibility token (from localStorage)
    attached to request
        │
        ▼
ETC notified via email
        │
        ▼
Patient redirected to /connect/confirmed
        │
        ▼
Optional account creation offered post-conversion
  ("Track this request" / "Receive updates")
        │
        ▼ (if patient accepts)
Clerk SignUp lazy-loaded
        │
        ▼
POST /v1/patient/account/link-anonymous-screen
  - Links eligibility token + connect request to new user
```

**Critical:** Account creation is post-conversion, not pre-conversion. Anonymous submission is the primary path.

### 18.3 `/connect/confirmed`

**Existing — keep:**

**H1:** We've connected you with {ETC name}.

**Body:** "Their clinical coordinator will reach out within two business days."

**Checklist of what to prep:**

- Treating physician's written recommendation
- Current History & Physical (within 90 days)
- Records of prior standard-of-care treatments
- List of current medications and allergies

**Optional CTA:** "Create an account to track this request" (lazy-loaded Clerk).

### 18.4 ETC handoff format

- For ETCs not yet on the operating platform: well-formatted email with subject `[Lewis] New patient inquiry for {program} — {date}`.
- For ETCs on the operating platform: in-app notification on `app.lewis.health` with deep link.

---

## 19. Patient Education Pages

### 19.1 `/how-it-works`

**H1:** How Montana's Right to Try program works.

**Section outline:**

1. What is Right to Try? (SB 535 framing)
2. What is an Experimental Treatment Center? (RULE 5 / 50-5-101 definition)
3. How is this different from a clinical trial?
4. What does the enrollment process look like, end to end?
5. What does informed consent involve? (50-12-105 explainer)
6. What are my rights as a patient?
7. What does it cost?
8. What happens if there's an adverse event? (RULE 17)
9. How is my data protected?

**Voice:** Plain, calm, attributed to source statutes. 2-3 paragraphs per section.

### 19.2 `/faq` (canonical)

**H1:** Frequently asked questions.

**Structure:** Five accordion groups.

**Group 1 — For patients (15 questions):**

Existing 10 from homepage + 5 expanded:

1. What is Lewis?
2. What is Right to Try in Montana?
3. Do I need an account to browse?
4. How much do these treatments cost?
5. Does Lewis charge me anything?
6. Can I use insurance?
7. Where are the ETCs located?
8. What if I'm not in Montana?
9. How do I know if I'm eligible?
10. What happens if I have a bad reaction?
11. How long does enrollment take?
12. What documents do I need?
13. Can my treating physician be involved?
14. What if I want to stop treatment?
15. How is my privacy protected?

**Group 2 — For caregivers (5 questions):**

1. Can I make decisions on behalf of a patient?
2. How do I sign up if I'm caring for a patient?
3. Can I attend appointments?
4. How do I file paperwork on behalf of a patient?
5. What if the patient is a minor or has a legal guardian?

**Group 3 — For physicians (8 questions):**

Existing 5 + 3 expanded:

1. How does my patient get enrolled at an ETC?
2. Can I refer patients to a specific ETC?
3. How does the ETC review work?
4. How are adverse events reported?
5. Is Lewis affiliated with any specific manufacturer or ETC?
6. What does FDA pre-approval marketing posture mean for my license? (50-12-108)
7. Can I download clinical materials for chart review?
8. How do I reach an ETC's medical director?

**Group 4 — For sponsors (5 questions):**

1. How does my company list a program?
2. What's the regulatory framework?
3. What does the operating platform do?
4. How is Lewis paid?
5. Who do I contact?

**Group 5 — For ETC operators (5 questions):**

1. How do I license an ETC under SB 535?
2. What does Lewis do for me operationally?
3. How does the ETRB workflow function?
4. What's pricing?
5. Who else is on the platform?

---

## 20. B2B Track — Clinicians (`/for-clinicians`)

### 20.1 Page specification

**H1:** For treating physicians considering an experimental treatment.

**Section outline:**

1. Peer-level opening — what Lewis is, why a referring physician should care
2. How to refer a patient (3-step explainer)
3. Downloadable clinical brief library (initially WST-057's only)
4. FDA pre-approval marketing posture — what it means for your license, citing SB 535 § 12 / 50-12-108
5. How to reach an ETC's medical director directly
6. Contact: clinicians@lewis.health

### 20.2 Sample paragraph (in voice)

> Lewis is the public directory for Montana's licensed Experimental Treatment Centers. If your patient asks about an experimental treatment they read about, Lewis is where you can verify it exists, see the published evidence, download a clinical brief for chart review, and reach the ETC's medical director directly. We are independent — not a manufacturer, not a clinic. We exist to make the access path legible to you and your patient.

### 20.3 FDA pre-approval marketing posture — required content

Address the question: "If I refer a patient to an experimental treatment under Right to Try, does my licensing board consider this acceptable?"

**Answer:** Cite SB 535 § 12 (50-12-108):

> "A licensing board may not revoke, fail to renew, suspend, or take any action against a license issued under Title 37 to a health care provider based solely on the health care provider's recommendations to a patient regarding access to or provision of an experimental treatment with an investigational drug, biological product, or device."

Include this statutory language verbatim. It is the single most important reassurance for the clinician persona.

---

## 21. B2B Track — Sponsors (`/for-sponsors`)

### 21.1 Required first-draft content

The full first-draft content for `/for-sponsors` is provided here for the copy team to refine and ship. This is a `[COUNSEL REVIEW]` artifact — every regulatory claim must be verified before publication.

### 21.2 Page specification

**H1:** List a program with Lewis.

**Section structure:**

1. Opening — what Lewis is, who it's for
2. The regulatory framework (SB 535 + RULE 16)
3. The two paths — partner-ETC vs. operate-own-ETC
4. What the operating platform does
5. How a program gets listed (process + timeline)
6. How Lewis is paid (business model)
7. BAA / HIPAA / regulatory posture
8. Talk to our team CTA

### 21.3 Full first-draft copy

> **List a program with Lewis.**
>
> Lewis is the operating platform for Montana's Experimental Treatment Center regime. We help biotech sponsors deliver investigational treatments to patients through licensed Montana ETCs — the only state-level commercial Right to Try program in the United States.
>
> If you manufacture an investigational drug, biological product, or device that has completed Phase 1 of an FDA-approved clinical trial and remains under investigation, your treatment may qualify under SB 535 (50-12-102(1)). Two paths are open to you, and we support both.
>
> **The regulatory framework**
>
> Montana's SB 535, signed into law in 2025 and operationalized through MAR 2026-427.1 in 2026, established the country's first state-level licensed Experimental Treatment Center class. ETCs are licensed by the Montana Department of Public Health and Human Services and may deliver investigational treatments to patients who have evaluated standard-of-care options and provided informed consent under 50-12-105.
>
> Drug qualification is determined by each ETC's Experimental Treatment Review Board under RULE 16(6)(a) — not by DPHHS. The ETRB reviews the protocol against safety standards and risk-benefit before any treatment is delivered.
>
> Lewis is not a clinic and not a manufacturer. We are independent infrastructure: the directory patients use to find programs, and the operating platform every Montana ETC uses to manage licensure, the ETRB workflow, patient intake, adverse event reporting, and DPHHS filings.
>
> **The two paths**
>
> *Path 1 — Partner with a Montana ETC.* You contract with an existing licensed ETC under a Program Participation Agreement. You sell the drug to the ETC at a negotiated price; the ETC sells to the patient at the price you and they agree to in the agreement. The ETC pays Montana 2% of net annual profits as the Health Freedom and Access Requirement. Both parties capture margin; the regulatory burden of operating the clinic sits with the ETC.
>
> *Path 2 — Operate your own ETC.* You license a Montana ETC subsidiary under SB 535. The drug transfers internally; your subsidiary sells to the patient at the price you set. Your subsidiary pays Montana 2% of net annual profits as the HFAR. You capture the full margin and retain operational control of the clinic. Lewis runs the operating platform; your team runs the clinical operation.
>
> SB 535 § 7 (amending 50-12-103) places "manufacturer, health care provider, or health care facility" in parallel as actors who may "establish payment arrangements with a patient." The statute permits both paths on equal footing. The right path depends on your existing operational capacity, your geographic plans, and how you think about margin capture in the Montana segment of your commercialization.
>
> **What the operating platform does**
>
> Beyond the public directory, Lewis maintains the system of record for every Montana ETC on the platform. Modules include:
>
> - Licensure assistance — the RULE 5 application is generated from a guided wizard; ETCs file with DPHHS directly.
> - The 20-category P&P manual under RULE 6, with biennial review tracking.
> - Staff files under RULE 10, including license expiration alerts.
> - The Experimental Treatment Review Board workflow under RULE 16 — protocol review, conflict declarations, voting, annual public report generation, 5-year retention.
> - Quality Assurance and Performance Improvement under RULE 15 — quarterly meeting cadence, agenda generation, decision log.
> - Adverse event reporting under RULE 17 — including the 5-day reporting clock to DPHHS.
> - HFAR Path B annual workflow — net profit calculation, DPHHS form generation, contribution evidence.
> - DPHHS annual report under RULE 22, due January 31.
> - Patient intake — anonymous discovery, eligibility verification, treating physician referral, informed consent (digital recorded path under 50-12-105(3)(b)), patient agreement under RULE 11, payment via Stripe.
>
> All PHI is processed under signed Business Associate Agreements with our subprocessors. Tenant isolation is enforced by Postgres Row-Level Security with Clerk JWT-based authentication. We are SOC 2 Type II auditable.
>
> **How a program gets listed**
>
> Listing a program on Lewis follows three steps:
>
> 1. *Initial conversation.* You and our team confirm the drug qualifies under 50-12-102(1) and discuss which path (partner-ETC or operate-own-ETC) makes sense for your commercialization strategy.
> 2. *Program participation agreement.* If Path 1, the PPA is executed between you and the ETC operator. If Path 2, you license your own ETC and execute a Lewis platform agreement.
> 3. *ETRB protocol approval.* The ETC's ETRB reviews the protocol under RULE 16(6)(a). Approval is required before any patient is enrolled. Lewis manages the workflow.
>
> Typical time from first conversation to first patient enrolled is 60 to 90 days, gated primarily by ETRB scheduling and license status.
>
> **How Lewis is paid**
>
> Lewis charges sponsors a per-patient enrollment fee plus a flat platform subscription. We do not take a percentage of revenue. We do not charge patients. We do not take referral fees from ETCs. Pricing is discussed in the initial conversation.
>
> **Talk to our team**
>
> Email sponsors@lewis.health to start the conversation. Initial calls are with our BD lead and a regulatory advisor familiar with SB 535. Mention your drug, indication, and current trial phase; we'll come prepared to talk about both paths.

---

## 22. B2B Track — ETC Operators (`/for-etcs`)

### 22.1 Required first-draft content

Full draft below. Same `[COUNSEL REVIEW]` discipline applies.

### 22.2 Page specification

**H1:** For Montana clinics operating under SB 535.

**Section structure:**

1. Opening — Lewis as operations infrastructure for ETCs
2. What an ETC license actually requires (cite RULE numbers)
3. RULE-by-RULE compliance coverage table
4. The ETRB workflow specifically
5. HFAR Path B in practice
6. Pricing
7. Built with the first Montana ETC (design partner reference)
8. Start a conversation CTA

### 22.3 Full first-draft copy

> **For Montana clinics operating under SB 535.**
>
> Lewis is the operating platform Montana's Experimental Treatment Centers use to handle every requirement under MAR 2026-427.1 — from licensure through the ETRB workflow, patient intake, adverse event reporting, HFAR fulfillment, and the DPHHS annual report. We were built specifically for SB 535 compliance, and we work with the first ETC in the state.
>
> **What the ETC license actually requires**
>
> Operating an ETC in Montana means complying with 25 administrative rules under MAR 2026-427.1, plus the underlying statute. The application alone (RULE 5) requires an administrator, a medical director, a professional staff roster, a 20-category P&P manual under RULE 6, a transfer agreement with a local hospital under RULE 13(2), an Experimental Treatment Review Board under RULE 16, and a $10,000 application fee with $5,000 annual renewal.
>
> Once licensed, you are responsible for:
>
> - Quarterly QAPI meetings under RULE 15 with 3-year retention.
> - Quarterly ETRB safety review under RULE 16(6)(b) and an annual public report under RULE 16(6)(c) with 5-year retention.
> - Adverse event reporting to DPHHS within 5 days under RULE 17.
> - Patient files retained 5 years post-discharge under RULE 12(4).
> - Annual report to DPHHS by January 31 under RULE 22.
> - Health Freedom and Access Requirement documentation by February 1 under SB 535 § 2.
> - Annual fire marshal inspection, fire alarm inspection, and transfer agreement renewal.
> - Biennial P&P manual review under RULE 6(4).
>
> Most of these are recurring deadlines an operator can miss in their first year if they are not built around. RULE 22(2)(b) allows DPHHS to reduce a non-filing ETC to provisional license. Missing the 5-day AE clock is a serious finding. Missing the January 31 annual report is a serious finding.
>
> Lewis is the system that makes none of these get missed.
>
> **Every RULE, accounted for**

| Requirement | RULE | Lewis module |
|---|---|---|
| License application | RULE 5 | Licensure wizard |
| P&P manual (20 categories) | RULE 6 | P&P manual generator |
| Administrator role | RULE 7 | Staff & roles |
| Medical Director role | RULE 8 | Staff & roles + QAPI lead |
| Staff requirements | RULE 9 | Staff files |
| Staff files (license, training, evaluations) | RULE 10 | Staff files with expiration alerts |
| Patient agreement | RULE 11 | Patient intake — agreement generation |
| Patient files (5-year retention) | RULE 12 | Patient files with retention locks |
| Treatment documentation | RULE 13 | Treatment doc + drug accountability |
| Transfer agreement | RULE 13(2)–(4) | Transfer agreement tracking |
| Emergency procedures | RULE 14 | Emergency transfer workflow |
| QAPI program | RULE 15 | QAPI module — quarterly cadence |
| ETRB workflow | RULE 16 | ETRB module — protocol, voting, annual report |
| Adverse event reporting (5-day clock) | RULE 17 | AE workflow with countdown |
| Infection control | RULE 18 | Infection control program |
| Safety program | RULE 19 | Safety reporting + medication errors |
| Annual report | RULE 22 | DPHHS annual report — auto-assembly |
| Outpatient physical plant | RULE 23 | Licensure wizard physical plant section |
| HFAR (SB 535 § 2) | — | HFAR Path B annual workflow |

> The few items not in the table — RULES 20 (anesthesia), 21 (devices), 24 (inpatient), 25 (outside-ETC physician network) — are conditional or not in MVP scope. We add them as ETCs need them.
>
> **The ETRB workflow specifically**
>
> The Experimental Treatment Review Board is the most distinctive — and most operationally complex — requirement in MAR 2026-427.1. It is also the keymaster for any treatment ever being administered outside the ETC walls under RULE 25.
>
> Lewis treats the ETRB as a first-class entity. A board can serve one ETC or many (RULE 16(2)(b), RULE 16(4)). Each board member is a Clerk-authenticated reviewer with a conflict-of-interest declaration aligned to 1-6-105 MCA. Protocol reviews flow from sponsor to board with reviewer assignments, votes, rationale, and approval timestamps. The annual public report under RULE 16(6)(c) generates from this dataset automatically.
>
> If you have not yet recruited a board, we can connect you with reviewers. If you have a board, your board uses Lewis as its system of record.
>
> **HFAR Path B in practice**
>
> SB 535 § 2 requires every licensed ETC to allocate 2% of net annual profits to support access to experimental treatments. Path A (free treatment to qualifying Montana residents) is operationally complex; most ETCs choose Path B (cash contribution to the Insurance Premium Support Account established under SB 535 § 3).
>
> Lewis's HFAR Path B workflow runs once a year. We pull net profits from your accounting export, calculate 2%, generate the DPHHS contribution form, and store the contribution evidence. The full workflow takes 20 minutes. February 1 deadline is tracked from December 1.
>
> **Pricing**
>
> Lewis charges ETCs a flat monthly platform fee that scales with the number of programs you offer. We do not take a percentage of patient revenue. We do not charge patients. Specific pricing is discussed in the initial conversation; we publish a starting tier on request.
>
> **Built with the first Montana ETC**
>
> Lewis was built in design partnership with Big Sky ETC in Bozeman — Montana's first licensed Experimental Treatment Center — and with WinSanTor, the sponsor of the first commercial WST-057 program. Every flow in the platform was tested with their team. We continue to add features at the pace of new RULE interpretations and DPHHS guidance.
>
> **Start a conversation**
>
> Email operators@lewis.health. Initial calls cover your facility's operational state, your timeline to license, your ETRB plans, and the programs you are evaluating.

---

## 23. Shared Platform Page (`/platform`)

### 23.1 Page specification

**H1:** The operating platform behind every Montana ETC.

**Purpose:** Cross-persona explainer of `app.lewis.health` for sponsors and ETC operators. Linked from `/for-sponsors` and `/for-etcs`. Not in primary nav.

**Section structure:**

1. Opening — what the platform is, who uses it
2. Module-by-module overview
3. Architecture diagram
4. Compliance mapping table (every RULE → Lewis feature)
5. Security posture (BAA list, RLS, SOC 2 readiness, HIPAA)
6. Subprocessor list with BAA status
7. Talk to us about a demo CTA

### 23.2 Sample paragraph (in voice)

> The operating platform Lewis runs at app.lewis.health is the system of record for Montana's Experimental Treatment Center regime. Every protocol approved by an Experimental Treatment Review Board, every patient file under RULE 12, every adverse event reported within the 5-day clock under RULE 17, every quarterly QAPI meeting under RULE 15, every annual report due to DPHHS by January 31 under RULE 22 — they all flow through one platform. Lewis is the substrate. The clinic operates; the platform records.

### 23.3 Compliance mapping table

Reuse the table from `/for-etcs` § 22.3, with an additional column for "Audit evidence" describing what the platform produces for each RULE.

---

## 24. Company Pages (`/about`, `/feedback`)

### 24.1 `/about`

**H1:** About Lewis.

**Section outline:**

- Founding story — Meriwether Lewis, *Lewisia rediviva*, Montana's first commercial RTT regime
- Mission — independent infrastructure for SB 535 access
- Leadership — Gabriel Viggers (Founding Product), Stanley Kim (design partner sponsor lead)
- Design partner reference — Big Sky ETC + WinSanTor
- Independence statement — not affiliated with any sponsor or ETC
- Press contact — press@lewis.health
- Investor contact — investors@lewis.health
- Office (eventual) — TBD

### 24.2 Founding-story paragraph

> Lewis is named for Meriwether Lewis, who from 1804 to 1806 led the careful documentation of Montana's plants, animals, peoples, and geography — producing one of the most thorough records of an unknown territory in American history. Lewis catalogued the bitterroot, Montana's state flower, whose scientific name *Lewisia rediviva* honors him and means *brought back to life*. We named the platform Lewis because we built it to be the same kind of careful record for a new frontier: Montana's experimental treatment program, the first of its kind in the country, and the patients whose treatments it brings within reach.

### 24.3 `/feedback`

**H1:** Share feedback.

**Form fields:**

- Persona selector: Patient / Caregiver / Treating physician / ETC operator / Sponsor / Other
- Email (optional)
- Feedback (textarea, required)
- Subject (auto-populated based on persona)

**Routing:** Submissions email support@lewis.health with persona in subject.

Disabled CTA elsewhere on the site ("Share Feedback" buttons that currently don't link anywhere) should all link to this page.

---

## 25. Legal Pages

### 25.1 `/privacy`, `/terms`, `/cookies`

**Status:** Counsel-required. P0 blocker for public launch.

**Engagement:** Engage biotech / health-IT counsel to draft. Lewis Founding Product reviews and approves with engineering.

**Decision pending:** `/cookies` may fold into `/privacy`. Decision in counsel engagement.

### 25.2 Required content for `/privacy`

Specifically must address:

- What data the directory collects (anonymous browsing, eligibility tokens, connect requests)
- What data is shared with ETCs (only on connect submission, only the form data)
- BAA posture for subprocessors
- Patient HIPAA rights (when they cross into authenticated patient portal)
- Cookie policy
- Right of access, amendment, accounting of disclosures, restriction (per main PRD § 18.8)

### 25.3 Required content for `/terms`

- Independent directory framing
- Lewis is not a clinic or manufacturer
- No medical advice
- Patient relationship is with the ETC, not Lewis
- Lewis never charges patients
- Sponsor and ETC use is governed by separate MSA / platform agreements
- Multi-state and FDA pre-approval marketing posture

---

## 26. SEO Infrastructure

### 26.1 Technical SEO

**Required:**

- Server-side rendering or static generation for all public pages (Vite SSG with prerendering)
- Schema.org structured data per page type (already partial — extend):
  - Homepage: `WebSite` with `SearchAction` (exists)
  - Programs: `Drug` (exists, augment per § 15.7)
  - ETCs: `MedicalClinic` (exists, augment per § 16.3)
  - Conditions: `MedicalCondition` (NEW — add per § 14.3)
- XML sitemap: auto-generated, submitted to Google Search Console
- `robots.txt`: existing rules retained
- Canonical URLs: every page declares one
- Open Graph + Twitter card metadata per page
- Clean semantic HTML (`h1`-`h6`, `article`, `section`, `nav`)

### 26.2 Content SEO

The directory's highest-value SEO surfaces are `/conditions/:slug` pages. Long-tail Google search volumes for "{condition} experimental treatment" queries are 10-50x higher than "{drug name} access" queries because patients overwhelmingly arrive without knowing drug names. Every condition page must be optimized harder than every program page — richer meta descriptions, more thorough symptom and standard-of-care content for SEO depth, more internal linking from related pages, condition-specific Schema.org `MedicalCondition` markup. `/programs/:slug` pages are the conversion surfaces; `/conditions/:slug` pages are the acquisition surfaces.

**Long-tail target queries by page type:**

- `/conditions/:slug` → "{condition} experimental treatment Montana", "{condition} Right to Try", "{condition} Montana clinical trial"
- `/programs/:slug` → "{drug name} Montana", "{drug name} access", "{drug name} compassionate use"
- `/etcs/:slug` → "{ETC name} {city} Montana", "{ETC name} reviews", "Montana experimental treatment center"
- `/how-it-works` → "Montana Right to Try", "what is an ETC", "Montana SB 535"

### 26.3 Off-platform SEO

- Outreach to peer-reviewed publication channels (no link-buying)
- Partnerships with patient advocacy organizations for relevant conditions
- Press coverage on Montana RTT launch (WinSanTor PR support)

### 26.4 SEO non-goals

- No keyword stuffing
- No fake authority signals
- No paid placement that isn't disclosed
- No link-buying

---

## 27. Content Seed Data — Required at Launch

### 27.1 Programs

| Slug | Name | Status | Content owner |
|---|---|---|---|
| `wst-057` | WST-057® for diabetic peripheral neuropathy | Live, full content required | WinSanTor + Lewis editorial + counsel |
| (5 stubs) | Various "Coming soon" | Stub cards only | Lewis editorial |

### 27.2 ETCs

| Slug | Name | Status | Content owner |
|---|---|---|---|
| `big-sky` | Big Sky ETC | Live, full content required | Big Sky operator + Lewis editorial |

### 27.3 Conditions

Per § 2.4 Phase 1, four PN indications launch live (all linking to WST-057). PTSD ships as a Phase 2 "coming soon" stub. Long-tail conditions ship as "not currently offered" State C stubs.

| Slug | Name | State | Content owner |
|---|---|---|---|
| `diabetic-peripheral-neuropathy` | Diabetic peripheral neuropathy | Live (links to WST-057) | Lewis editorial |
| `chemotherapy-induced-peripheral-neuropathy` | Chemotherapy-induced peripheral neuropathy | Live (links to WST-057) | Lewis editorial |
| `hiv-induced-peripheral-neuropathy` | HIV-induced peripheral neuropathy | Live (links to WST-057) | Lewis editorial |
| `idiopathic-peripheral-neuropathy` | Idiopathic peripheral neuropathy | Live (links to WST-057) | Lewis editorial |
| `ptsd` | Post-traumatic stress disorder (PTSD) | Coming soon stub (Phase 2 — Psilocybin sponsor) | Lewis editorial |
| `als` | Amyotrophic Lateral Sclerosis | Not currently offered stub | Lewis editorial |
| `multiple-sclerosis` | Multiple Sclerosis | Not currently offered stub | Lewis editorial |
| `rare-cancers` | Rare cancers (umbrella) | Not currently offered stub | Lewis editorial |
| `autoimmune-diseases` | Autoimmune diseases (umbrella) | Not currently offered stub | Lewis editorial |

### 27.4 Critical content blockers

These specific content items must be cleared before public launch:

1. WST-057 Lancet eBioMedicine citation + DOI — clears `[COUNSEL REVIEW]` evidence marker
2. WST-057 cost range — clears `[COUNSEL REVIEW]` cost marker (WinSanTor + counsel sign-off)
3. Big Sky ETC license # — verify ETC-2025-001 is final and DPHHS-issued (not provisional)
4. Big Sky ETC medical director credentials — Dr. Helena Marsh MD profile content, clinical inquiry contact path
5. WST-057 program brief PDF — designed and approved
6. Founding-story copy for `/about` — Gabriel-authored, Stanley-approved
7. `/for-sponsors` first-draft sign-off — counsel review of the regulatory framing in § 21.3
8. `/for-etcs` first-draft sign-off — counsel review of the compliance-table claims in § 22.3
9. `/privacy`, `/terms`, `/cookies` — counsel-drafted, Lewis-approved
10. Eligibility self-screen fail copy — refined per § 17.4

### 27.5 Content workflow

- All copy authored in Markdown in the `apps/directory/content/` directory of the monorepo
- Counsel review tracked in the same directory via `<filename>.review.md` companion files
- `[COUNSEL REVIEW]` markers fail the build via lint
- Editorial sign-off recorded in commit messages

---

## 28. Technical Architecture & Bundle Discipline

### 28.1 Stack

- **Framework:** Vite + React + TypeScript (existing)
- **Routing:** React Router v6
- **Styling:** Tailwind CSS with custom design tokens (cream paper background, restrained serif headings, accent color for italicized words)
- **State:** React Query for server state; React Context for UI state
- **Auth:** Clerk SDK lazy-loaded only on `/connect/*` routes
- **Hosting:** Vercel (per main PRD)
- **CDN:** Cloudflare in front of Vercel for edge caching + rate limiting
- **Analytics:** PostHog (PHI-safe, anonymous-first; configured per main PRD § 24)

### 28.2 Bundle budget

- Above-the-fold homepage JS: < 120KB gzipped
- Below-the-fold: Lazy-loaded
- Clerk SDK: Excluded from any unauthenticated route; bundled only when user enters `/connect/*` post-conversion or accepts optional account creation

### 28.3 API surface (consumed by directory)

```
GET  /v1/public/programs                  — List of programs
GET  /v1/public/programs/:slug            — Program detail
GET  /v1/public/programs/:slug/brief.pdf  — Clinician brief PDF
GET  /v1/public/conditions                — Conditions index
GET  /v1/public/conditions/:slug          — Condition detail
GET  /v1/public/etcs                      — ETC index
GET  /v1/public/etcs/:slug                — ETC profile
GET  /v1/public/etcs/:slug/manual         — ETC P&P manual content
GET  /v1/public/etcs/:slug/etrb-report    — ETRB annual report content
GET  /v1/public/search?q=&type=           — Cross-content search
POST /v1/public/eligibility/:slug/start   — Mint anonymous session token
POST /v1/public/eligibility/sessions/:token/answers  — Submit answer
POST /v1/public/eligibility/sessions/:token/complete — Get result
POST /v1/public/connect-requests          — Submit connect form (anonymous)
POST /v1/public/email-signup              — Email notification signup (cond-specific or general)
POST /v1/public/feedback                  — Feedback form submission

// Semi-authenticated (Clerk required)
GET  /v1/patient/me/context               — Returns patient's linked records post-auth
POST /v1/patient/account/link-anonymous-screen — Link anonymous eligibility token to new account
```

### 28.4 Caching strategy

- Public read endpoints (`/v1/public/programs/*`, `/v1/public/etcs/*`, `/v1/public/conditions/*`): Cloudflare edge cache, 5-minute TTL with stale-while-revalidate
- Search: 60-second TTL on identical queries
- PDFs (`brief.pdf`): 1-hour edge cache, generated server-side from latest program data
- Sitemap: 1-hour edge cache, regenerated on program/ETC/condition data changes

### 28.5 Rate limiting

- All `/v1/public/*` endpoints: 60 req/min/IP at Cloudflare edge
- Search specifically: 30 req/min/IP
- Connect submission: 5 req/hour/IP
- Email signup: 3 req/hour/IP

### 28.6 Error handling

- Network errors render an in-place "Couldn't load" message with retry, never a full-page crash
- API errors that include validation messages render those messages to the user (e.g., form-field errors)
- 404s render the existing NotFoundPage with footer trust signal preserved
- 5xx errors render a minimal error page with support@lewis.health contact

### 28.7 Build pipeline

CI checks (must all pass to merge):

- TypeScript strict mode
- ESLint with custom Lewis voice rules (forbidden phrases lint)
- `[COUNSEL REVIEW]` marker check (build fails if found in committed copy)
- Bundle-size check against 120KB budget
- Lighthouse CI against accessibility + performance baselines
- Schema.org validation against published schemas
- Sitemap validity check
- Robots.txt validity check

---

## 29. Accessibility Requirements

### 29.1 WCAG 2.1 AA compliance

The directory targets WCAG 2.1 AA. Specific implementation requirements:

- **Keyboard navigation:** All interactive elements reachable and operable via keyboard (Tab, Shift+Tab, Enter, Space, arrow keys for radio groups)
- **Focus management:** Visible focus rings on all interactive elements; focus moves to page heading on route change; focus moves to step heading on eligibility step change
- **Screen reader announcements:**
  - Route changes announced to screen readers (`aria-live="polite"` region)
  - Eligibility step changes announced
  - Search result count changes announced
  - Form validation errors announced
- **No auto-advance** on radio inputs (already implemented per WCAG 2.2.1, 3.2.2)
- **Color contrast:** All text meets 4.5:1 ratio for normal text, 3:1 for large text. Accent color italics meet 4.5:1 against paper-cream background.
- **Alternative text:** All images and decorative elements have appropriate alt text or `aria-hidden="true"` for decorative-only
- **Forms:** All form fields have associated `<label>`, error messages tied to fields via `aria-describedby`, required fields marked with `aria-required="true"`

### 29.2 Reduced motion

- All animations honor `prefers-reduced-motion`
- Hero search pill rotating placeholder (if retained per § 11.3 decision) honors preference
- Page transitions degrade to instant change when preference is set

### 29.3 Specific patient-funnel a11y

- **Eligibility self-screen:** No auto-advance, focus management on step change, screen reader announcement of "Step X of Y", error states announced
- **Connect form:** Required field markers, error states announced, success state announced
- **Search overlay:** Esc closes overlay, focus returns to triggering element on close, results announced as they update

### 29.4 Testing

- **Automated:** axe-core in CI
- **Manual:** NVDA + JAWS + VoiceOver smoke tests on critical flows pre-launch
- **User testing:** at least one screen-reader user tests the full patient funnel before public launch

---

## 30. Analytics & Telemetry

### 30.1 Analytics platform

**Tool:** PostHog, configured per main PRD § 24 with PHI-safe defaults.

### 30.2 Events tracked

**Page-level:**

- `page.viewed` — every route view, with route slug
- `page.exit` — bounce vs. continue

**Funnel-level:**

- `homepage.search_submitted` — query string (PHI-redacted; condition keywords OK)
- `homepage.featured_condition_clicked` — condition slug (primary FeaturedConditions carousel)
- `homepage.featured_treatment_clicked` — program slug (secondary FeaturedTreatments carousel)
- `browse.filter_applied` — filter dimension and value
- `condition.viewed` — condition slug (primary patient waypoint; funnel-top metric)
- `condition.program_clicked` — condition slug + program slug (door-to-conversion transition: `/conditions/:slug` → `/programs/:slug`)
- `program.viewed` — program slug
- `program.eligibility_clicked` — program slug
- `program.brief_downloaded` — program slug
- `program.clinician_referred_clicked` — program slug
- `eligibility.started` — program slug
- `eligibility.completed` — program slug, pass/fail (no answer detail)
- `eligibility.fail_path_clicked` — which graceful path (reach-out / browse / clinicaltrials)
- `connect.form_started` — program slug
- `connect.form_submitted` — program slug, anonymous bool
- `connect.account_created_post_conversion` — program slug
- `connect.confirmed_viewed` — program slug

**B2B-level:**

- `for_sponsors.viewed`
- `for_sponsors.contact_clicked`
- `for_etcs.viewed`
- `for_etcs.contact_clicked`
- `for_clinicians.viewed`
- `platform.viewed`

**Search-level:**

- `search.opened` — overlay vs. page
- `search.query_submitted` — PHI-redacted query
- `search.result_clicked` — result type and target slug
- `search.no_results_path_clicked` — which fallback path

### 30.3 PHI-safe configuration

- No URLs containing PHI captured
- No form field values captured (PostHog autocapture disabled for inputs)
- IP addresses truncated at /24
- User agents truncated to OS+browser family
- No session replay on patient-facing flows

### 30.4 Reporting cadence

- **Weekly funnel review:** Lewis founding team
- **Monthly cohort analysis:** program-level conversion rates
- **Quarterly:** B2B funnel performance for sponsor and ETC tracks

---

## 31. Compliance & Counsel Review Gates

### 31.1 Counsel review checklist

The following must clear counsel review before public launch:

| Item | Counsel reviewer | Status |
|---|---|---|
| `/privacy` | Health-IT counsel | Pending engagement |
| `/terms` | Health-IT counsel | Pending engagement |
| `/cookies` (if separate) | Health-IT counsel | Pending engagement |
| `/programs/:slug` cost language | Biotech counsel + WinSanTor | Pending |
| `/programs/:slug` evidence language | Regulatory counsel | Pending |
| `/for-sponsors` regulatory framing | Biotech + regulatory counsel | Pending |
| `/for-etcs` compliance-table claims | Health-IT + regulatory counsel | Pending |
| `/for-clinicians` FDA pre-approval marketing posture | Regulatory counsel | Pending |
| Independence framing in footer | Health-IT counsel | Pending |
| Patient connect form privacy disclosure | Privacy counsel | Pending |

### 31.2 FDA pre-approval marketing posture

Lewis's primary regulatory exposure is FDA pre-approval marketing rules (21 CFR 312.7). The directory is structured to mitigate this exposure:

- Independent framing on every page (footer trust signal)
- No marketing language (per voice constraints in § 6)
- No price promotion — cost is disclosed factually, not promotional
- No efficacy claims beyond what the published evidence supports — counsel reviews each evidence citation
- No comparative claims against other treatments
- Sponsor identification limited — manufacturer name appears, but Lewis does not promote on sponsor's behalf

This posture must be reviewed by regulatory counsel familiar with 21 CFR 312.7 specifically before public launch.

### 31.3 HIPAA posture (directory)

The directory itself does not handle PHI. However:

- Connect form submissions do collect minimal contact information that, combined with the program context, could be considered PHI
- *Mitigation:* Connect form data is transmitted to ETCs over BAA-covered channels; Lewis acts as a Business Associate of the ETC for the duration of the handoff
- *Subprocessors handling connect form data:* Resend (email), Vercel (hosting), Cloudflare (edge), all under BAA per main PRD § 26

### 31.4 Subprocessor BAA list (P0 blocker for PHI handling)

| Subprocessor | Purpose | BAA status |
|---|---|---|
| Vercel Enterprise | Hosting | Required, pending |
| Cloudflare Enterprise | CDN, edge, rate limiting | Required, pending |
| Supabase Team | Postgres, RLS, storage | Required, pending |
| Clerk | Authentication (lazy-loaded, post-conversion only) | Required, pending |
| Resend | Transactional email (connect notifications) | Required, pending |
| Sentry Business | Error tracking (PHI-redacted) | Required, pending |
| PostHog | Analytics (PHI-safe configuration) | Required, pending |

All BAAs must be executed before the directory goes live to public traffic.

### 31.5 SB 535 / MAR 2026-427.1 traceability

Every directory feature must trace to a source statute or rule. Map:

| Feature | Source |
|---|---|
| Independent directory positioning | SB 535 § 4 (50-12-103) — manufacturer/HCP/HCF parallel actors |
| Eligibility self-screen | SB 535 § 8 (50-12-104) — patient eligibility requirements |
| Standard-of-care framing on conditions pages | RULE 12(2)(f), 50-12-104(1) — patient must evaluate other treatments |
| Informed consent framing on connect handoff | SB 535 § 9 (50-12-105) — informed consent requirements |
| ETRB approval reference on programs pages | RULE 16(6)(a) — ETRB protocol approval |
| ETC license badge on profile | RULE 5 — licensure requirements |
| Public P&P manual route | RULE 6(1) — public availability |
| Public ETRB report route | RULE 16(6)(c) — annual public report |
| HFAR explainer | SB 535 § 2 — Health Freedom and Access Requirement |
| FDA pre-approval marketing posture for clinicians | SB 535 § 12 (50-12-108) — disciplinary action prohibited |
| Independence/insurance disclaimer | SB 535 § 4 (33-1-102(2)(d)) — insurance code carve-out |

---

## 32. Build Plan — Prioritized Work Order

### 32.0 Shipped status

| Sprint | Theme | Status | Version | PR |
|---|---|---|---|---|
| Sprint 1 | Search backend FTS endpoint + overlay component foundation | ✅ **Shipped** | v0.0.7.0 (2026-04-29) | [#12](https://github.com/chiefnova/lewis/pull/12) |
| Sprint 2 | Conditions index + conditions detail templates (three states) | 🟡 Implemented locally; PR pending | v0.0.8.0 local | — |
| Sprint 3 | Programs page Evidence block + brief.pdf generation | ⏳ Pending | — | — |
| Sprint 4 | Homepage restructure + nav restructure + footer restructure | ⏳ Pending | — | — |
| Sprint 5 | Eligibility fail refinement + connect privacy framing + B2B page implementations | ⏳ Pending | — | — |
| Sprint 6 | Counsel reviews integrated, content finalized, launch readiness | ⏳ Pending | — | — |

**Sprint 1 — what shipped beyond the bare slice spec:**
- The full `/v1/public/search` API + Surface 1 overlay + Surface 2 results page (the explicit Sprint 1 deliverable).
- Plus the data layer Sprint 2 composes on top of: new `conditions` table + `program_conditions` join + 9 seeded conditions + RLS policies + trigger architecture (three SECURITY DEFINER `*_by_id` helpers + cascade helpers, no no-op `UPDATE` patterns).
- Plus a minimal `/conditions/:slug` page so search results land on a real route. Three-state UI (live / coming_soon / not_offered) was differentiated in Sprint 1; full PRD § 14.2 content depth is implemented locally in the Sprint 2 work.
- Plus PHI hardening (`sanitizeAccessLogMessage`), wordmark + Fraunces typography tightening across all three apps, the v1.1 condition-first PRD reframe (`docs/prd.md` split into `b2bprd.md` + `directoryprd.md`), and Hero static-placeholder per § 11.3.

### 32.1 P0 — Blocks public launch

These items must ship before any public traffic.

**Engineering (P0):**

- 🟡 `/conditions` index — the primary patient browse surface — **implemented locally in Sprint 2; PR pending**
- 🟡 `/conditions/:slug` template — three states (live, coming-soon, not-offered) — primary patient waypoint — **full Sprint 2 template implemented locally; PR pending**
- 🟡 `/conditions/:slug` first 5 condition pages — content + structured data — **implemented locally; counsel/editorial review pending**
- ✅ **`/search` real implementation — overlay + results page + backend FTS endpoint — shipped v0.0.7.0**
- ⏳ `/programs/:slug` Clinical Evidence block — new section above "Who this is for" — **Sprint 3**
- ⏳ `/programs/:slug/brief.pdf` — server-rendered PDF generation — **Sprint 3**
- ⏳ `/programs/wst-057` cost panel real content — clears `[COUNSEL REVIEW]` — **Sprint 3**
- ⏳ `/programs/wst-057` evidence link real content — clears `[COUNSEL REVIEW]` — **Sprint 3**
- ⏳ `/etcs/:slug` direct medical director contact line — for clinicians — **Sprint 4**
- ⏳ `/etcs/:slug/ae-summary` route removal — fold into `/etrb-report` — **Sprint 4**
- ⏳ Homepage section reordering — per § 11.1 — **Sprint 4**
- ⏳ Homepage `FeaturedConditions` block added as primary above-the-fold below hero (condition-first card grid with program sub-lines per § 11.4); existing `FeaturedTreatments` block demoted to secondary carousel below it (drug-first, visually subordinate per § 11.4b) — **Sprint 4**
- ✅ **Homepage hero placeholder revision — single static placeholder per § 11.3 — shipped v0.0.7.0**
- ⏳ Homepage AnnouncementStrip CTA wired or removed — per § 11.2 — **Sprint 4**
- ⏳ Homepage BeginningSection CTA wired or removed — per § 11.9 — **Sprint 4**
- ⏳ Homepage AbridgedFAQ — reduce 15 questions to 5, link to `/faq` for full — **Sprint 4**
- ⏳ TopNav restructure — add "Conditions" + secondary nav drawer — **Sprint 4**
- ⏳ Footer restructure — 5-column layout with bottom-bar trust signal — **Sprint 4**
- ⏳ All disabled CTAs across site — wired or removed (audit list per § 7.5) — **Sprint 4-5**
- ⏳ Eligibility fail branch refinement — three graceful paths per § 17.4 — **Sprint 5**
- ⏳ Connect form privacy framing block — per § 18.1 — **Sprint 5**
- ⏳ Connect form situation field made optional — per § 18.1 — **Sprint 5**
- ⏳ Account creation gate verification — anonymous submission accepted, account post-conversion only — **Sprint 5**
- ⏳ `/for-sponsors` full first-draft content — per § 21.3 — **Sprint 5**
- ⏳ `/for-etcs` full first-draft content — per § 22.3 — **Sprint 5**
- ⏳ Build pipeline `[COUNSEL REVIEW]` lint — fails build on found markers — **Sprint 6**

**Content (P0):**

- WST-057 Lancet eBioMedicine citation + DOI + counsel sign-off
- WST-057 cost range + WinSanTor + counsel sign-off
- WST-057 clinical brief PDF design + content
- Big Sky ETC profile content (license #, medical director credentials, contact paths)
- First 5 condition pages content
- Homepage hero subhead naming live condition (e.g., "Currently offering treatments for diabetic peripheral neuropathy") — content-managed string per § 11.3 revision
- AbridgedFAQ 5 questions (homepage)
- `/for-sponsors` counsel review of regulatory claims
- `/for-etcs` counsel review of compliance-table claims
- `/about` founding story + leadership content
- `/privacy`, `/terms`, `/cookies` counsel-drafted
- Eligibility fail branch refined copy

**Compliance (P0):**

- All subprocessor BAAs executed
- FDA pre-approval marketing posture review by regulatory counsel
- Independence framing review by health-IT counsel
- Patient connect form privacy disclosure review

### 32.2 P1 — Within 2 weeks of launch

**Engineering (P1):**

- `/about` page implementation
- `/for-clinicians` page implementation
- `/platform` page implementation
- `/how-it-works` page implementation
- `/faq` canonical extended page implementation (5 groups)
- `/feedback` form implementation + routing to support@lewis.health
- Email signup wiring (homepage + condition-specific signup on coming-soon condition pages)
- `/etcs` index implementation (manual entries until Bounds sync)

**Content (P1):**

- `/for-clinicians` first-draft copy
- `/platform` first-draft copy + architecture diagram
- `/how-it-works` first-draft copy
- `/faq` 38-question canonical content
- `/about` complete content with leadership bios
- `/feedback` form copy

### 32.3 P2 — Within 4-6 weeks of launch

**Engineering (P2):**

- `/etcs/:slug/manual` real rendering from `app.lewis.health` (after operating platform live)
- `/etcs/:slug/etrb-report` real rendering from `app.lewis.health`
- Bounds integration job for nightly DPHHS ETC license sync
- Search V2 — disambiguation improvements, query expansion
- Conditions library expanded to 15-20 entries

**Content (P2):**

- 10-15 additional condition pages
- Clinical briefs for each new program as they onboard
- Quarterly content review cadence established

### 32.4 Sprint structure

Recommended 6-sprint plan to public launch:

- ✅ **Sprint 1 (Week 1) — Shipped v0.0.7.0 (2026-04-29):** Search backend FTS endpoint + overlay component foundation. Plus the data layer (conditions table + RLS + triggers + 9 seeded conditions) and a minimal `/conditions/:slug` route so search hits land on a real page. See § 32.0 for full delivery scope. PR: [#12](https://github.com/chiefnova/lewis/pull/12).
- 🟡 **Sprint 2 (local implementation in review):** Conditions index + conditions detail templates (three states)
- ⏳ **Sprint 3:** Programs page Evidence block + brief.pdf generation
- ⏳ **Sprint 4:** Homepage restructure + nav restructure + footer restructure
- ⏳ **Sprint 5:** Eligibility fail refinement + connect privacy framing + B2B page implementations
- ⏳ **Sprint 6:** Counsel reviews integrated, content finalized, launch readiness

**Public launch target:** end of Sprint 6, contingent on counsel sign-off and BAA execution.

---

## 33. Acceptance Criteria & Launch Gates

### 33.1 Per-route acceptance criteria

**`/` (Homepage):**

- [ ] Hero loads with single static placeholder reading "Search by your condition"
- [ ] Hero subhead names live conditions (e.g., "Currently offering treatments for diabetic peripheral neuropathy")
- [ ] Section order: Hero → FeaturedConditions → FeaturedTreatments → HowItWorks → ProblemSection → ForPhysicians → AbridgedFAQ → BeginningSection
- [ ] FeaturedConditions block names conditions, not drugs; sub-lines reference programs
- [ ] FeaturedConditions CTA reads "Browse all conditions" and routes to `/conditions`
- [ ] FeaturedTreatments secondary carousel sits directly below FeaturedConditions with visually subordinate weight
- [ ] FeaturedTreatments CTA reads "Browse all treatments" and routes to `/browse`
- [ ] AnnouncementStrip CTA wired (or removed)
- [ ] BeginningSection CTA wired (or removed)
- [ ] AbridgedFAQ shows 5 questions, link to `/faq`
- [ ] All CTAs functional
- [ ] Bundle size ≤ 120KB above-the-fold

**`/browse`:**

- [ ] Filter rail wired and functional
- [ ] Sort dropdown wired
- [ ] Bottom email signup CTA wired (or removed)
- [ ] Schema.org `ItemList` JSON-LD valid

**`/programs/:slug`:**

- [ ] Clinical Evidence block present with citation, DOI, ETRB approval
- [ ] Cost panel `[COUNSEL REVIEW]` cleared
- [ ] Evidence link `[COUNSEL REVIEW]` cleared
- [ ] "Refer this patient" clinician CTA present
- [ ] "Download clinical brief" CTA functional, returns PDF
- [ ] "Used Lewis? Share Feedback" CTA wired (or removed)
- [ ] Schema.org `Drug` JSON-LD valid with augmentations

**`/programs/:slug/brief.pdf`:**

- [ ] PDF generates server-side
- [ ] Includes all required sections per § 15.6
- [ ] Filename: `lewis-brief-{drug-slug}-{yyyymmdd}.pdf`
- [ ] Cached at edge with 1-hour TTL

**`/conditions`:**

- [ ] All 5 launch conditions render
- [ ] Status indicators correct
- [ ] Schema.org structured data per page

**`/conditions/:slug`:**

- [ ] Three states (Live, Coming-soon, Not-offered) all render correctly
- [ ] Standard-of-care section present per RULE 12(2)(f)
- [ ] Schema.org `MedicalCondition` JSON-LD valid
- [ ] clinicaltrials.gov fallback link works

**`/etcs`:**

- [ ] Big Sky ETC visible
- [ ] List + map view both functional
- [ ] Filters work (region, programs, accepting new patients)

**`/etcs/:slug`:**

- [ ] License badge with #
- [ ] Medical director with credentials and direct clinical contact path
- [ ] Public documents (manual + ETRB report) linked
- [ ] Schema.org `MedicalClinic` JSON-LD valid

**`/etcs/:slug/manual` and `/etcs/:slug/etrb-report`:**

- [ ] Render real content (or "Coming soon — auto-rendered from app.lewis.health" placeholder)

**`/search`:**

- [ ] In-place overlay functional from TopNav magnifier
- [ ] In-place overlay functional from homepage hero
- [ ] In-place overlay live-suggest results ordered: Conditions first, Treatments second, ETCs third
- [ ] Results page sections ordered: CONDITIONS, TREATMENTS, ETCs (in that order)
- [ ] Disambiguation surfaces conditions before treatments for ambiguous queries
- [ ] Empty-results path includes graceful fallback
- [ ] Empty-query state shows "Recent on Lewis"
- [ ] Disambiguation works for ambiguous queries

**`/eligibility/:programSlug`:**

- [ ] All 4 questions render
- [ ] No auto-advance
- [ ] Anonymous token persisted in localStorage
- [ ] Server bootstrap via `POST /v1/public/eligibility/:slug/start` wired
- [ ] WCAG 2.1 AA compliant

**`/eligibility/:programSlug/result`:**

- [ ] Pass branch shows "may be a fit" + connect CTA
- [ ] Fail branch shows specific failed criterion
- [ ] Fail branch shows three graceful paths
- [ ] All paths functional

**`/connect/:programSlug`:**

- [ ] Privacy framing block above form
- [ ] Situation textarea is optional
- [ ] Anonymous submission accepted (no Clerk gate)
- [ ] Eligibility token attached to submission
- [ ] Submission emails ETC

**`/connect/confirmed`:**

- [ ] Confirmation message
- [ ] 4-item prep checklist
- [ ] Optional account creation CTA (lazy-loaded Clerk)

**`/for-clinicians`:**

- [ ] First-draft content per § 20.3
- [ ] FDA pre-approval marketing posture cites SB 535 § 12 verbatim
- [ ] Brief library (initially WST-057's only) functional

**`/for-sponsors`:**

- [ ] Full first-draft content per § 21.3
- [ ] Two-paths section explicit
- [ ] Counsel sign-off obtained
- [ ] sponsors@lewis.health mailto functional

**`/for-etcs`:**

- [ ] Full first-draft content per § 22.3
- [ ] Compliance-table accurate per current rules
- [ ] Counsel sign-off obtained
- [ ] operators@lewis.health mailto functional

**`/platform`:**

- [ ] Module list complete
- [ ] Compliance mapping table accurate
- [ ] Architecture diagram present

**`/about`:**

- [ ] Founding story per § 24.2
- [ ] Leadership content
- [ ] press@lewis.health and investors@lewis.health mailtos functional
- [ ] Independence statement clear

**`/feedback`:**

- [ ] Persona selector functional
- [ ] All Share Feedback CTAs across site link here

**`/privacy`, `/terms`, `/cookies`:**

- [ ] Counsel-drafted, Lewis-approved
- [ ] Address all topics in § 25

**`/how-it-works`:**

- [ ] All 9 sections present per § 19.1
- [ ] Plain-language voice maintained
- [ ] Source citations included

**`/faq`:**

- [ ] All 5 groups present (38 total questions)
- [ ] Accordion behavior accessible

### 33.2 Cross-cutting acceptance criteria

**Voice and copy:**

- [ ] No `[COUNSEL REVIEW]` markers in committed copy
- [ ] No forbidden phrases (per § 6.3)
- [ ] No exclamation points
- [ ] No emoji
- [ ] Italic-accent pattern applied consistently

**Navigation:**

- [ ] TopNav order: Wordmark, Conditions, Browse Treatments, magnifier, More menu
- [ ] "Conditions" link is plain text (not pill); "Browse Treatments" is outline pill (visually subordinate)
- [ ] Mobile nav drawer prioritizes Conditions before Browse Treatments

**Accessibility:**

- [ ] Lighthouse accessibility score ≥ 95
- [ ] axe-core zero critical violations
- [ ] NVDA, JAWS, VoiceOver smoke tests pass
- [ ] Keyboard navigation full coverage
- [ ] One screen-reader user has tested the patient funnel

**Performance:**

- [ ] Above-the-fold homepage JS ≤ 120KB
- [ ] Lighthouse performance score ≥ 90
- [ ] Largest Contentful Paint < 2.5s on 4G
- [ ] First Input Delay < 100ms
- [ ] Cumulative Layout Shift < 0.1

**SEO:**

- [ ] Sitemap.xml validates and submits to Google Search Console
- [ ] All schema.org JSON-LD validates
- [ ] All pages have unique title + meta description
- [ ] All pages have canonical URL
- [ ] OpenGraph + Twitter card meta on all pages

**Compliance:**

- [ ] All subprocessor BAAs executed
- [ ] Counsel sign-off on all `[COUNSEL REVIEW]` items
- [ ] FDA pre-approval marketing posture review complete
- [ ] HIPAA posture for connect form data documented

**Analytics:**

- [ ] PostHog configured with PHI-safe defaults
- [ ] All events from § 30.2 instrumented
- [ ] No PHI captured in URLs, autocapture, or session replay

### 33.3 Launch gate

A formal go/no-go review against this acceptance criteria checklist must occur before public launch. Sign-offs required from:

- Founding Product (Gabriel)
- Engineering lead
- Design lead (TBD)
- Health-IT counsel
- WinSanTor as design partner sponsor
- Big Sky ETC as design partner ETC

If any gate fails, launch is delayed until resolved.

---

## 34. Open Questions

The following items require resolution before or during the build phase.

### 34.1 Product / strategic

- `/cookies` separate page or fold into `/privacy`? Decision pending counsel engagement.
- Email signup endpoint scope: general newsletter, condition-specific notifications, or both?
- "Get notified" CTAs wired to what — a single endpoint with subject line, or separate flows?
- Search empty-state "Recent on Lewis": auto-populated from analytics, or manually curated?
- Conditions index grouping: strict alphabetical, or grouped by body system / therapeutic area?
- ETC profile claim status: how does an unclaimed ETC sourced from public records get claimed? (Phase 2 question, but worth flagging)
- Brief PDF design: outsourced to design partner, or internal? If internal, who designs?
- `/about` press contact: who handles inbound press inquiries while Lewis is pre-revenue?
- `/about` investor contact: does this exist at MVP 0, or wait until first capital raise?
- Homepage hero subhead is content-managed and references currently-live conditions. As more conditions onboard, who maintains the subhead string and what's the update cadence? (Likely: Lewis editorial; on every program/condition activation.)

### 34.2 Engineering / technical

- PDF generation library: server-side via puppeteer, or a lighter-weight option (jsPDF, PDFKit)?
- Vite SSG vs. SPA prerendering: which approach for `/programs/:slug`, `/etcs/:slug`, `/conditions/:slug`?
- Bounds integration cadence: nightly cron, or webhook-driven from DPHHS?
- Search backend: Postgres FTS sufficient, or move to a dedicated search service (Typesense, Meilisearch)?
- Email service: Resend confirmed, or evaluate alternatives?
- Mapbox key + budget: what's the cost ceiling for the ETC index map?

### 34.3 Content / regulatory

- WST-057 published evidence link: Lancet eBioMedicine paper — exact citation + DOI?
- WST-057 cost range: vetted by WinSanTor and counsel — what's the language?
- FDA pre-approval marketing posture review: which regulatory counsel firm?
- Big Sky ETC license #: confirm ETC-2025-001 is final and DPHHS-issued?
- Big Sky ETC P&P manual: when does it exist in real form for `/etcs/:slug/manual`?
- Big Sky ETC ETRB: when does the first annual public report exist?
- "Net annual profits" interpretation for HFAR: counsel input needed for how this is calculated for both partner-ETC and own-ETC paths.
- Multi-state expansion: when does Phase 3+ expansion start, and how does it affect the directory's Montana-specific framing?

### 34.4 Brand / visual

- Final wordmark: Lewis "wordmark with italic 'health' in accent color" — design system tokens locked?
- Color palette: paper-cream + accent + neutrals — finalized?
- Typography: serif headline font + body sans — selected?
- Photography style: product photographs against paper-cream — design partner who shoots?
- Illustration style: RoundTablet, Vial, Capsule — who illustrates?

### 34.5 Operational

- Email aliases: support@, sponsors@, operators@, clinicians@, press@, investors@ — provisioned?
- DNS: lewis.health purchased? lewis.co, lewishealth.com, uselewis.com defensive registrations?
- USPTO trademark: Class 042 (software), Class 044 (medical) for "Lewis" and "Lewis Health" — searched and filed?
- Hosting accounts: Vercel, Cloudflare, Supabase, Clerk, Resend, Sentry, PostHog — all provisioned with BAA contracts?
- Monitoring + on-call: who's paged when production incidents occur?

---

## Appendix A — Voice cheat sheet for copy team

**Use:**

- "Find experimental treatments available in Montana."
- "Some treatments don't exist anywhere else."
- "Lewis never charges patients."
- "Three steps. No account required to browse."
- "Investigational" / "experimental" / "not yet FDA-approved" — never "breakthrough"
- "May be a fit" / "may not be a fit" — never "qualified" / "approved"
- "Treating physician" — never "your doctor"
- "Connect" — never "match" / "join" / "sign up"
- "Conditions" / "your condition" — primary patient framing
- "Treatments" / "programs" — secondary, downstream of condition
- "Coming soon for {condition}" — never "Coming soon — {drug class}"

**Don't use:**

- "Take control of your health journey"
- "Join thousands of patients"
- "Limited spots available"
- "Discover breakthrough treatments"
- "Get matched to your perfect treatment"
- "Don't wait — apply today"
- Any exclamation point
- Any emoji
- "Empower," "transform," "unlock," "discover"
- "We're excited to announce"
- Don't lead with drug names in patient-facing copy. The patient doesn't know the drug name. Lead with the condition; the drug is a result.

**Always cite the law:**

- SB 535 by section: SB 535 § 7 (50-12-103)
- MAR rules by RULE number: RULE 16(6)(a)
- Federal: 21 CFR 312.7

---

## Appendix B — Acceptance criteria quick checklist (pre-launch)

- [ ] All routes from § 9 implemented or correctly placeholder
- [ ] All `[COUNSEL REVIEW]` markers cleared
- [ ] All disabled CTAs wired or removed
- [ ] Bundle ≤ 120KB above-the-fold
- [ ] Lighthouse performance ≥ 90
- [ ] Lighthouse accessibility ≥ 95
- [ ] Schema.org structured data on all required pages
- [ ] sitemap.xml + robots.txt correct
- [ ] All BAAs executed
- [ ] Counsel sign-off on regulatory claims
- [ ] FDA pre-approval marketing posture reviewed
- [ ] Founding-product, engineering, design, counsel, design partners all signed off
- [ ] PostHog configured with PHI-safe defaults
- [ ] Email aliases provisioned and tested
- [ ] DNS + domain + trademark in place
- [ ] On-call + monitoring rotation established

---

## Revision History

- **v1.1** (2026-04-29) — Condition-first patient mental model reframe applied. See § 8.1 leading principle. Includes high-priority follow-up fixes: § 8.2 IA map route order swapped (Conditions before Browse); § 9 site-map `/` purpose updated; § 11.1 + § 11.4b dual-carousel spec (FeaturedConditions primary, FeaturedTreatments secondary); § 12.1 funnel YES branch routes through `/conditions/:slug` waypoint; § 30.2 analytics events extended (`condition.viewed`, `condition.program_clicked`, `homepage.featured_condition_clicked`). Plus medium-priority follow-ups: § 9 site-map purpose lines for `/conditions`, `/conditions/:slug`, and `/browse` rewritten to name the primary-patient-browse + highest-value-SEO dual role for conditions and the explicit demotion of `/browse` to secondary drug-first / power-user surface. Plus § 12.2 Decision 1 drop-off cause rewritten for the post-condition-first failure mode. Plus new § 2.4 Sponsor & Condition Rollout Strategy capturing the slow-sniper rollout (Phase 1 WST-057 across 4 PN indications with Big Sky ETC; Phase 2 Psilocybin for PTSD; Phase 3 broader biotech onboarding); § 11.4 carousel updated to 4 live PN cards + Coming-soon-for-PTSD; § 14.4 launch list and § 27.3 conditions seed updated to match. Plus new § 13.5 Off-topic queries — search relevance must respect query semantics (an ALS query never promotes WST-057 as a primary match).
- **v1.0** (2026-04-29) — Initial build-ready specification.

---

**End of PRD**

This document is the canonical specification for `lewis.health`. Engineering, design, and copy execute against it. Updates require version increment and Founding Product approval. Questions in § 34 are tracked in the Lewis project tracker until resolved; resolved questions are folded back into the relevant section in the next PRD revision.
