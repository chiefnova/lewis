import { Link } from "react-router-dom";
import { FormattedMessage } from "react-intl";

import { FloatingCta } from "../components/FloatingCta";
import { useSeo, siteUrl } from "../seo/useSeo";

/**
 * Slice 5 § 20 — For treating clinicians.
 *
 * Peer-letter page for Montana-licensed and out-of-state clinicians.
 * Keep body copy in react-intl and keep regulatory language traceable to
 * directoryprd.md § 20, SB 535, and MAR 2026-427.1.
 */

function DownloadIcon() {
  return (
    <svg
      className="for-clin__source-icon"
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

export function ForCliniciansPage() {
  useSeo({
    title: "For treating clinicians considering an experimental treatment — Lewis Health",
    description:
      "How Montana-licensed and out-of-state clinicians refer patients into a licensed Montana Experimental Treatment Center under SB 535 and MAR 2026-427.1. Treatment is administered in Montana by Montana-licensed clinicians; every program is independently reviewed by an Experimental Treatment Review Board.",
    canonical: siteUrl("/for-clinicians"),
  });

  return (
    <>
      <div className="for-clin fade-up">
        <div className="for-clin__letter-col">
          <h1 className="for-clin__h1 serif">
            <FormattedMessage
              id="directory.for_clinicians.h1"
              defaultMessage="For treating clinicians considering an {em}."
              values={{
                em: (
                  <em className="for-clin__h1-em">
                    <FormattedMessage
                      id="directory.for_clinicians.h1.em"
                      defaultMessage="experimental treatment"
                    />
                  </em>
                ),
              }}
            />
          </h1>

          <div className="for-clin__letter">
            <p className="for-clin__salutation">
              <FormattedMessage
                id="directory.for_clinicians.salutation"
                defaultMessage="Dear fellow {em},"
                values={{
                  em: (
                    <em className="for-clin__h1-em">
                      <FormattedMessage
                        id="directory.for_clinicians.salutation.em"
                        defaultMessage="clinician"
                      />
                    </em>
                  ),
                }}
              />
            </p>

            <p>
              <FormattedMessage
                id="directory.for_clinicians.intro1"
                defaultMessage="Lewis is the public directory for Montana's licensed Experimental Treatment Centers. If your patient asks about an experimental treatment they read about, this is where you can verify it exists, see the published evidence, download a clinical brief, and reach the ETC's medical director directly. We are independent — not a manufacturer, not a clinic."
              />
            </p>

            <p>
              <FormattedMessage
                id="directory.for_clinicians.intro2"
                defaultMessage='This page is written for two audiences and the distinctions matter: clinicians licensed in Montana (the statute calls them "health care providers" — § 50-12-102(4)), and clinicians licensed outside Montana referring a patient to a Montana ETC. {accent} the operational workflow is the same in both cases; one footnote differs at the end.'
                values={{
                  accent: (
                    <em className="for-clin__accent">
                      <FormattedMessage
                        id="directory.for_clinicians.intro2.accent"
                        defaultMessage="Section 12 of SB 535 protects Montana licenses;"
                      />
                    </em>
                  ),
                }}
              />
            </p>

            <h2>
              <FormattedMessage
                id="directory.for_clinicians.where.h2"
                defaultMessage="Where treatment happens."
              />
            </h2>
            <p>
              <FormattedMessage
                id="directory.for_clinicians.where.p1"
                defaultMessage="Experimental treatment under SB 535 is administered {strong}. An ETC is a Montana licensed health care facility (MCA § 50-5-101(18)). Its medical director is licensed by the Montana Board of Medical Examiners (MAR NEW RULE 4(9)). A Montana-licensed physician, APRN with prescriptive authority, physician assistant, or nurse practitioner must be on site whenever a patient is present (MAR NEW RULE 9(1)). Out-of-state clinicians may collaborate or consult on treatments and outcomes (MAR NEW RULE 9(3)), but the treatment itself is delivered in Montana."
                values={{
                  strong: (
                    <strong>
                      <FormattedMessage
                        id="directory.for_clinicians.where.p1.strong"
                        defaultMessage="at the Montana ETC site, by Montana-licensed clinicians"
                      />
                    </strong>
                  ),
                }}
              />
            </p>
            <p>
              <FormattedMessage
                id="directory.for_clinicians.where.p2"
                defaultMessage='Patients travel to Montana for treatment. SB 535 places no residency requirement on the patient — the "qualifying Montana resident" language in Section 2 of the bill is specific to a separate 2% access-subsidy program, not to eligibility for treatment.'
              />
            </p>

            <h2>
              <FormattedMessage
                id="directory.for_clinicians.etrb.h2"
                defaultMessage="Independent protocol review."
              />
            </h2>
            <p>
              <FormattedMessage
                id="directory.for_clinicians.etrb.p1"
                defaultMessage="Every treatment listed here has been reviewed and approved by an Experimental Treatment Review Board (ETRB) before the ETC may provide it. Under MAR NEW RULE 16(7), an ETC {q1} and has performed its evaluations. The board, per MAR NEW RULE 16(5), {q2} and {q3} — and per Rule 16(3) must be {q4}"
                values={{
                  q1: (
                    <em>
                      "may not provide any treatments or devices until a review board is
                      established"
                    </em>
                  ),
                  q2: <em>"shall consist of at least four members"</em>,
                  q3: (
                    <em>
                      "shall include at least one Montana-licensed physician, at least one
                      researcher with expertise in clinical outcome data, and at least one ethicist"
                    </em>
                  ),
                  q4: (
                    <em>
                      "comprised only of members who have no personal, financial, employment, or
                      ownership interest, or any other conflict of interest in the experimental
                      treatment center."
                    </em>
                  ),
                }}
              />
            </p>
            <p>
              <FormattedMessage
                id="directory.for_clinicians.etrb.p2"
                defaultMessage="Protocol review under Rule 16(6)(a) requires the board to document that {q1} that {q2} that {q3} and that {q4} Adverse-event data is reviewed on an ongoing basis (Rule 16(6)(e); MAR NEW RULE 17), and ETRB approvals and safety records are preserved for at least five years (Rule 16(6)(d)). For each program in this directory, the ETC publishes a clinical brief that summarizes the ETRB's findings and the program's safety profile; that is the document you can pull for chart review."
                values={{
                  q1: (
                    <em>
                      "safety standards equivalent to or higher than those of recognized regulatory
                      authorities are met,"
                    </em>
                  ),
                  q2: <em>"informed consent procedures are comprehensive and understandable,"</em>,
                  q3: <em>"risk-benefit analysis demonstrates a reasonable safety profile,"</em>,
                  q4: <em>"alternative treatments have been appropriately evaluated."</em>,
                }}
              />
            </p>

            <h2>
              <FormattedMessage
                id="directory.for_clinicians.keep.h2"
                defaultMessage="What you keep, what the ETC handles."
              />
            </h2>
            <p>
              <FormattedMessage
                id="directory.for_clinicians.keep.p1"
                defaultMessage="A referral to an ETC is not a transfer of care. {strong} The ETC's medical director handles the experimental treatment specifically — clinical review, consent process, treatment administration, follow-up, and adverse-event reporting (MAR NEW RULE 17). If the review concludes the program isn't a fit, your patient returns to your care; the ETC reports back to you in writing either way."
                values={{
                  strong: (
                    <strong>
                      <FormattedMessage
                        id="directory.for_clinicians.keep.p1.strong"
                        defaultMessage="You retain your broader treating relationship with the patient."
                      />
                    </strong>
                  ),
                }}
              />
            </p>
            <p>
              <FormattedMessage
                id="directory.for_clinicians.keep.p2"
                defaultMessage={`Statutory eligibility under MCA § 50-12-104 requires the patient to have evaluated FDA-approved options, received a recommendation from a "treating health care provider" (defined at MCA § 50-12-102(4) as a Montana-Title-37 licensee), given written informed consent under § 50-12-105, and received documentation that they meet these criteria. {strong} after independent clinical review of your letter and the patient's records. Your letter is the clinical input; the ETC's medical director issues the document of record.`}
                values={{
                  strong: (
                    <strong>
                      <FormattedMessage
                        id="directory.for_clinicians.keep.p2.strong"
                        defaultMessage={`For an out-of-state referral, the ETC's Montana-licensed medical director typically becomes the "treating health care provider" issuing the formal recommendation`}
                      />
                    </strong>
                  ),
                }}
              />
            </p>

            <h2>
              <FormattedMessage
                id="directory.for_clinicians.refer.h2"
                defaultMessage="How a referral happens."
              />
            </h2>
            <ol className="for-clin__process">
              <li>
                <strong>
                  <FormattedMessage
                    id="directory.for_clinicians.refer.step1.label"
                    defaultMessage="Write a referral letter."
                  />
                </strong>
                <FormattedMessage
                  id="directory.for_clinicians.refer.step1.body"
                  defaultMessage="On your letterhead, in your voice. The ETC's clinical team uses it alongside the patient's recent H&P (MAR Rule 12(2)(b)(iii) — within 12 months of the ETC visit) to evaluate whether the program is appropriate."
                />
                {/* Step 1 is where clinicians need the concrete referral-letter fields. */}
                <div className="for-clin__step-includes-head">
                  <FormattedMessage
                    id="directory.for_clinicians.refer.step1.checklist.head"
                    defaultMessage="What to include:"
                  />
                </div>
                <ul className="for-clin__step-checklist">
                  <li>
                    <FormattedMessage
                      id="directory.for_clinicians.refer.step1.checklist.diagnosis"
                      defaultMessage="Patient's diagnosis with ICD-10 code"
                    />
                  </li>
                  <li>
                    <FormattedMessage
                      id="directory.for_clinicians.refer.step1.checklist.history"
                      defaultMessage="Relevant clinical history"
                    />
                  </li>
                  <li>
                    <FormattedMessage
                      id="directory.for_clinicians.refer.step1.checklist.options"
                      defaultMessage="FDA-approved options the patient has evaluated {cite}"
                      values={{
                        cite: <span className="for-clin__cite">(§ 50-12-104(1))</span>,
                      }}
                    />
                  </li>
                  <li>
                    <FormattedMessage
                      id="directory.for_clinicians.refer.step1.checklist.rationale"
                      defaultMessage="Clinical rationale for an experimental treatment"
                    />
                  </li>
                  <li>
                    <FormattedMessage
                      id="directory.for_clinicians.refer.step1.checklist.hp"
                      defaultMessage="H&P by a treating practitioner, within 12 months {cite}"
                      values={{
                        cite: <span className="for-clin__cite">(MAR Rule 12(2)(b)(iii))</span>,
                      }}
                    />
                  </li>
                  <li>
                    <FormattedMessage
                      id="directory.for_clinicians.refer.step1.checklist.license"
                      defaultMessage="Your name, NPI, license number {state}, DEA (if applicable)"
                      values={{
                        state: <span className="for-clin__license-state">+ state of issuance</span>,
                      }}
                    />
                  </li>
                  <li>
                    <FormattedMessage
                      id="directory.for_clinicians.refer.step1.checklist.contact"
                      defaultMessage="Direct contact for follow-up"
                    />
                  </li>
                </ul>
              </li>
              <li>
                <strong>
                  <FormattedMessage
                    id="directory.for_clinicians.refer.step2.label"
                    defaultMessage="Send it to the ETC's medical director."
                  />
                </strong>
                <FormattedMessage
                  id="directory.for_clinicians.refer.step2.body"
                  defaultMessage="The ETC profile page lists the medical-director clinical contact line — that is the direct route today. Your patient (or you, on their behalf) can also submit the connect request through this site; the ETC's coordinator follows up within two business days. Lewis is the routing layer; the clinical relationship is between you, the patient, and the ETC."
                />
              </li>
              <li>
                <strong>
                  <FormattedMessage
                    id="directory.for_clinicians.refer.step3.label"
                    defaultMessage="Consult on review, if asked."
                  />
                </strong>
                <FormattedMessage
                  id="directory.for_clinicians.refer.step3.body"
                  defaultMessage="The ETC's medical director may reach out with clinical questions — collaboration and consultation by out-of-state clinicians is explicitly contemplated in MAR NEW RULE 9(3). Whether the program proceeds or not, the ETC reports back to you in writing."
                />
              </li>
            </ol>

            <h2>
              <FormattedMessage
                id="directory.for_clinicians.mt.h2"
                defaultMessage="For clinicians licensed in Montana: your license protection."
              />
            </h2>
            <p>
              <FormattedMessage
                id="directory.for_clinicians.mt.p1"
                defaultMessage={`MCA § 50-12-108(1) reads, verbatim: {accent} "Title 37" is the Montana Code Annotated chapter for licensed health care providers; the protection runs to Montana medical, nursing, and PA licenses. § 50-12-108(2) adds parallel protections from DPHHS action against your Medicare certification for the same recommendation, and from action against an ETC's facility license for its recommendations to a patient. The full statutory text is in the SB 535 PDF cited at the end of this letter.`}
                values={{
                  accent: (
                    <em className="for-clin__accent">
                      <FormattedMessage
                        id="directory.for_clinicians.mt.p1.accent"
                        defaultMessage="A licensing board may not revoke, fail to renew, suspend, or take any action against a license issued under Title 37 to a health care provider based solely on the health care provider's recommendations to a patient regarding access to or provision of an experimental treatment with an investigational drug, biological product, or device."
                      />
                    </em>
                  ),
                }}
              />
            </p>

            <h2>
              <FormattedMessage
                id="directory.for_clinicians.oos.h2"
                defaultMessage="For clinicians licensed outside Montana."
              />
            </h2>
            <p>
              <FormattedMessage
                id="directory.for_clinicians.oos.p1"
                defaultMessage="SB 535 is Montana law. {strong} Referring a patient to a specialty health-care facility licensed in another jurisdiction is standard medical practice, and most state boards treat referral activity within scope when the referring clinician acts in good faith and within the medical standard of care. We are not your counsel and cannot speak for your board. If your specific posture matters, confirm it with your state medical board, nursing board, or your malpractice carrier before sending the referral."
                values={{
                  strong: (
                    <strong>
                      <FormattedMessage
                        id="directory.for_clinicians.oos.p1.strong"
                        defaultMessage="§ 50-12-108(1) constrains Montana licensing boards acting on Montana Title-37 licenses; it does not bind your home state's licensing board."
                      />
                    </strong>
                  ),
                }}
              />
            </p>

            {/* Decorative scholarly plate before the source bibliography. */}
            <figure className="for-clin__frontispiece" aria-hidden="true">
              <span className="for-clin__frontispiece-mat">
                <img
                  src="/images/cajal/purkinje-cerebellum-cajal.webp"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={720}
                  height={1024}
                />
              </span>
              <figcaption>
                Santiago Ramón y Cajal — Purkinje neuron, human cerebellum. (Museo Cajal, Madrid)
              </figcaption>
            </figure>

            <h2>
              <FormattedMessage
                id="directory.for_clinicians.sources.h2"
                defaultMessage="Sources cited."
              />
            </h2>
            <p className="for-clin__sources-lede">
              <FormattedMessage
                id="directory.for_clinicians.sources.lede"
                defaultMessage="Both documents are the canonical Montana state sources for the regime. Click to download."
              />
            </p>
            <ol className="for-clin__sources">
              <li>
                <a
                  className="for-clin__source"
                  href="/legislation/sb535.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                >
                  <span className="for-clin__source-mark" aria-hidden="true">
                    i.
                  </span>
                  <span className="for-clin__source-body">
                    <span className="for-clin__source-title">
                      <FormattedMessage
                        id="directory.for_clinicians.sources.sb535.title"
                        defaultMessage="Senate Bill 535 — Right to Try Act + ETC licensure"
                      />
                    </span>
                    <span className="for-clin__source-meta">
                      <FormattedMessage
                        id="directory.for_clinicians.sources.sb535.meta"
                        defaultMessage="69th Montana Legislature · 2025 · enrolled bill"
                      />
                    </span>
                  </span>
                  <span className="for-clin__source-action" aria-hidden="true">
                    <FormattedMessage
                      id="directory.for_clinicians.sources.action"
                      defaultMessage="Download PDF"
                    />
                    <DownloadIcon />
                  </span>
                </a>
              </li>
              <li>
                <a
                  className="for-clin__source"
                  href="/legislation/mar-2026-427-1.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                >
                  <span className="for-clin__source-mark" aria-hidden="true">
                    ii.
                  </span>
                  <span className="for-clin__source-body">
                    <span className="for-clin__source-title">
                      <FormattedMessage
                        id="directory.for_clinicians.sources.mar.title"
                        defaultMessage="MAR Notice 2026-427.1 — ETC licensure rules"
                      />
                    </span>
                    <span className="for-clin__source-meta">
                      <FormattedMessage
                        id="directory.for_clinicians.sources.mar.meta"
                        defaultMessage="DPHHS proposed rulemaking · April 10, 2026"
                      />
                    </span>
                  </span>
                  <span className="for-clin__source-action" aria-hidden="true">
                    <FormattedMessage
                      id="directory.for_clinicians.sources.action.2"
                      defaultMessage="Download PDF"
                    />
                    <DownloadIcon />
                  </span>
                </a>
              </li>
            </ol>

            <p className="for-clin__signoff">
              <FormattedMessage
                id="directory.for_clinicians.signoff"
                defaultMessage="Direct clinical inquiries to clinicians@lewis.health."
              />
              <strong>
                <FormattedMessage
                  id="directory.for_clinicians.signoff.team"
                  defaultMessage="— The Lewis team"
                />
              </strong>
            </p>
          </div>

          {/* Keep this inside the letter column so it follows the same section rhythm. */}
          <section className="for-clin__programs" aria-label="Available programs">
            <h2 className="for-clin__programs-h2 serif">
              <FormattedMessage
                id="directory.for_clinicians.programs.h2"
                defaultMessage="Available programs."
              />
            </h2>
            <p className="for-clin__programs-sub">
              <FormattedMessage
                id="directory.for_clinicians.programs.sub"
                defaultMessage="Each program links to its clinical brief."
              />
            </p>
            <div className="for-clin__programs-grid">
              <Link className="for-clin__program-card" to="/programs/wst-057">
                <div>
                  <p className="for-clin__program-name">
                    WST-057<sup>®</sup>
                  </p>
                  <p className="for-clin__program-meta">
                    <FormattedMessage
                      id="directory.for_clinicians.programs.wst057.meta"
                      defaultMessage="Topical · Phase 2 · Diabetic peripheral neuropathy · Big Sky ETC, Bozeman"
                    />
                  </p>
                </div>
                <span className="for-clin__program-cta">
                  <FormattedMessage
                    id="directory.for_clinicians.programs.wst057.cta"
                    defaultMessage="View brief"
                  />
                </span>
              </Link>
            </div>
            <p className="for-clin__programs-more">
              <FormattedMessage
                id="directory.for_clinicians.programs.more"
                defaultMessage="More programs added as Montana ETCs license and onboard."
              />
            </p>
            <Link to="/browse" className="for-clin__programs-browse">
              <FormattedMessage
                id="directory.for_clinicians.programs.browse"
                defaultMessage="Browse the full directory"
              />
            </Link>
          </section>

          <p className="for-clin__independence">
            <FormattedMessage
              id="directory.for_clinicians.independence"
              defaultMessage="Lewis is an independent directory. We are not a manufacturer, manufacturer, or clinic. Information sourced from Montana DPHHS public records and licensed program operators."
            />
          </p>
        </div>
      </div>

      {/* Keep outside `.for-clin.fade-up`; transformed ancestors can trap fixed children. */}
      <FloatingCta
        lead={
          <FormattedMessage
            id="directory.for_clinicians.float.lead"
            defaultMessage="Have a patient to refer?"
          />
        }
        label={
          <FormattedMessage
            id="directory.for_clinicians.float.cta"
            defaultMessage="Start a connect request"
          />
        }
        to="/connect/wst-057?via=clinician"
      />
    </>
  );
}
