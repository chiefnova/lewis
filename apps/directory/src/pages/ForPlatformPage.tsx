import type { ReactNode } from "react";
import { FormattedMessage } from "react-intl";

import { FloatingCta } from "../components/FloatingCta";
import { useSeo, siteUrl } from "../seo/useSeo";

/**
 * Slice 5 § 23 — /platform — connecting-tissue explainer of app.lewis.health.
 *
 * Round 6 winner: rejected the feature-catalog framing in favor of a
 * connecting-tissue narrative. Lewis exists because Right to Try in
 * Montana is a four-actor regime (manufacturers · ETCs · clinicians · patients)
 * where every meaningful action is one party handing a regulated artifact
 * to another on a statutory clock. The handoffs table (12 rows) is the
 * load-bearing element of the page.
 *
 * Section order, top to bottom:
 *   1. Substrate paragraph (PRD § 23.2 verbatim)
 *   2. "Why this platform exists." — 3 numbered editorial beats (regime
 *      <18 months old, ~50 deliverables + retention windows, four-actor
 *      market of handoffs needs connecting tissue)
 *   3. "The regime is a market of handoffs." — 12-row table:
 *      From · Hands off · To · Statutory basis · Lewis module
 *   4. "What changes when the handoff goes through Lewis." — 4 persona
 *      before/after rows (patients · clinicians · manufacturers · ETC operators)
 *   5. "The modules, in service of the handoffs." — 10-row module list
 *   6. "Compliance mapping." — 19-row RULE → module → audit evidence table
 *   7. "Security & compliance posture." — 6-card grid (vendor-genericized)
 *   8. CTA block — email hello@lewis.health to schedule a demo
 *
 * Statutory anchors (every citation verified line-by-line against
 * docs/legislation/sb535.md and docs/legislation/etc.md):
 * - § 50-12-103(1) — manufacturer/HCP/HCF may make experimental treatment
 *   available (manufacturer → ETC handoff statutory basis)
 * - § 50-12-104(2) — treating health care provider recommendation (the
 *   patient-eligibility prerequisite; lands in patient file under RULE
 *   12(2)(b)(ii); SEPARATE FROM ETRB protocol approval)
 * - § 50-12-105 — written informed consent + § 50-12-105(3)(b) recorded
 *   informed consent (audio/video/digital platform)
 * - RULE 11 — patient agreement (admission, billing, grievance — NOT the
 *   same as informed consent)
 * - RULE 16(6)(a) — ETRB reviews and approves PROTOCOLS at the program/
 *   drug level (NOT individual patient enrollments). RULE 16(6)(c) annual
 *   public report. RULE 16(6)(d) 5-year ETRB record retention.
 * - RULE 17 — 5-day adverse-event clock to DPHHS
 * - RULE 22(2)(a) — annual report due January 31; RULE 22(2)(b) DPHHS
 *   may reduce license to provisional for missing the report
 * - SB 535 § 2 — HFAR 2% of net annual profits, due February 1
 *
 * Same chrome as /for-clinicians, /for-manufacturers, /for-etcs:
 *   - centered 720px editorial lane
 *   - prose, headings, tables, change rows, security cards, and signoff share
 *     the same left and right edge
 *   - shared <FloatingCta> pinned to the viewport bottom for conversion
 *
 * Voice: peer-level, calm, factual. The /platform page is cross-persona
 * (patients + manufacturers + ETCs) but speaks to a sophisticated B2B audience
 * since the path here is via "Operating platform" links from /for-manufacturers
 * and /for-etcs. Email: hello@lewis.health for demos.
 */
export function ForPlatformPage() {
  useSeo({
    title: "The operating platform behind every Montana ETC — Lewis Health",
    description:
      "Lewis is the connecting tissue between manufacturers, ETCs, clinicians, patients, and DPHHS under Montana's SB 535 — orchestrating twelve mandatory regulatory handoffs across four actor classes through one platform with a complete audit trail. Built for SB 535 + MAR 2026-427.1.",
    canonical: siteUrl("/platform"),
  });

  return (
    <>
      <div className="for-plat fade-up">
        <div className="for-plat__letter-col">
          <h1 className="for-plat__h1 serif">
            <FormattedMessage
              id="directory.for_platform.h1"
              defaultMessage="The operating platform behind every {em}"
              values={{
                em: (
                  <em className="for-plat__h1-em">
                    <FormattedMessage
                      id="directory.for_platform.h1.em"
                      defaultMessage="Montana ETC."
                    />
                  </em>
                ),
              }}
            />
          </h1>

          <div className="for-plat__letter">
            {/* Substrate paragraph — PRD § 23.2. Editorial prose; no
                callout wrapper per user direction (matches the
                letter-style flow used on /for-clinicians et al.). */}
            <p>
              <FormattedMessage
                id="directory.for_platform.substrate.p1"
                defaultMessage="The operating platform Lewis runs at {appHref} is the system of record for Montana's Experimental Treatment Center regime. Every protocol approved by an ETRB, every patient file under RULE 12, every adverse event reported within the 5-day clock under RULE 17, every quarterly QAPI meeting under RULE 15, every annual report due to DPHHS by January 31 under RULE 22 — they all flow through one platform."
                values={{
                  appHref: <strong>app.lewis.health</strong>,
                }}
              />
            </p>
            <p className="for-plat__lede">
              <FormattedMessage
                id="directory.for_platform.substrate.lede"
                defaultMessage="Lewis is the substrate. The clinic operates; the platform records."
              />
            </p>

            <h2>
              <FormattedMessage
                id="directory.for_platform.why.h2"
                defaultMessage="Why this platform exists."
              />
            </h2>

            <h3>
              <span className="for-plat__num">i.</span>
              <FormattedMessage
                id="directory.for_platform.why.regime.h3"
                defaultMessage="The regime is brand new."
              />
            </h3>
            <p>
              <FormattedMessage
                id="directory.for_platform.why.regime.p"
                defaultMessage="SB 535 was signed into Montana law in {may2025}. MAR Notice 2026-427.1 — the 25 RULES the centers actually operate under — was published in {apr2026}. {accent} Manufacturers and ETC operators looking to stand up Montana programs in 2026 had three options: build it themselves, glue together SaaS that was never designed for SB 535, or wait. None of those produce auditable evidence on day one."
                values={{
                  may2025: <strong>May 2025</strong>,
                  apr2026: <strong>April 2026</strong>,
                  accent: (
                    <em className="for-plat__accent">
                      <FormattedMessage
                        id="directory.for_platform.why.regime.accent"
                        defaultMessage="No fit-for-purpose software existed."
                      />
                    </em>
                  ),
                }}
              />
            </p>

            <h3>
              <span className="for-plat__num">ii.</span>
              <FormattedMessage
                id="directory.for_platform.why.surface.h3"
                defaultMessage="The compliance surface is wide and the deadlines are real."
              />
            </h3>
            <p>
              <FormattedMessage
                id="directory.for_platform.why.surface.p"
                defaultMessage="{lead} RULE 17 requires every adverse event reported to DPHHS {fiveDay}. RULE 22 requires an annual report submitted by {jan31}. SB 535 § 2 requires the HFAR contribution by {feb1}. RULE 22(2)(b) gives DPHHS the authority to reduce a center's license to provisional status for missing the report, with RULE 22(2)(c) reserving further licensing action for continued noncompliance. Patient files carry a {fiveYear} retention lock. There is no slack in the schedule."
                values={{
                  lead: <strong>25 RULES, ~50 deliverables, four hard retention windows.</strong>,
                  fiveDay: <em>within 5 days</em>,
                  jan31: <em>January 31</em>,
                  feb1: <em>February 1</em>,
                  fiveYear: <em>5-year post-discharge</em>,
                }}
              />
            </p>

            <h3>
              <span className="for-plat__num">iii.</span>
              <FormattedMessage
                id="directory.for_platform.why.sides.h3"
                defaultMessage="Right to Try only works if the four sides connect."
              />
            </h3>
            <p>
              <FormattedMessage
                id="directory.for_platform.why.sides.p"
                defaultMessage="A patient cannot enroll at a Montana ETC without three things landing together: an ETRB-approved protocol for the treatment (RULE 16(6)(a) — the board reviews the program and the drug, not the individual patient), a recommendation from a treating health care provider (§ 50-12-104(2)), and written informed consent (§ 50-12-105). An ETC cannot offer a protocol in the first place without a signed program participation agreement from the manufacturer and ETRB sign-off on the protocol. A manufacturer cannot place a drug into the Montana regime without finding a Montana-licensed ETC, signing a PPA with it, and clearing that ETC's ETRB. {accent} Lewis is the substrate those handoffs ride on — so each party can do its job without re-inventing the connecting tissue."
                values={{
                  accent: (
                    <em className="for-plat__accent">
                      <FormattedMessage
                        id="directory.for_platform.why.sides.accent"
                        defaultMessage="The regime is a market of handoffs."
                      />
                    </em>
                  ),
                }}
              />
            </p>

            <h2>
              <FormattedMessage
                id="directory.for_platform.handoffs.h2"
                defaultMessage="The regime is a market of handoffs."
              />
            </h2>
            <p>
              <FormattedMessage
                id="directory.for_platform.handoffs.intro"
                defaultMessage="Right-to-Try in Montana is a four-actor system: {manufacturers} who own the drug and protocol, {etcs} who operate the clinic and the ETRB, {clinicians} who refer their patient, and {patients} who consent and pay. Every meaningful action in the regime is one party handing a regulated artifact to another, on a statutory clock. Lewis exists because {accent} — and writing that down once, correctly, is what the platform does."
                values={{
                  manufacturers: <strong>manufacturers</strong>,
                  etcs: <strong>ETCs</strong>,
                  clinicians: <strong>clinicians</strong>,
                  patients: <strong>patients</strong>,
                  accent: (
                    <em className="for-plat__accent">
                      <FormattedMessage
                        id="directory.for_platform.handoffs.intro.accent"
                        defaultMessage="each handoff has a specific shape, a specific witness, and a specific record"
                      />
                    </em>
                  ),
                }}
              />
            </p>

            <table
              className="for-plat__ds-table for-plat__handoffs"
              aria-label="Mandatory regulatory handoffs across the Montana ETC regime"
            >
              <colgroup>
                <col className="for-plat__handoffs-col-from" />
                <col className="for-plat__handoffs-col-what" />
                <col className="for-plat__handoffs-col-to" />
                <col className="for-plat__handoffs-col-stat" />
                <col className="for-plat__handoffs-col-lewis" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">
                    <FormattedMessage
                      id="directory.for_platform.handoffs.col.from"
                      defaultMessage="From"
                    />
                  </th>
                  <th scope="col">
                    <FormattedMessage
                      id="directory.for_platform.handoffs.col.what"
                      defaultMessage="Hands off"
                    />
                  </th>
                  <th scope="col">
                    <FormattedMessage
                      id="directory.for_platform.handoffs.col.to"
                      defaultMessage="To"
                    />
                  </th>
                  <th scope="col">
                    <FormattedMessage
                      id="directory.for_platform.handoffs.col.statute"
                      defaultMessage="Statutory basis"
                    />
                  </th>
                  <th scope="col">
                    <FormattedMessage
                      id="directory.for_platform.handoffs.col.lewis"
                      defaultMessage="Lewis module"
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                <HandoffRow
                  from="Manufacturer"
                  what="Drug + protocol + program participation agreement"
                  to="ETC"
                  statute={
                    <>
                      § 50-12-103(1) <span className="for-plat__handoffs-arrow">·</span> MAR RULE 16
                    </>
                  }
                  lewis="PPA tracking + ETRB submission"
                />
                <HandoffRow
                  from="ETC ETRB"
                  what="Protocol approval + minutes"
                  to="Manufacturer + ETC operations"
                  statute={
                    <>
                      RULE 16(6)(a) <span className="for-plat__handoffs-arrow">·</span> RULE
                      16(6)(d) 5-yr retain
                    </>
                  }
                  lewis="ETRB workflow — voting + timestamps"
                />
                <HandoffRow
                  from="ETC ETRB"
                  what="Annual public report"
                  to="Public"
                  statute={<>RULE 16(6)(c)</>}
                  lewis="ETRB module — auto-generated"
                />
                <HandoffRow
                  from="Clinician"
                  what="Recommendation letter + referral"
                  to="ETC"
                  statute={
                    <>
                      § 50-12-104(2) <span className="for-plat__handoffs-arrow">·</span> RULE
                      12(2)(b)(ii)
                    </>
                  }
                  lewis="Connect form — referral attachment"
                />
                <HandoffRow
                  from="Patient"
                  what="Connect request + eligibility token"
                  to="ETC"
                  statute={<>(directory layer)</>}
                  lewis="Patient intake — connect handoff"
                />
                <HandoffRow
                  from="Patient"
                  what="Written informed consent (recorded)"
                  to="ETC + Lewis (storage of record)"
                  statute={<>§ 50-12-105</>}
                  lewis="Patient intake — recorded consent"
                />
                <HandoffRow
                  from="Patient"
                  what="Patient agreement (admission, billing, grievance)"
                  to="ETC"
                  statute={<>RULE 11</>}
                  lewis="Patient intake — patient agreement"
                />
                <HandoffRow
                  from="ETC"
                  what="Treatment documentation + drug accountability"
                  to="Patient file"
                  statute={
                    <>
                      RULE 12 <span className="for-plat__handoffs-arrow">·</span> RULE 13
                    </>
                  }
                  lewis="Treatment module + lot tracking"
                />
                <HandoffRow
                  from="ETC"
                  what="Adverse event report"
                  to="DPHHS"
                  statute={
                    <>
                      RULE 17 <span className="for-plat__handoffs-arrow">·</span>{" "}
                      <strong>5-day clock</strong>
                    </>
                  }
                  lewis="AE workflow with countdown"
                />
                <HandoffRow
                  from="ETC"
                  what="Annual report"
                  to="DPHHS"
                  statute={
                    <>
                      RULE 22 <span className="for-plat__handoffs-arrow">·</span>{" "}
                      <strong>due Jan 31</strong>
                    </>
                  }
                  lewis="DPHHS annual report assembly"
                />
                <HandoffRow
                  from="ETC"
                  what="HFAR contribution (2% net profit)"
                  to="DPHHS"
                  statute={
                    <>
                      SB 535 § 2 <span className="for-plat__handoffs-arrow">·</span>{" "}
                      <strong>due Feb 1</strong>
                    </>
                  }
                  lewis="HFAR Path B workflow"
                />
                <HandoffRow
                  from="Manufacturer"
                  what="Per-program audit evidence pack"
                  to="Manufacturer counsel / FDA"
                  statute={<>(manufacturer-side QA)</>}
                  lewis="Per-program audit export"
                />
              </tbody>
            </table>
            <p className="for-plat__handoffs-coda">
              <FormattedMessage
                id="directory.for_platform.handoffs.coda"
                defaultMessage="Twelve handoffs, four actor classes, statutory clocks on three of them (RULE 17's 5-day AE clock, RULE 22's January 31 annual report, SB 535 § 2's February 1 HFAR submission). Every row has a defined start, a defined end, a defined artifact, and a defined retention window. The platform's job is to make sure none of them are written by hand."
              />
            </p>

            <h2>
              <FormattedMessage
                id="directory.for_platform.changes.h2"
                defaultMessage="What changes when the handoff goes through Lewis."
              />
            </h2>
            <p>
              <FormattedMessage
                id="directory.for_platform.changes.intro"
                defaultMessage="Each persona's job stays the same — the substrate underneath changes. The platform absorbs the connecting work so the parties can stay focused on their actual roles."
              />
            </p>

            <div className="for-plat__changes">
              <ChangeRow
                who="Patients"
                lane="Discovery → consent"
                before="Email the manufacturer cold, hope someone replies. No clear picture of which Montana centers can actually administer the drug."
                after="Browse a public directory anonymously, self-screen against the protocol, and route a connect request to the right ETC with the eligibility token attached."
              />
              <ChangeRow
                who="Clinicians"
                lane="Refer → letter"
                before="Compose a recommendation letter in a Word doc, fax or email it, and hope the ETC has the right form on its end."
                after="Submit a referral against the protocol, with the § 50-12-104(2) treating-clinician recommendation attached, into the same intake the patient and ETC are already using."
              />
              <ChangeRow
                who="Manufacturers"
                lane="PPA → audit"
                before="Manually shepherd each ETRB submission, chase down minutes, and reconstruct a per-program audit trail at year-end from scattered files."
                after="One PPA covers all participating ETCs. ETRB voting and minutes capture the timestamp at the source. Per-program audit-evidence pack exports on demand."
              />
              <ChangeRow
                who="ETC operators"
                lane="License → renew"
                before="Stand up 25 RULES from scratch — license, P&P manual, staff files, ETRB, QAPI, AE, HFAR — each one its own deliverable, each clock managed by hand."
                after="Licensure wizard generates the application. P&P generator produces the 20-category manual. Each recurring obligation carries a countdown to its DPHHS deadline."
              />
            </div>

            <h2>
              <FormattedMessage
                id="directory.for_platform.modules.h2"
                defaultMessage="The modules, in service of the handoffs."
              />
            </h2>
            <p>
              <FormattedMessage
                id="directory.for_platform.modules.intro"
                defaultMessage="What manufacturers and ETC operators actually do on the platform — each module exists to make a handoff above auditable."
              />
            </p>
            <ul className="for-plat__modules">
              <ModuleRow
                title="Patient discovery & eligibility"
                desc="directory browse, condition pages, anonymous self-screen against the protocol."
              />
              <ModuleRow
                title="Patient intake"
                desc="recorded informed consent (§ 50-12-105(3)(b)), patient agreement (RULE 11), secure card payment."
              />
              <ModuleRow
                title="Licensure wizard"
                desc="RULE 5 application assembled from a guided wizard."
              />
              <ModuleRow
                title="P&P manual generator"
                desc="20-category manual under RULE 6, with the biennial review log."
              />
              <ModuleRow
                title="Staff & roles"
                desc="RULES 7, 8, 9, 10 with license-expiration alerts and the per-shift on-site staff log."
              />
              <ModuleRow
                title="ETRB workflow"
                desc="RULE 16 — protocol review, voting by a ≥4-member board (RULE 16(5)), annual public report (RULE 16(6)(c))."
              />
              <ModuleRow
                title="QAPI"
                desc="RULE 15 — quarterly cadence + decision log with 3-year retention."
              />
              <ModuleRow
                title="Adverse-event reporting"
                desc="RULE 17 — 5-day clock with countdown and DPHHS submission receipt."
              />
              <ModuleRow title="HFAR Path B" desc="SB 535 § 2 — annual 2% net profit workflow." />
              <ModuleRow
                title="DPHHS annual report"
                desc="RULE 22, due January 31 — auto-assembled from the year's records."
              />
            </ul>

            <h2>
              <FormattedMessage
                id="directory.for_platform.compliance.h2"
                defaultMessage="Compliance mapping."
              />
            </h2>
            <p>
              <FormattedMessage
                id="directory.for_platform.compliance.intro"
                defaultMessage="Every MAR 2026-427.1 RULE → Lewis module → audit evidence the platform produces. The audit-evidence column gives counsel a concrete artifact to point to for each requirement."
              />
            </p>
            <table
              className="for-plat__ds-table for-plat__compliance"
              aria-label="RULE-by-RULE platform coverage with audit evidence"
            >
              <thead>
                <tr>
                  <th scope="col">
                    <FormattedMessage
                      id="directory.for_platform.compliance.col.requirement"
                      defaultMessage="Requirement"
                    />
                  </th>
                  <th scope="col">
                    <FormattedMessage
                      id="directory.for_platform.compliance.col.rule"
                      defaultMessage="RULE"
                    />
                  </th>
                  <th scope="col">
                    <FormattedMessage
                      id="directory.for_platform.compliance.col.module"
                      defaultMessage="Lewis module"
                    />
                  </th>
                  <th scope="col">
                    <FormattedMessage
                      id="directory.for_platform.compliance.col.evidence"
                      defaultMessage="Audit evidence"
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                <ComplianceRow
                  req="License application"
                  rule="RULE 5"
                  mod="Licensure wizard"
                  ev="Application PDF + DPHHS receipt"
                />
                <ComplianceRow
                  req="P&P manual"
                  rule="RULE 6"
                  mod="P&P manual generator"
                  ev="Versioned PDF + biennial review log"
                />
                <ComplianceRow
                  req="Administrator"
                  rule="RULE 7"
                  mod="Staff & roles"
                  ev="Active role + audit trail"
                />
                <ComplianceRow
                  req="Medical director"
                  rule="RULE 8"
                  mod="Staff & roles + QAPI lead"
                  ev="MT license verification + QAPI minutes"
                />
                <ComplianceRow
                  req="Staff requirements"
                  rule="RULE 9"
                  mod="Staff files"
                  ev="Per-shift on-site staff log"
                />
                <ComplianceRow
                  req="Staff files"
                  rule="RULE 10"
                  mod="Staff files with alerts"
                  ev="License + training + evaluation records"
                />
                <ComplianceRow
                  req="Patient agreement"
                  rule="RULE 11"
                  mod="Patient intake"
                  ev="Signed agreement PDF + timestamp"
                />
                <ComplianceRow
                  req="Patient files"
                  rule="RULE 12"
                  mod="Patient files w/ retention locks"
                  ev="File index + 5-year retention lock"
                />
                <ComplianceRow
                  req="Treatment documentation"
                  rule="RULE 13"
                  mod="Treatment doc + drug accountability"
                  ev="Per-treatment record + lot tracking"
                />
                <ComplianceRow
                  req="Transfer agreement"
                  rule="RULE 13(2)–(4)"
                  mod="Transfer agreement tracking"
                  ev="Signed PDF + annual renewal log"
                />
                <ComplianceRow
                  req="Emergency procedures"
                  rule="RULE 14"
                  mod="Emergency transfer workflow"
                  ev="P&P + incident log"
                />
                <ComplianceRow
                  req="QAPI program"
                  rule="RULE 15"
                  mod="QAPI module"
                  ev="Quarterly minutes + decision log (3-yr retention)"
                />
                <ComplianceRow
                  req="ETRB workflow"
                  rule="RULE 16"
                  mod="ETRB module"
                  ev="Protocol + vote + annual public report (5-yr retention)"
                  highlighted
                />
                <ComplianceRow
                  req="AE reporting"
                  rule="RULE 17"
                  mod="AE workflow"
                  ev="DPHHS-submitted report + countdown timestamp"
                />
                <ComplianceRow
                  req="Infection control"
                  rule="RULE 18"
                  mod="Infection control program"
                  ev="P&P + monitoring records"
                />
                <ComplianceRow
                  req="Safety program"
                  rule="RULE 19"
                  mod="Safety reporting"
                  ev="Incident + medication-error log"
                />
                <ComplianceRow
                  req="Annual report"
                  rule="RULE 22"
                  mod="DPHHS annual report"
                  ev="Auto-assembled report + submission timestamp"
                />
                <ComplianceRow
                  req="Outpatient plant"
                  rule="RULE 23"
                  mod="Licensure wizard physical plant"
                  ev="Building + fire marshal inspections"
                />
                <ComplianceRow
                  req="HFAR"
                  rule="SB 535 § 2"
                  mod="HFAR Path B workflow"
                  ev="DPHHS form + payment receipt"
                />
              </tbody>
            </table>
            <p className="for-plat__table-coda">
              <FormattedMessage
                id="directory.for_platform.compliance.coda"
                defaultMessage="{strong} RULES 20, 21, 24, 25 are conditional or not in MVP scope."
                values={{
                  strong: <strong>19 of 25 rules covered in MVP.</strong>,
                }}
              />
            </p>

            <h2>
              <FormattedMessage
                id="directory.for_platform.security.h2"
                defaultMessage="Security & compliance posture."
              />
            </h2>
            <p>
              <FormattedMessage
                id="directory.for_platform.security.intro"
                defaultMessage="PHI sits behind enforced tenant isolation, audit logging is append-only at the database layer, and every PHI-bearing subprocessor is on a signed BAA before production traffic."
              />
            </p>
            <div className="for-plat__security-grid">
              <SecurityCard
                tag="Tenant isolation"
                body={
                  <>
                    Postgres <strong>FORCE ROW LEVEL SECURITY</strong> on every PHI table. App
                    runtimes connect as non-owner{" "}
                    <code className="for-plat__inline-code">app_api</code> /{" "}
                    <code className="for-plat__inline-code">app_worker</code> roles with
                    NOBYPASSRLS. Semantic SQL RLS test suite gates every PR.
                  </>
                }
              />
              <SecurityCard
                tag="Authentication"
                body={
                  <>
                    <strong>JWT-based authentication</strong> verified at the API edge. MFA required
                    for manufacturer + ETC users. Break-glass admin access requires a ticket
                    reference and is audit-logged.
                  </>
                }
              />
              <SecurityCard
                tag="Audit log"
                body={
                  <>
                    <strong>Append-only</strong> by Postgres trigger blocking UPDATE/DELETE. Every
                    state change writes tenant + actor + before / after. 7-year retention enforced
                    at the database layer.
                  </>
                }
              />
              <SecurityCard
                tag="PHI in logs"
                body={
                  <>
                    <strong>Never.</strong> Structured logger with redaction. Raw console output is
                    banned outside scripts by ESLint/CI. PHI scrubber test gates the
                    error-monitoring path on every PR.
                  </>
                }
              />
              <SecurityCard
                tag="SOC 2 readiness"
                body={
                  <>
                    Architecture is <strong>SOC 2 Type II auditable</strong>. Continuous
                    control-evidence pipeline. TLS 1.3 only. Retention locks in the database, not
                    application code.
                  </>
                }
              />
              <SecurityCard
                tag="HIPAA posture"
                body={
                  <>
                    Lewis is a <strong>Business Associate</strong>. PHI lives in a HIPAA-eligible
                    managed Postgres project. Every PHI-bearing subprocessor is on a signed BAA; the
                    internal register is available on request.
                  </>
                }
              />
            </div>

            <div className="for-plat__cta-block">
              <h2>
                <FormattedMessage
                  id="directory.for_platform.cta.h2"
                  defaultMessage="Talk to us about a demo."
                />
              </h2>
              <p>
                <FormattedMessage
                  id="directory.for_platform.cta.body"
                  defaultMessage="Email {email} to schedule a 30-minute walkthrough of {appHref} with the relevant module owners. If you're standing up a Montana program in 2026, the conversation is short and direct."
                  values={{
                    email: <strong>hello@lewis.health</strong>,
                    appHref: <strong>app.lewis.health</strong>,
                  }}
                />
              </p>
            </div>

            <p className="for-plat__signoff">
              <FormattedMessage
                id="directory.for_platform.signoff"
                defaultMessage="Direct platform inquiries to hello@lewis.health."
              />
              <strong>
                <FormattedMessage
                  id="directory.for_platform.signoff.team"
                  defaultMessage="— The Lewis team"
                />
              </strong>
            </p>

            <p className="for-plat__independence">
              <FormattedMessage
                id="directory.for_platform.independence"
                defaultMessage="Lewis is an independent directory and operating platform. We are not a manufacturer, manufacturer, or clinic. Information sourced from Montana DPHHS public records and licensed program operators."
              />
            </p>
          </div>
        </div>
      </div>
      <FloatingCta
        lead={
          <FormattedMessage
            id="directory.for_platform.float.lead"
            defaultMessage="Operating platform"
          />
        }
        label={
          <FormattedMessage
            id="directory.for_platform.rail.cta.email"
            defaultMessage="Talk to our team"
          />
        }
        href="mailto:hello@lewis.health"
      />
    </>
  );
}

/**
 * Single row of the 12-row handoffs table. The `from`/`what`/`to`/`lewis`
 * columns are plain text; `statute` is a ReactNode because most rows pair
 * a § / RULE citation with an arrow separator + a clock callout.
 */
function HandoffRow({
  from,
  what,
  to,
  statute,
  lewis,
}: {
  from: string;
  what: string;
  to: string;
  statute: ReactNode;
  lewis: string;
}) {
  return (
    <tr>
      <td>{from}</td>
      <td>{what}</td>
      <td>{to}</td>
      <td>{statute}</td>
      <td>{lewis}</td>
    </tr>
  );
}

/**
 * Single row of the persona before/after grid. Lays out as a single
 * column on mobile; on desktop as `who | before | → | after`. The arrow
 * is hidden on mobile via .for-plat__change-row__arrow visibility rule.
 */
function ChangeRow({
  who,
  lane,
  before,
  after,
}: {
  who: string;
  lane: string;
  before: string;
  after: string;
}) {
  return (
    <div className="for-plat__change-row">
      <p className="for-plat__change-row__who">
        {who}
        <small>{lane}</small>
      </p>
      <p className="for-plat__change-row__before">
        <span className="for-plat__change-row__lbl">Before</span>
        {before}
      </p>
      <p className="for-plat__change-row__arrow" aria-hidden="true">
        →
      </p>
      <p className="for-plat__change-row__after">
        <span className="for-plat__change-row__lbl">With Lewis</span>
        {after}
      </p>
    </div>
  );
}

/**
 * Single row of the modules list. `title` is the bold module name,
 * `desc` is the small-print body that names the relevant RULE.
 */
function ModuleRow({ title, desc }: { title: string; desc: string }) {
  return (
    <li>
      <strong>{title}</strong> — <span>{desc}</span>
    </li>
  );
}

/**
 * Single row of the 19-row compliance mapping table. `highlighted` flags
 * the ETRB row (RULE 16) — visually echoes the page's load-bearing
 * narrative element (the handoffs table) by drawing the eye to the
 * regulatory gate every treatment passes through.
 */
function ComplianceRow({
  req,
  rule,
  mod,
  ev,
  highlighted,
}: {
  req: string;
  rule: string;
  mod: string;
  ev: string;
  highlighted?: boolean;
}) {
  return (
    <tr
      className={
        highlighted
          ? "for-plat__compliance-row for-plat__compliance-row--highlight"
          : "for-plat__compliance-row"
      }
    >
      <td>{req}</td>
      <td>{rule}</td>
      <td>{mod}</td>
      <td>{ev}</td>
    </tr>
  );
}

/**
 * Single card in the 6-card security posture grid. `tag` is the small
 * uppercase eyebrow above the card body; `body` is a ReactNode because
 * some cards embed <code> elements (postgres role names).
 */
function SecurityCard({ tag, body }: { tag: string; body: ReactNode }) {
  return (
    <div className="for-plat__security-card">
      <p className="for-plat__security-card__t">{tag}</p>
      <p className="for-plat__security-card__b">{body}</p>
    </div>
  );
}
