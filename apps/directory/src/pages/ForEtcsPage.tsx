import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { FormattedMessage } from "react-intl";

import { FloatingCta } from "../components/FloatingCta";
import { useSeo, siteUrl } from "../seo/useSeo";

/**
 * Slice 5 § 22 — For Montana ETC operators.
 *
 * Single-column editorial letter, structurally identical to /for-clinicians
 * and /for-manufacturers: a centered 720px lane where every section — prose,
 * headings, the two analytical tables, the ETRB callout, the partner block,
 * and the "How to get started" funnel — shares the exact same left and
 * right edge. The conversion surface is the shared <FloatingCta> pinned to
 * the viewport bottom (reused across all three B2B pages), not a sticky
 * right rail.
 *
 * The earlier two-column layout (letter + sticky reference rail carrying
 * two CTAs and the funnel card) was removed: the rail grammar reads as
 * dashboard chrome against the peer-letter voice, and a fixed CTA gives a
 * persistent conversion path without one. The rail's "How to get started"
 * funnel now lives inline as its own closing section; the rail's
 * "Operating platform" link is an inline secondary link in that section.
 *
 * Statutory anchors:
 * - SB 535 § 1(3) — license application + renewal fees ($10K + $5K, per
 *   center, NOT per drug). Verified directly from docs/legislation/sb535.md.
 * - SB 535 § 2 — HFAR 2% of net annual profits.
 * - MAR NEW RULE 16(5) — ETRB composition (≥4 members; ≥1 MT physician,
 *   ≥1 outcomes researcher, ≥1 ethicist).
 * - MAR NEW RULE 16(3) — ETRB independence (no personal/financial/
 *   employment/ownership interest).
 * - MAR NEW RULE 16(6)(a) — ETRB protocol-review mandate.
 * - MAR NEW RULE 22 — DPHHS annual report (Jan 31).
 * - MAR NEW RULE 17 — 5-day adverse-event clock.
 *
 * Voice: peer-level, calm, factual. Email mailbox operators@lewis.health
 * to be provisioned before launch (per slice 5 posture).
 */
export function ForEtcsPage() {
  useSeo({
    title: "For Montana clinics operating under SB 535 — Lewis Health",
    description:
      "Lewis is the operating platform Montana's Experimental Treatment Centers use for every MAR 2026-427.1 requirement — ETRB workflow, RULE-by-RULE compliance coverage, recurring deadlines, HFAR Path B, and DPHHS filings. Built with the first Montana ETC.",
    canonical: siteUrl("/for-etcs"),
  });

  return (
    <>
      <div className="for-etcs fade-up">
        <div className="for-etcs__letter-col">
          <h1 className="for-etcs__h1 serif">
            <FormattedMessage
              id="directory.for_etcs.h1"
              defaultMessage="For Montana clinics operating {em}"
              values={{
                em: (
                  <em className="for-etcs__h1-em">
                    <FormattedMessage
                      id="directory.for_etcs.h1.em"
                      defaultMessage="under SB 535."
                    />
                  </em>
                ),
              }}
            />
          </h1>

          <div className="for-etcs__letter">
            <p>
              <FormattedMessage
                id="directory.for_etcs.intro1"
                defaultMessage="Lewis is the operating platform Montana's Experimental Treatment Centers use to orchestrate every requirement under MAR 2026-427.1 — licensure, the ETRB workflow, patient intake, adverse event reporting, HFAR fulfillment, and the DPHHS annual report, streamlined end to end with a complete audit trail. We were built specifically for SB 535 compliance, and we work with the first ETC in the state."
              />
            </p>
            <p>
              <FormattedMessage
                id="directory.for_etcs.intro2"
                defaultMessage="{accent} The Experimental Treatment Review Board is the regulatory gate every treatment passes through before reaching a patient. We put it first because it is the operationally hardest part of running an ETC — and the thing Lewis owns end to end."
                values={{
                  accent: (
                    <em className="for-etcs__accent">
                      <FormattedMessage
                        id="directory.for_etcs.intro2.accent"
                        defaultMessage="If one rule defines whether an ETC can operate, it is RULE 16."
                      />
                    </em>
                  ),
                }}
              />
            </p>

            <h2>
              <FormattedMessage
                id="directory.for_etcs.etrb.h2"
                defaultMessage="The ETRB workflow specifically."
              />
            </h2>
            <div className="for-etcs__etrb-callout">
              <p className="for-etcs__etrb-callout-label">
                <FormattedMessage
                  id="directory.for_etcs.etrb.label"
                  defaultMessage="RULE 16 — the operational keymaster"
                />
              </p>
              <p>
                <FormattedMessage
                  id="directory.for_etcs.etrb.p1"
                  defaultMessage="The Experimental Treatment Review Board is the most distinctive — and most operationally complex — requirement in MAR 2026-427.1. It is also the keymaster for any treatment ever being administered outside the ETC walls under {rule25}. No protocol may be offered, no treatment delivered, until the ETRB has reviewed and documented its findings under RULE 16(6)(a)."
                  values={{ rule25: <strong>RULE 25</strong> }}
                />
              </p>
              <p>
                <FormattedMessage
                  id="directory.for_etcs.etrb.p2"
                  defaultMessage="{rule165} requires the board to consist of {strong} — including at least one Montana-licensed physician, at least one researcher with expertise in clinical-outcome data, and at least one ethicist. Members must be independent of the ETC under RULE 16(3) (no personal, financial, employment, or ownership interest). A board may serve one ETC or many (RULE 16(2)(b), RULE 16(4))."
                  values={{
                    rule165: <strong>RULE 16(5)</strong>,
                    strong: <strong>at least four members</strong>,
                  }}
                />
              </p>
              <p>
                <FormattedMessage
                  id="directory.for_etcs.etrb.p3"
                  defaultMessage="Lewis treats the ETRB as a first-class entity. Each board member is a Clerk-authenticated reviewer with a conflict-of-interest declaration aligned to {strong}. Protocol reviews flow from manufacturer to board with reviewer assignments, votes, rationale, and approval timestamps. The annual public report under RULE 16(6)(c) generates from this dataset automatically."
                  values={{ strong: <strong>1-6-105 MCA</strong> }}
                />
              </p>
              <p>
                <FormattedMessage
                  id="directory.for_etcs.etrb.p4"
                  defaultMessage="If you have not yet recruited a board, we can connect you with reviewers. If you have a board, Lewis streamlines protocol review end to end — reviewer assignments, votes, rationale, approval timestamps — and records each step as it happens."
                />
              </p>
            </div>

            <h2>
              <FormattedMessage
                id="directory.for_etcs.requires.h2"
                defaultMessage="What the ETC license actually requires."
              />
            </h2>
            <p>
              <FormattedMessage
                id="directory.for_etcs.requires.p1"
                defaultMessage="Beyond RULE 16, operating an ETC in Montana means complying with {rules25}, plus the underlying statute. The application alone (RULE 5) requires an administrator, a medical director, a professional staff roster, a 20-category P&P manual under RULE 6, a transfer agreement with a local hospital under RULE 13(2), and an ETRB under RULE 16. {feeCite}, fees are tied to the {centerEm} license — not to individual drugs or programs: a {appFee} for the ETC license, plus a {renewalFee} of that license. Each additional program your ETC offers does not trigger a separate DPHHS fee."
                values={{
                  rules25: <strong>25 administrative rules under MAR 2026-427.1</strong>,
                  feeCite: <strong>Per SB 535 § 1(3)</strong>,
                  centerEm: <em>center&apos;s</em>,
                  appFee: <strong>$10,000 one-time application fee</strong>,
                  renewalFee: <strong>$5,000 annual renewal</strong>,
                }}
              />
            </p>
            <p>
              <FormattedMessage
                id="directory.for_etcs.requires.p2"
                defaultMessage="Most of the remaining obligations are recurring deadlines an operator can miss in their first year if they are not built around. {rule22b} allows DPHHS to reduce a non-filing ETC to provisional license. Missing the 5-day AE clock is a serious finding. Missing the January 31 annual report is a serious finding. {accent}"
                values={{
                  rule22b: <strong>RULE 22(2)(b)</strong>,
                  accent: (
                    <em className="for-etcs__accent">
                      Lewis is the system that makes none of these get missed.
                    </em>
                  ),
                }}
              />
            </p>

            <h2>
              <FormattedMessage
                id="directory.for_etcs.compliance.h2"
                defaultMessage="Every RULE, accounted for."
              />
            </h2>
            <table
              className="for-etcs__ds-table for-etcs__compliance"
              aria-label="Lewis platform RULE-by-RULE compliance coverage"
            >
              <thead>
                <tr>
                  <th scope="col">
                    <FormattedMessage
                      id="directory.for_etcs.compliance.col.requirement"
                      defaultMessage="Requirement"
                    />
                  </th>
                  <th scope="col">
                    <FormattedMessage
                      id="directory.for_etcs.compliance.col.rule"
                      defaultMessage="RULE"
                    />
                  </th>
                  <th scope="col">
                    <FormattedMessage
                      id="directory.for_etcs.compliance.col.module"
                      defaultMessage="Lewis module"
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                <ComplianceRow req="License application" rule="RULE 5" mod="Licensure wizard" />
                <ComplianceRow
                  req="P&P manual (20 categories)"
                  rule="RULE 6"
                  mod="P&P manual generator"
                />
                <ComplianceRow req="Administrator role" rule="RULE 7" mod="Staff & roles" />
                <ComplianceRow
                  req="Medical Director role"
                  rule="RULE 8"
                  mod="Staff & roles + QAPI lead"
                />
                <ComplianceRow req="Staff requirements" rule="RULE 9" mod="Staff files" />
                <ComplianceRow
                  req="Staff files (license, training, evaluations)"
                  rule="RULE 10"
                  mod="Staff files w/ expiration alerts"
                />
                <ComplianceRow
                  req="Patient agreement"
                  rule="RULE 11"
                  mod="Patient intake — agreement gen"
                />
                <ComplianceRow
                  req="Patient files (5-year retention)"
                  rule="RULE 12"
                  mod="Patient files w/ retention locks"
                />
                <ComplianceRow
                  req="Treatment documentation"
                  rule="RULE 13"
                  mod="Treatment doc + drug accountability"
                />
                <ComplianceRow
                  req="Transfer agreement"
                  rule="RULE 13(2)–(4)"
                  mod="Transfer agreement tracking"
                />
                <ComplianceRow
                  req="Emergency procedures"
                  rule="RULE 14"
                  mod="Emergency transfer workflow"
                />
                <ComplianceRow
                  req="QAPI program"
                  rule="RULE 15"
                  mod="QAPI module — quarterly cadence"
                />
                <ComplianceRow
                  req="ETRB workflow"
                  rule="RULE 16"
                  mod="ETRB module — protocol, voting, annual report"
                  highlighted
                />
                <ComplianceRow
                  req="Adverse event reporting (5-day clock)"
                  rule="RULE 17"
                  mod="AE workflow with countdown"
                />
                <ComplianceRow
                  req="Infection control"
                  rule="RULE 18"
                  mod="Infection control program"
                />
                <ComplianceRow
                  req="Safety program"
                  rule="RULE 19"
                  mod="Safety reporting + medication errors"
                />
                <ComplianceRow
                  req="Annual report"
                  rule="RULE 22"
                  mod="DPHHS annual report — auto-assembly"
                />
                <ComplianceRow
                  req="Outpatient physical plant"
                  rule="RULE 23"
                  mod="Licensure wizard physical plant section"
                />
                <ComplianceRow
                  req="HFAR (Health Freedom and Access)"
                  rule="SB 535 § 2"
                  mod="HFAR Path B annual workflow"
                />
              </tbody>
            </table>
            <p className="for-etcs__table-coda">
              <FormattedMessage
                id="directory.for_etcs.compliance.coda"
                defaultMessage="{strong} The remaining four — RULES 20 (anesthesia), 21 (devices), 24 (inpatient), 25 (outside-ETC physician network) — are conditional or not in MVP scope. We add them as ETCs need them."
                values={{
                  strong: <strong>19 of 25 rules covered in MVP.</strong>,
                }}
              />
            </p>

            <h2>
              <FormattedMessage
                id="directory.for_etcs.deadlines.h2"
                defaultMessage="Recurring deadlines, accounted for."
              />
            </h2>
            <p>
              <FormattedMessage
                id="directory.for_etcs.deadlines.lede"
                defaultMessage="Every recurring obligation that an ETC can miss — short clocks, weekly through annual cadences, and long retention windows. Lewis tracks each one, surfaces countdowns where they matter, and auto-assembles the filings DPHHS expects."
              />
            </p>
            <table
              className="for-etcs__ds-table for-etcs__deadlines"
              aria-label="Recurring ETC compliance deadlines"
            >
              <thead>
                <tr>
                  <th scope="col">
                    <FormattedMessage
                      id="directory.for_etcs.deadlines.col.cadence"
                      defaultMessage="Cadence"
                    />
                  </th>
                  <th scope="col">
                    <FormattedMessage
                      id="directory.for_etcs.deadlines.col.requirement"
                      defaultMessage="Requirement"
                    />
                  </th>
                  <th scope="col">
                    <FormattedMessage
                      id="directory.for_etcs.deadlines.col.rule"
                      defaultMessage="RULE / Section"
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                <DeadlineRow
                  cadence="5-day clock"
                  req="Adverse-event reporting to DPHHS"
                  rule="RULE 17"
                />
                <DeadlineRow cadence="Quarterly" req="QAPI meeting + decision log" rule="RULE 15" />
                <DeadlineRow cadence="Quarterly" req="ETRB safety review" rule="RULE 16(6)(b)" />
                <DeadlineRow cadence="Jan 31 · annual" req="DPHHS annual report" rule="RULE 22" />
                <DeadlineRow cadence="Feb 1 · annual" req="HFAR documentation" rule="SB 535 § 2" />
                <DeadlineRow cadence="Annual" req="ETRB public report" rule="RULE 16(6)(c)" />
                <DeadlineRow
                  cadence="Annual"
                  req="Fire marshal + alarm inspection"
                  rule="RULE 23"
                />
                <DeadlineRow
                  cadence="Annual"
                  req="Transfer agreement renewal"
                  rule="RULE 13(2)–(4)"
                />
                <DeadlineRow cadence="Biennial" req="P&P manual review" rule="RULE 6(4)" />
                <DeadlineRow
                  cadence="3-year retention"
                  req="QAPI meeting records"
                  rule="RULE 15(5)"
                />
                <DeadlineRow
                  cadence="5-year retention"
                  req="Patient files post-discharge"
                  rule="RULE 12(4)"
                />
                <DeadlineRow
                  cadence="5-year retention"
                  req="ETRB approval & safety records"
                  rule="RULE 16(6)(d)"
                />
                <DeadlineRow
                  cadence="7-year retention"
                  req="Audit log (append-only)"
                  rule="Lewis platform"
                />
              </tbody>
            </table>
            <p className="for-etcs__table-coda">
              <FormattedMessage
                id="directory.for_etcs.deadlines.coda"
                defaultMessage="Calendar dates render in {tz}. The 5-day AE clock counts from the medical director's first awareness of the event, not the patient encounter. Retention locks in the database prevent accidental deletion before the window closes."
                values={{
                  tz: <code className="for-etcs__inline-code">America/Denver</code>,
                }}
              />
            </p>

            <h2>
              <FormattedMessage
                id="directory.for_etcs.hfar.h2"
                defaultMessage="HFAR Path B in practice."
              />
            </h2>
            <p>
              <FormattedMessage
                id="directory.for_etcs.hfar.p1"
                defaultMessage="SB 535 § 2 requires every licensed ETC to allocate 2% of net annual profits to support access to experimental treatments. Path A (free treatment to qualifying Montana residents) is operationally complex; most ETCs choose Path B (cash contribution to the Insurance Premium Support Account established under SB 535 § 3)."
              />
            </p>
            <p>
              <FormattedMessage
                id="directory.for_etcs.hfar.p2"
                defaultMessage="Lewis's HFAR Path B workflow runs once a year. We pull net profits from your accounting export, calculate 2%, generate the DPHHS contribution form, and store the contribution evidence. {strong} February 1 deadline is tracked from December 1."
                values={{
                  strong: <strong>The full workflow takes 20 minutes.</strong>,
                }}
              />
            </p>

            <h2>
              <FormattedMessage id="directory.for_etcs.pricing.h2" defaultMessage="Pricing." />
            </h2>
            <p>
              <FormattedMessage
                id="directory.for_etcs.pricing.p"
                defaultMessage="Lewis charges ETCs a flat monthly platform fee that scales with the number of programs you offer. {strong} Specific pricing is discussed in the initial conversation; we publish a starting tier on request."
                values={{
                  strong: (
                    <strong>
                      We do not take a percentage of patient revenue. We do not charge patients.
                    </strong>
                  ),
                }}
              />
            </p>

            <h2>
              <FormattedMessage
                id="directory.for_etcs.partner.h2"
                defaultMessage="Built with the first Montana ETC."
              />
            </h2>
            <div className="for-etcs__partner">
              <p className="for-etcs__partner-label">
                <FormattedMessage
                  id="directory.for_etcs.partner.label"
                  defaultMessage="Design partners"
                />
              </p>
              <p>
                <FormattedMessage
                  id="directory.for_etcs.partner.body"
                  defaultMessage="Lewis was built in design partnership with {bigSky} in Bozeman — Montana's first licensed Experimental Treatment Center — and with {winsantor}, the manufacturer of the first commercial WST-057 program. Every flow in the platform was tested with their team, starting with the ETRB workflow. We continue to add features at the pace of new RULE interpretations and DPHHS guidance."
                  values={{
                    bigSky: <strong>Big Sky ETC</strong>,
                    winsantor: <strong>WinSanTor</strong>,
                  }}
                />
              </p>
            </div>

            {/* Closing section — the former sticky-rail "How to get started"
                5-step funnel, moved inline as the page's final content block.
                Step i is the email entry point; the secondary line below
                carries the inline "operating platform" path that used to be
                the rail's outline CTA. The primary email conversion is also
                always present in the persistent FloatingCta. */}
            <h2>
              <FormattedMessage
                id="directory.for_etcs.start.h2"
                defaultMessage="How to get started."
              />
            </h2>
            <p>
              <FormattedMessage
                id="directory.for_etcs.start.lede"
                defaultMessage="Working with Lewis starts with a conversation and moves at the pace of your license. Initial calls cover your facility's operational state, your timeline to license, your ETRB plans, and the programs you are evaluating."
              />
            </p>
            <ol className="for-etcs__start-list">
              <StartStep
                title={
                  <FormattedMessage
                    id="directory.for_etcs.rail.start.s1.t"
                    defaultMessage="Email us"
                  />
                }
                desc={
                  <FormattedMessage
                    id="directory.for_etcs.rail.start.s1.d"
                    defaultMessage="operators@lewis.health — your facility, timeline, ETRB plans"
                  />
                }
              />
              <StartStep
                title={
                  <FormattedMessage
                    id="directory.for_etcs.rail.start.s2.t"
                    defaultMessage="Initial call · 30 min"
                  />
                }
                desc={
                  <FormattedMessage
                    id="directory.for_etcs.rail.start.s2.d"
                    defaultMessage="BD lead + a regulatory advisor familiar with SB 535 + MAR 2026-427.1"
                  />
                }
              />
              <StartStep
                title={
                  <FormattedMessage
                    id="directory.for_etcs.rail.start.s3.t"
                    defaultMessage="Licensure wizard"
                  />
                }
                desc={
                  <FormattedMessage
                    id="directory.for_etcs.rail.start.s3.d"
                    defaultMessage="RULE 5 application support; you file with DPHHS directly"
                  />
                }
              />
              <StartStep
                title={
                  <FormattedMessage
                    id="directory.for_etcs.rail.start.s4.t"
                    defaultMessage="ETRB setup"
                  />
                }
                desc={
                  <FormattedMessage
                    id="directory.for_etcs.rail.start.s4.d"
                    defaultMessage="Recruit reviewers, or use our reviewer network"
                  />
                }
              />
              <StartStep
                title={
                  <FormattedMessage
                    id="directory.for_etcs.rail.start.s5.t"
                    defaultMessage="Platform onboarding"
                  />
                }
                desc={
                  <FormattedMessage
                    id="directory.for_etcs.rail.start.s5.d"
                    defaultMessage="Big Sky-tested workflows · go live in 60–90 days"
                  />
                }
              />
            </ol>
            <p className="for-etcs__start-secondary">
              <FormattedMessage
                id="directory.for_etcs.start.secondary"
                defaultMessage="Email {email} to begin, or {platform}."
                values={{
                  email: (
                    <a className="for-etcs__inline-link" href="mailto:operators@lewis.health">
                      operators@lewis.health
                    </a>
                  ),
                  platform: (
                    <Link className="for-etcs__inline-link" to="/platform">
                      explore the operating platform
                    </Link>
                  ),
                }}
              />
            </p>

            <p className="for-etcs__signoff">
              <FormattedMessage
                id="directory.for_etcs.signoff"
                defaultMessage="Direct ETC inquiries to operators@lewis.health."
              />
              <strong>
                <FormattedMessage
                  id="directory.for_etcs.signoff.team"
                  defaultMessage="— The Lewis team"
                />
              </strong>
            </p>

            <p className="for-etcs__independence">
              <FormattedMessage
                id="directory.for_etcs.independence"
                defaultMessage="Lewis is an independent directory and operating platform. We are not a manufacturer, manufacturer, or clinic. Information sourced from Montana DPHHS public records and licensed program operators."
              />
            </p>
          </div>
        </div>
      </div>

      {/* Keep outside `.for-etcs.fade-up`; transformed ancestors can trap fixed children. */}
      <FloatingCta
        lead={
          <FormattedMessage
            id="directory.for_etcs.float.lead"
            defaultMessage="Operating a Montana ETC?"
          />
        }
        label={
          <FormattedMessage
            id="directory.for_etcs.rail.cta.email"
            defaultMessage="Start a conversation"
          />
        }
        href="mailto:operators@lewis.health"
      />
    </>
  );
}

/**
 * Compliance table row — RULE-by-RULE coverage. `highlighted` flags the
 * ETRB row (RULE 16) to receive accent background + ★ marker, visually
 * echoing the top callout.
 */
function ComplianceRow({
  req,
  rule,
  mod,
  highlighted,
}: {
  req: string;
  rule: string;
  mod: string;
  highlighted?: boolean;
}) {
  return (
    <tr
      className={
        highlighted
          ? "for-etcs__compliance-row for-etcs__compliance-row--highlight"
          : "for-etcs__compliance-row"
      }
    >
      <td>{req}</td>
      <td>{rule}</td>
      <td>{mod}</td>
    </tr>
  );
}

/** Recurring deadlines table row — Cadence | Requirement | RULE / Section. */
function DeadlineRow({ cadence, req, rule }: { cadence: string; req: string; rule: string }) {
  return (
    <tr>
      <td>{cadence}</td>
      <td>{req}</td>
      <td>{rule}</td>
    </tr>
  );
}

/** Single "How to get started" rail step — lower-roman numbered via CSS. */
function StartStep({ title, desc }: { title: ReactNode; desc: ReactNode }) {
  return (
    <li>
      <span className="for-etcs__start-t">{title}</span>
      <span className="for-etcs__start-d">{desc}</span>
    </li>
  );
}
