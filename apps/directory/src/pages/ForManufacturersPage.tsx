import { FormattedMessage } from "react-intl";

import { FloatingCta } from "../components/FloatingCta";
import { useSeo, siteUrl } from "../seo/useSeo";

type ManufacturerMessage = {
  id: string;
  defaultMessage: string;
};

type ComparisonRow = {
  key: string;
  rowHeader: ManufacturerMessage;
  path1: ManufacturerMessage;
  path2: ManufacturerMessage;
  path2Emphasis?: boolean;
};

type PlatformModule = {
  key: string;
  title: ManufacturerMessage;
  description: ManufacturerMessage;
};

type ProcessStep = {
  key: string;
  title: ManufacturerMessage;
  body: ManufacturerMessage;
};

type SourceLink = {
  key: string;
  href: string;
  marker: string;
  title: ManufacturerMessage;
  meta: ManufacturerMessage;
  action: ManufacturerMessage;
};

const compareRows: ComparisonRow[] = [
  {
    key: "basis",
    rowHeader: {
      id: "directory.for_manufacturers.compare.row.basis",
      defaultMessage: "Statutory basis",
    },
    path1: {
      id: "directory.for_manufacturers.compare.path1.basis",
      defaultMessage: "SB 535 § 7 (50-12-103) — manufacturer/HCP/HCF parallel actors",
    },
    path2: {
      id: "directory.for_manufacturers.compare.path2.basis",
      defaultMessage: "SB 535 § 7 (50-12-103) + RULE 5 (ETC license)",
    },
  },
  {
    key: "sale",
    rowHeader: {
      id: "directory.for_manufacturers.compare.row.sale",
      defaultMessage: "Drug sale path",
    },
    path1: {
      id: "directory.for_manufacturers.compare.path1.sale",
      defaultMessage: "Manufacturer → ETC (negotiated price) → patient (PPA-set price)",
    },
    path2: {
      id: "directory.for_manufacturers.compare.path2.sale",
      defaultMessage: "Manufacturer's ETC subsidiary → patient (manufacturer-set price)",
    },
  },
  {
    key: "margin",
    rowHeader: {
      id: "directory.for_manufacturers.compare.row.margin",
      defaultMessage: "Margin capture",
    },
    path1: {
      id: "directory.for_manufacturers.compare.path1.margin",
      defaultMessage: "Split per PPA between manufacturer and ETC",
    },
    path2: {
      id: "directory.for_manufacturers.compare.path2.margin",
      defaultMessage: "Full margin to manufacturer's subsidiary",
    },
    path2Emphasis: true,
  },
  {
    key: "burden",
    rowHeader: {
      id: "directory.for_manufacturers.compare.row.burden",
      defaultMessage: "Clinic regulatory burden",
    },
    path1: {
      id: "directory.for_manufacturers.compare.path1.burden",
      defaultMessage: "ETC (P&P, ETRB, QAPI, AE reporting, annual report)",
    },
    path2: {
      id: "directory.for_manufacturers.compare.path2.burden",
      defaultMessage: "Manufacturer's ETC subsidiary — same 25 MAR rules",
    },
  },
  {
    key: "hfar",
    rowHeader: {
      id: "directory.for_manufacturers.compare.row.hfar",
      defaultMessage: "HFAR payer (2% net profit)",
    },
    path1: {
      id: "directory.for_manufacturers.compare.path1.hfar",
      defaultMessage: "ETC — SB 535 § 2",
    },
    path2: {
      id: "directory.for_manufacturers.compare.path2.hfar",
      defaultMessage: "Manufacturer's subsidiary — SB 535 § 2",
    },
  },
  {
    key: "lift",
    rowHeader: {
      id: "directory.for_manufacturers.compare.row.lift",
      defaultMessage: "Operational lift on manufacturer",
    },
    path1: {
      id: "directory.for_manufacturers.compare.path1.lift",
      defaultMessage: "Low — PPA negotiation, supply, protocol authoring",
    },
    path2: {
      id: "directory.for_manufacturers.compare.path2.lift",
      defaultMessage:
        "High — license application, hire administrator + medical director, build P&P, recruit ETRB",
    },
  },
  {
    key: "time",
    rowHeader: {
      id: "directory.for_manufacturers.compare.row.time",
      defaultMessage: "Time to first patient",
    },
    path1: {
      id: "directory.for_manufacturers.compare.path1.time",
      defaultMessage: "60–90 days (gated by ETRB scheduling)",
    },
    path2: {
      id: "directory.for_manufacturers.compare.path2.time",
      defaultMessage: "Longer — DPHHS license window (90+ days) + ETRB",
    },
  },
  {
    key: "bestfor",
    rowHeader: {
      id: "directory.for_manufacturers.compare.row.bestfor",
      defaultMessage: "Best for",
    },
    path1: {
      id: "directory.for_manufacturers.compare.path1.bestfor",
      defaultMessage: "Manufacturers testing the Montana segment, or without clinic-ops experience",
    },
    path2: {
      id: "directory.for_manufacturers.compare.path2.bestfor",
      defaultMessage: "Manufacturers with material Montana volume + clinic-ops experience",
    },
  },
];

const platformModules: PlatformModule[] = [
  {
    key: "licensure",
    title: {
      id: "directory.for_manufacturers.platform.licensure.t",
      defaultMessage: "Licensure assistance",
    },
    description: {
      id: "directory.for_manufacturers.platform.licensure.d",
      defaultMessage: "RULE 5 application from a guided wizard; ETCs file with DPHHS directly.",
    },
  },
  {
    key: "pp",
    title: {
      id: "directory.for_manufacturers.platform.pp.t",
      defaultMessage: "P&P manual",
    },
    description: {
      id: "directory.for_manufacturers.platform.pp.d",
      defaultMessage: "20-category manual under RULE 6, biennial review tracking.",
    },
  },
  {
    key: "staff",
    title: {
      id: "directory.for_manufacturers.platform.staff.t",
      defaultMessage: "Staff files",
    },
    description: {
      id: "directory.for_manufacturers.platform.staff.d",
      defaultMessage: "RULE 10, license-expiration alerts.",
    },
  },
  {
    key: "etrb",
    title: {
      id: "directory.for_manufacturers.platform.etrb.t",
      defaultMessage: "ETRB workflow",
    },
    description: {
      id: "directory.for_manufacturers.platform.etrb.d",
      defaultMessage: "RULE 16: protocol review, voting, annual public report, 5-year retention.",
    },
  },
  {
    key: "qapi",
    title: {
      id: "directory.for_manufacturers.platform.qapi.t",
      defaultMessage: "QAPI",
    },
    description: {
      id: "directory.for_manufacturers.platform.qapi.d",
      defaultMessage: "RULE 15: quarterly cadence, decision log.",
    },
  },
  {
    key: "ae",
    title: {
      id: "directory.for_manufacturers.platform.ae.t",
      defaultMessage: "Adverse-event reporting",
    },
    description: {
      id: "directory.for_manufacturers.platform.ae.d",
      defaultMessage: "RULE 17 with the 5-day clock to DPHHS.",
    },
  },
  {
    key: "hfar",
    title: {
      id: "directory.for_manufacturers.platform.hfar.t",
      defaultMessage: "HFAR Path B",
    },
    description: {
      id: "directory.for_manufacturers.platform.hfar.d",
      defaultMessage: "annual workflow: net profit calculation, DPHHS form, contribution evidence.",
    },
  },
  {
    key: "annual",
    title: {
      id: "directory.for_manufacturers.platform.annual.t",
      defaultMessage: "DPHHS annual report",
    },
    description: {
      id: "directory.for_manufacturers.platform.annual.d",
      defaultMessage: "RULE 22, due January 31.",
    },
  },
  {
    key: "intake",
    title: {
      id: "directory.for_manufacturers.platform.intake.t",
      defaultMessage: "Patient intake",
    },
    description: {
      id: "directory.for_manufacturers.platform.intake.d",
      defaultMessage:
        "recorded informed consent (50-12-105(3)(b)), patient agreement (RULE 11), Stripe payment.",
    },
  },
];

const processSteps: ProcessStep[] = [
  {
    key: "conversation",
    title: {
      id: "directory.for_manufacturers.listing.step1.t",
      defaultMessage: "Initial conversation.",
    },
    body: {
      id: "directory.for_manufacturers.listing.step1.b",
      defaultMessage:
        "You and our team confirm the drug qualifies under 50-12-102(1) and discuss which path (partner-ETC or operate-own-ETC) makes sense for your commercialization strategy.",
    },
  },
  {
    key: "ppa",
    title: {
      id: "directory.for_manufacturers.listing.step2.t",
      defaultMessage: "Program participation agreement.",
    },
    body: {
      id: "directory.for_manufacturers.listing.step2.b",
      defaultMessage:
        "If Path 1, the PPA is executed between you and the ETC operator. If Path 2, you license your own ETC and execute a Lewis platform agreement.",
    },
  },
  {
    key: "etrb",
    title: {
      id: "directory.for_manufacturers.listing.step3.t",
      defaultMessage: "ETRB protocol approval.",
    },
    body: {
      id: "directory.for_manufacturers.listing.step3.b",
      defaultMessage:
        "The ETC's ETRB reviews the protocol under RULE 16(6)(a). Approval is required before any patient is enrolled. Lewis manages the workflow.",
    },
  },
];

const sourceLinks: SourceLink[] = [
  {
    key: "sb535",
    href: "/legislation/sb535.pdf",
    marker: "i.",
    title: {
      id: "directory.for_manufacturers.sources.sb535.title",
      defaultMessage: "Senate Bill 535 — Right to Try Act + ETC licensure",
    },
    meta: {
      id: "directory.for_manufacturers.sources.sb535.meta",
      defaultMessage: "69th Montana Legislature · 2025 · enrolled bill",
    },
    action: {
      id: "directory.for_manufacturers.sources.action",
      defaultMessage: "Download PDF",
    },
  },
  {
    key: "mar",
    href: "/legislation/mar-2026-427-1.pdf",
    marker: "ii.",
    title: {
      id: "directory.for_manufacturers.sources.mar.title",
      defaultMessage: "MAR Notice 2026-427.1 — ETC licensure rules",
    },
    meta: {
      id: "directory.for_manufacturers.sources.mar.meta",
      defaultMessage: "DPHHS proposed rulemaking · April 10, 2026",
    },
    action: {
      id: "directory.for_manufacturers.sources.action.2",
      defaultMessage: "Download PDF",
    },
  },
];

function ManufacturerText({ message }: { message: ManufacturerMessage }) {
  return <FormattedMessage id={message.id} defaultMessage={message.defaultMessage} />;
}

function SourceDownloadIcon() {
  return (
    <svg
      className="for-spons__source-icon"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2v9" />
      <path d="M4 7l4 4 4-4" />
      <path d="M3 14h10" />
    </svg>
  );
}

/**
 * Slice 5 § 21 — For manufacturers and biotech manufacturers.
 *
 * Single-column editorial letter, matching /for-clinicians structurally:
 * centered 720px prose/table lane, floating CTA outside the transformed
 * fade-up container.
 *
 * An "At a glance" summary box once sat after the opening framing; it was
 * removed because every row duplicated content the page already carries in
 * richer form: the two-paths/HFAR/time-to-first-patient rows are the
 * comparison table below, eligibility is in the opening framing, the ETRB
 * gate is in the regulatory section, and the Lewis fee has its own "How
 * Lewis is paid." section. The boxed key-value list also broke the
 * editorial letter voice the rest of the page holds.
 *
 * Load-bearing structural element: the two-paths framing
 * (partner-with-ETC vs operate-own-ETC), grounded in
 *   SB 535 § 7 / MCA 50-12-103 — "manufacturer, health care provider,
 *   or health care facility" in parallel as actors who may establish
 *   payment arrangements with a patient.
 *
 * Reading order in "The two paths" section:
 *   1. H2 "The two paths."
 *   2. Path 1 description paragraph (PRD § 21.3 verbatim)
 *   3. Path 2 description paragraph (PRD § 21.3 verbatim)
 *   4. SB 535 § 7 statute paragraph (parallel-actors quote)
 *   5. 8-row analytical comparison table:
 *      statutory basis · drug sale path · margin · regulatory burden ·
 *      HFAR payer · operational lift · time to first patient · best for
 *
 * Sources cited section (matching /for-clinicians convention) with PDF
 * downloads of SB 535 + MAR 2026-427.1 at the bottom of the letter.
 *
 * Voice: peer-level, calm, factual. No urgency, no sales-pitch language.
 * All user-facing strings via react-intl with defaultMessage fallbacks.
 *
 * Email mailbox: manufacturers@lewis.health — to be provisioned before launch.
 */
export function ForManufacturersPage() {
  useSeo({
    title: "List a program with Lewis — For manufacturers and biotech manufacturers",
    description:
      "Lewis is the operating platform for Montana's Experimental Treatment Center regime. Two paths are open to manufacturers under SB 535 (50-12-102(1)): partner with a Montana ETC, or operate your own. Compare side by side.",
    canonical: siteUrl("/for-manufacturers"),
  });

  return (
    <>
      <div className="for-spons fade-up">
        <div className="for-spons__letter-col">
          <h1 className="for-spons__h1 serif">
            <FormattedMessage
              id="directory.for_manufacturers.h1"
              defaultMessage="List a program {em}"
              values={{
                em: (
                  <em className="for-spons__h1-em">
                    <FormattedMessage
                      id="directory.for_manufacturers.h1.em"
                      defaultMessage="with Lewis."
                    />
                  </em>
                ),
              }}
            />
          </h1>

          <div className="for-spons__letter">
            <p>
              <FormattedMessage
                id="directory.for_manufacturers.intro1"
                defaultMessage="Lewis is the connecting tissue between manufacturers, ETCs, clinicians, and DPHHS under Montana's SB 535 — orchestrating the regulated handoffs that move an investigational treatment from a manufacturer's PPA to a patient's first dose at a licensed Montana ETC. We're the only state-level commercial Right to Try platform in the United States."
              />
            </p>
            <p>
              <FormattedMessage
                id="directory.for_manufacturers.intro2"
                defaultMessage="If you manufacture an investigational drug, biological product, or device that has completed Phase 1 of an FDA-approved clinical trial and remains under investigation, your treatment may qualify under SB 535 (50-12-102(1)). <accent>Two paths are open to you, and we support both.</accent>"
                values={{
                  accent: (chunks) => <em className="for-spons__accent">{chunks}</em>,
                }}
              />
            </p>

            <h2>
              <FormattedMessage
                id="directory.for_manufacturers.regulatory.h2"
                defaultMessage="The regulatory framework."
              />
            </h2>
            <p>
              <FormattedMessage
                id="directory.for_manufacturers.regulatory.p1"
                defaultMessage="Montana's SB 535, signed into law in 2025 and operationalized through MAR 2026-427.1 in 2026, established the country's first state-level licensed Experimental Treatment Center class. ETCs are licensed by the Montana Department of Public Health and Human Services and may deliver investigational treatments to patients who have evaluated standard-of-care options and provided informed consent under <strong>50-12-105</strong>."
                values={{ strong: (chunks) => <strong>{chunks}</strong> }}
              />
            </p>
            <p>
              <FormattedMessage
                id="directory.for_manufacturers.regulatory.p2"
                defaultMessage="Drug qualification is determined by each ETC's Experimental Treatment Review Board under <strong>RULE 16(6)(a)</strong> — not by DPHHS. The ETRB reviews the protocol against safety standards and risk-benefit before any treatment is delivered."
                values={{ strong: (chunks) => <strong>{chunks}</strong> }}
              />
            </p>
            <p>
              <FormattedMessage
                id="directory.for_manufacturers.regulatory.p3"
                defaultMessage="Lewis is not a clinic and not a manufacturer. We are independent infrastructure — the directory patients use to find programs, and the operating platform that orchestrates licensure, the ETRB workflow, patient intake, adverse event reporting, and DPHHS filings end to end for every Montana ETC."
              />
            </p>

            <h2>
              <FormattedMessage
                id="directory.for_manufacturers.paths.h2"
                defaultMessage="The two paths."
              />
            </h2>
            <p>
              <FormattedMessage
                id="directory.for_manufacturers.paths.path1"
                defaultMessage="<strong>Path 1 — Partner with a Montana ETC.</strong> You contract with an existing licensed ETC under a Program Participation Agreement. You sell the drug to the ETC at a negotiated price; the ETC sells to the patient at the price you and they agree to in the agreement. The ETC pays Montana 2% of net annual profits as the Health Freedom and Access Requirement. Both parties capture margin; the regulatory burden of operating the clinic sits with the ETC."
                values={{
                  strong: (chunks) => <strong>{chunks}</strong>,
                }}
              />
            </p>
            <p>
              <FormattedMessage
                id="directory.for_manufacturers.paths.path2"
                defaultMessage="<strong>Path 2 — Operate your own ETC.</strong> You license a Montana ETC subsidiary under SB 535. The drug transfers internally; your subsidiary sells to the patient at the price you set. Your subsidiary pays Montana 2% of net annual profits as the HFAR. You capture the full margin and retain operational control of the clinic. Lewis runs the operating platform; your team runs the clinical operation."
                values={{
                  strong: (chunks) => <strong>{chunks}</strong>,
                }}
              />
            </p>
            <p>
              <FormattedMessage
                id="directory.for_manufacturers.paths.statute"
                defaultMessage='SB 535 § 7 (amending 50-12-103) places <accent>"manufacturer, health care provider, or health care facility"</accent> in parallel as actors who may "establish payment arrangements with a patient." The statute permits both paths on equal footing — neither is the "intended" path. The right one depends on your existing operational capacity, your geographic plans, and how you think about margin capture in the Montana segment of your commercialization.'
                values={{
                  accent: (chunks) => <em className="for-spons__accent">{chunks}</em>,
                }}
              />
            </p>

            <div className="for-spons__compare-wrap">
              <table className="for-spons__compare" aria-label="Comparison of the two paths">
                <thead>
                  <tr>
                    <th scope="col">
                      {/* sr-only text — axe's empty-table-header rule requires
                          actual text content in the header, not just an
                          aria-label. */}
                      <span className="for-spons__sr-only">
                        <FormattedMessage
                          id="directory.for_manufacturers.compare.col.criterion"
                          defaultMessage="Comparison criterion"
                        />
                      </span>
                    </th>
                    <th scope="col">
                      <span className="for-spons__compare-col-h">
                        <FormattedMessage
                          id="directory.for_manufacturers.compare.col.path1.eyebrow"
                          defaultMessage="Path 1"
                        />
                      </span>
                      <FormattedMessage
                        id="directory.for_manufacturers.compare.col.path1.title"
                        defaultMessage="Partner with an ETC"
                      />
                    </th>
                    <th scope="col">
                      <span className="for-spons__compare-col-h">
                        <FormattedMessage
                          id="directory.for_manufacturers.compare.col.path2.eyebrow"
                          defaultMessage="Path 2"
                        />
                      </span>
                      <FormattedMessage
                        id="directory.for_manufacturers.compare.col.path2.title"
                        defaultMessage="Operate your own ETC"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row) => (
                    <tr key={row.key}>
                      <th scope="row">
                        <ManufacturerText message={row.rowHeader} />
                      </th>
                      <td>
                        <ManufacturerText message={row.path1} />
                      </td>
                      <td>
                        {row.path2Emphasis ? (
                          <strong>
                            <ManufacturerText message={row.path2} />
                          </strong>
                        ) : (
                          <ManufacturerText message={row.path2} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2>
              <FormattedMessage
                id="directory.for_manufacturers.platform.h2"
                defaultMessage="What the operating platform does."
              />
            </h2>
            <p>
              <FormattedMessage
                id="directory.for_manufacturers.platform.lede"
                defaultMessage="Beyond the public directory, Lewis orchestrates the regulated handoffs every Montana ETC files — and records each one as it happens."
              />
            </p>
            <ul className="for-spons__modules">
              {platformModules.map((module) => (
                <li key={module.key}>
                  <strong>
                    <ManufacturerText message={module.title} />
                  </strong>{" "}
                  —{" "}
                  <span>
                    <ManufacturerText message={module.description} />
                  </span>
                </li>
              ))}
            </ul>
            <p className="for-spons__platform-coda">
              <FormattedMessage
                id="directory.for_manufacturers.platform.coda"
                defaultMessage="All PHI is processed under signed Business Associate Agreements with our subprocessors. Tenant isolation is enforced by Postgres Row-Level Security with Clerk JWT-based authentication. We are SOC 2 Type II auditable."
              />
            </p>

            <h2>
              <FormattedMessage
                id="directory.for_manufacturers.listing.h2"
                defaultMessage="How a program gets listed."
              />
            </h2>
            <ol className="for-spons__process">
              {processSteps.map((step) => (
                <li key={step.key}>
                  <strong>
                    <ManufacturerText message={step.title} />
                  </strong>
                  <ManufacturerText message={step.body} />
                </li>
              ))}
            </ol>
            <p>
              <FormattedMessage
                id="directory.for_manufacturers.listing.timing"
                defaultMessage="Typical time from first conversation to first patient enrolled is <strong>60 to 90 days</strong> for Path 1, gated primarily by ETRB scheduling and license status."
                values={{ strong: (chunks) => <strong>{chunks}</strong> }}
              />
            </p>

            <h2>
              <FormattedMessage
                id="directory.for_manufacturers.paid.h2"
                defaultMessage="How Lewis is paid."
              />
            </h2>
            <p>
              <FormattedMessage
                id="directory.for_manufacturers.paid.p"
                defaultMessage="Lewis charges manufacturers a per-patient enrollment fee plus a flat platform subscription. <strong>We do not take a percentage of revenue. We do not charge patients. We do not take referral fees from ETCs.</strong> Pricing is discussed in the initial conversation."
                values={{
                  strong: (chunks) => <strong>{chunks}</strong>,
                }}
              />
            </p>

            <h2>
              <FormattedMessage
                id="directory.for_manufacturers.sources.h2"
                defaultMessage="Sources cited."
              />
            </h2>
            <p className="for-spons__sources-lede">
              <FormattedMessage
                id="directory.for_manufacturers.sources.lede"
                defaultMessage="Both documents are the canonical Montana state sources for the regime. Click to download."
              />
            </p>
            <ol className="for-spons__sources">
              {sourceLinks.map((source) => (
                <li key={source.key}>
                  <a
                    className="for-spons__source"
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                  >
                    <span className="for-spons__source-mark" aria-hidden="true">
                      {source.marker}
                    </span>
                    <span className="for-spons__source-body">
                      <span className="for-spons__source-title">
                        <ManufacturerText message={source.title} />
                      </span>
                      <span className="for-spons__source-meta">
                        <ManufacturerText message={source.meta} />
                      </span>
                    </span>
                    <span className="for-spons__source-action" aria-hidden="true">
                      <ManufacturerText message={source.action} />
                      <SourceDownloadIcon />
                    </span>
                  </a>
                </li>
              ))}
            </ol>

            <p className="for-spons__signoff">
              <FormattedMessage
                id="directory.for_manufacturers.signoff"
                defaultMessage="Direct manufacturer inquiries to manufacturers@lewis.health."
              />
              <strong>
                <FormattedMessage
                  id="directory.for_manufacturers.signoff.team"
                  defaultMessage="— The Lewis team"
                />
              </strong>
            </p>

            <p className="for-spons__independence">
              <FormattedMessage
                id="directory.for_manufacturers.independence"
                defaultMessage="Lewis is an independent directory and operating platform. We are not a manufacturer, manufacturer, or clinic. Information sourced from Montana DPHHS public records and licensed program operators."
              />
            </p>
          </div>
        </div>
      </div>
      <FloatingCta
        lead={
          <FormattedMessage
            id="directory.for_manufacturers.eyebrow"
            defaultMessage="For manufacturers & biotech manufacturers"
          />
        }
        label={
          <FormattedMessage
            id="directory.for_manufacturers.rail.cta.email"
            defaultMessage="Talk to our team"
          />
        }
        href="mailto:manufacturers@lewis.health"
      />
    </>
  );
}
