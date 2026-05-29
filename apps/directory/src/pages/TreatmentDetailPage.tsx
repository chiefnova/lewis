import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { ETCS } from "../data/catalog";
import { getProgramContent } from "../data/programs-content";
import { ArrowLeft, ArrowRight, PinIcon } from "../components/icons";
import { TopicalTube } from "../components/Products";
import { ClinicalEvidencePanel } from "../components/ClinicalEvidencePanel";
import { ProgramCostPanel } from "../components/ProgramCostPanel";
import { ProgramSectionNav } from "../components/ProgramSectionNav";
import { TreatmentDetailError } from "../components/TreatmentDetailError";
import { TreatmentDetailSkeleton } from "../components/TreatmentDetailSkeleton";
import { TreatmentNotFound } from "../components/TreatmentNotFound";
import { useProgramDetail } from "./use-program-detail";
import { buildDrugJsonLd } from "../seo/drug-json-ld";
import { useSeo, siteUrl } from "../seo/useSeo";

// Slice 3 — directoryprd.md § 15. Full rewrite of the program detail page.
//
// Composition follows /design-shotgun Round 1 winner (Variant C, approved
// 2026-04-30 — see ~/.gstack/projects/chiefnova-lewis/designs/programs-
// detail-composition-20260430/approved.json). Sticky left product art
// (1/3 width) + flat editorial body + sticky right rail (2/3 split).
// Right rail order: section anchors → patient CTA (Check my eligibility,
// primary fill) → physician CTAs (Refer this patient + Download brief,
// outline). Mobile fallback (<1100px) collapses the rail and falls back
// to an inline eligibility CTA inside the Who-this-is-for panel.
//
// Each section is FLAT — no card background, no Panel wrapper. The body
// is a continuous editorial column with .program-panel-title h2s and
// .program-panel-body prose; visual surfaces (the .evidence-block card
// and the .program-etc-card) only appear where the content needs to be
// visually distinct. This is intentional — using Panel cards for every
// section made the page feel boxy and the spacing felt excessive
// (sections "appeared to come apart"). Editorial flow is the right
// rhythm for this surface.
//
// Data is API-driven via useProgramDetail(slug) which hits
// /v1/public/programs/:slug. ETC card content still reads from the local
// CATALOG until the /v1/public/etcs endpoint ships (slice 4 carryover).
//
// SEO: useSeo emits the augmented Drug JSON-LD per § 15.7
// (clinicalPharmacology, medicineSystem, prescribingInfo).

type SectionDescriptor = { id: string; labelId: string; defaultLabel: string };

// Sections always rendered when a program loads. Cost is appended in the
// component body only when program.costRange is non-null — otherwise the
// section + h2 + rail anchor would be a dead heading pointing at an empty
// ProgramCostPanel (the panel returns null when costRange is null).
const BASE_SECTIONS: ReadonlyArray<SectionDescriptor> = [
  { id: "about", labelId: "directory.program.section-nav.about", defaultLabel: "About" },
  { id: "evidence", labelId: "directory.program.section-nav.evidence", defaultLabel: "Evidence" },
  {
    id: "eligibility",
    labelId: "directory.program.section-nav.eligibility",
    defaultLabel: "Eligibility",
  },
  {
    id: "etc-where",
    labelId: "directory.program.section-nav.etc",
    defaultLabel: "Where to access",
  },
  {
    id: "enrollment",
    labelId: "directory.program.section-nav.enrollment",
    defaultLabel: "Enrollment",
  },
];

const COST_SECTION: SectionDescriptor = {
  id: "cost",
  labelId: "directory.program.section-nav.cost",
  defaultLabel: "Cost",
};

export function TreatmentDetailPage() {
  const navigate = useNavigate();
  const intl = useIntl();
  const { slug = "" } = useParams<{ slug: string }>();
  const { program, loading, error, notFound, retry } = useProgramDetail(slug);
  const content = program ? getProgramContent(program.slug) : undefined;
  // ETC card hydration — local catalog until /v1/public/etcs ships (slice 4).
  const offeringEtc = program ? ETCS.find((e) => e.programs.includes(program.slug)) : undefined;
  const headingRef = useRef<HTMLHeadingElement>(null);

  useSeo({
    title: program
      ? intl.formatMessage(
          { id: "directory.program.seo.title", defaultMessage: "{name} in Montana — Lewis Health" },
          { name: program.name },
        )
      : intl.formatMessage({
          id: "directory.program.not-found.seo.title",
          defaultMessage: "Treatment not found — Lewis Health",
        }),
    description: program
      ? `${program.name} ${program.indication}. ${content?.aboutSummary ?? ""}`.trim()
      : undefined,
    canonical: siteUrl(program ? `/programs/${program.slug}` : "/browse"),
    jsonLd: program ? buildDrugJsonLd(program) : undefined,
    noIndex: notFound || Boolean(error),
  });

  // Move focus to the page heading on every route change so screen
  // readers announce the new page. Mirrors the slice 2 pattern in
  // ConditionDetailPage.
  useEffect(() => {
    if (program) headingRef.current?.focus();
  }, [program]);

  if (loading) return <TreatmentDetailSkeleton />;
  if (notFound) return <TreatmentNotFound />;
  if (error || !program) return <TreatmentDetailError onRetry={retry} />;

  // Build the section list from program data so the rail anchors match
  // what's actually rendered. costRange is the only conditional section
  // today; other sections always render with content from the API + the
  // editorial content module.
  const sections: ReadonlyArray<SectionDescriptor> = program.costRange
    ? [...BASE_SECTIONS, COST_SECTION]
    : BASE_SECTIONS;

  return (
    <article className="fade-up split-detail">
      <div className="split-detail-art" style={{ flexDirection: "column", position: "sticky" }}>
        <TopicalTube size={420} />
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 32,
            fontStyle: "italic",
            fontFamily: "var(--serif)",
            color: "var(--ink-soft)",
            fontSize: 13,
          }}
        >
          <FormattedMessage
            id="directory.program.product-disclaimer"
            defaultMessage="Actual product appearance may vary."
          />
        </div>
      </div>

      <div className="split-detail-content-grid">
        <main>
          <button type="button" onClick={() => navigate("/browse")} className="program-back-link">
            <ArrowLeft />
            <FormattedMessage
              id="directory.program.back-to-browse"
              defaultMessage="Back to browse"
            />
          </button>

          <h1 ref={headingRef} tabIndex={-1} className="program-title serif">
            {program.name}
          </h1>
          <div className="program-available-tag serif">
            <FormattedMessage
              id="directory.program.available-tag"
              defaultMessage="Available {nowEm} in Montana"
              values={{
                nowEm: (
                  <span className="italic">
                    <FormattedMessage
                      id="directory.program.available-tag.now"
                      defaultMessage="now"
                    />
                  </span>
                ),
              }}
            />
          </div>
          <div className="program-manufacturer-line">
            <FormattedMessage
              id="directory.program.manufacturer-line"
              defaultMessage="Topical investigational treatment for {indication} from {manufacturerEm}"
              values={{
                indication: program.indication,
                manufacturerEm: (
                  <span className="ink">
                    {program.manufacturer ??
                      intl.formatMessage({
                        id: "directory.program.manufacturer.fallback",
                        defaultMessage: "the manufacturer",
                      })}
                  </span>
                ),
              }}
            />
          </div>

          <section className="program-panel" id="about">
            <h2 className="program-panel-title">
              <FormattedMessage
                id="directory.program.about.heading"
                defaultMessage="About this treatment."
              />
            </h2>
            <div className="program-panel-body">
              {content?.aboutParagraphs.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
              {!content?.aboutParagraphs.length && program.about && <p>{program.about}</p>}
            </div>
            {/* Closing visual for the About section — Cajal's 1899 ink
                drawing of sensory nerve endings in skin and hair (after
                Retzius), scanned by the Wellcome Collection (CC BY 4.0).
                The plate visualizes the biological structure the
                treatment is aimed at: the hair follicle descending into
                dermis with sensory nerve endings wrapping its base, the
                exact peripheral architecture targeted by WST-057.
                Same museum-mat treatment as the HomePage ForClinicians
                Ammon's-horn plate, the /for-clinicians frontispiece, and
                the AboutPage 1836 Hooker bitterroot — one visual grammar
                across every scholarly artifact on the site. Decorative
                (aria-hidden); italic Fraunces caption credits the
                source. Conditionally shipped only for programs targeting
                peripheral nerves so this doesn't appear on future
                non-PN programs. */}
            {program.slug === "wst-057" ? (
              <figure className="program-plate" aria-hidden="true">
                <span className="program-plate-mat">
                  <img
                    src="/images/cajal/nerve-endings-skin-cajal.webp"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={1400}
                    height={1149}
                  />
                </span>
                <figcaption>
                  Santiago Ramón y Cajal — sensory nerve endings in skin and hair, after Retzius.
                  (Wellcome Collection)
                </figcaption>
              </figure>
            ) : null}
          </section>

          <section className="program-panel" id="evidence">
            <h2 className="program-panel-title">
              <FormattedMessage
                id="directory.program.evidence.heading"
                defaultMessage="Clinical evidence."
              />
            </h2>
            <ClinicalEvidencePanel program={program} />
          </section>

          <section className="program-panel" id="eligibility">
            <h2 className="program-panel-title">
              <FormattedMessage
                id="directory.program.who.heading"
                defaultMessage="Who this is for."
              />
            </h2>
            <div className="program-panel-body">
              <p>{content?.whoThisIsForIntro ?? program.whoThisIsFor}</p>
            </div>
            {/* Mobile-only inline CTA. Desktop renders the patient CTA in
                the right rail; below 1100px the rail is hidden so the
                conversion path falls back here. CSS in styles.css hides
                this above 1100px. */}
            <div className="program-mobile-cta">
              <Link to={`/eligibility/${program.slug}`} className="pill pill-primary">
                <FormattedMessage
                  id="directory.program.cta.patient.eligibility-mobile"
                  defaultMessage="Check my eligibility"
                />
                <ArrowRight />
              </Link>
            </div>
          </section>

          <section className="program-panel" id="etc-where">
            <h2 className="program-panel-title">
              <FormattedMessage
                id="directory.program.where.heading"
                defaultMessage="Where to access this treatment."
              />
            </h2>
            {offeringEtc ? (
              <>
                <div className="program-panel-body" style={{ marginBottom: 14 }}>
                  <p>
                    <FormattedMessage
                      id="directory.program.where.intro"
                      defaultMessage="{name} is currently available at the following Montana Experimental Treatment Center:"
                      values={{ name: program.name }}
                    />
                  </p>
                </div>
                <div className="program-etc-card">
                  <div className="program-etc-name">{offeringEtc.name}</div>
                  <div className="program-etc-loc">
                    <PinIcon /> {offeringEtc.city}, {offeringEtc.state}
                  </div>
                  <p className="program-etc-prose">
                    <FormattedMessage
                      id="directory.program.where.etc-blurb"
                      defaultMessage="An outpatient specialty clinic licensed under Montana's ETC framework. Focus on neurology and pain medicine; staffed by a multidisciplinary clinical team."
                    />
                  </p>
                  <div className="program-accept-tag">
                    <FormattedMessage
                      id="directory.program.where.accepting"
                      defaultMessage="Currently accepting new patients"
                    />
                  </div>
                  <div className="program-etc-actions">
                    <Link to={`/etcs/${offeringEtc.slug}`} className="pill pill-outline pill-sm">
                      <FormattedMessage
                        id="directory.program.where.view-profile"
                        defaultMessage="View ETC profile"
                      />
                      <ArrowRight size={12} />
                    </Link>
                    <Link to={`/connect/${program.slug}`} className="pill pill-primary pill-sm">
                      <FormattedMessage
                        id="directory.program.where.connect"
                        defaultMessage="Connect about this treatment"
                      />
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <div className="program-panel-body">
                <p>
                  <FormattedMessage
                    id="directory.program.where.no-etc"
                    defaultMessage="No licensed ETC is currently offering this program."
                  />
                </p>
              </div>
            )}
          </section>

          <section className="program-panel" id="enrollment">
            <h2 className="program-panel-title">
              <FormattedMessage
                id="directory.program.enrollment.heading"
                defaultMessage="How enrollment works."
              />
            </h2>
            <ol className="program-enrollment">
              <li>
                <FormattedMessage
                  id="directory.program.enrollment.step1"
                  defaultMessage="Connect with the ETC. They review your situation."
                />
              </li>
              <li>
                <FormattedMessage
                  id="directory.program.enrollment.step2"
                  defaultMessage="Provide your treating clinician's recommendation and a current H&P."
                />
              </li>
              <li>
                <FormattedMessage
                  id="directory.program.enrollment.step3"
                  defaultMessage="Complete informed consent and the patient agreement before your first visit."
                />
              </li>
            </ol>
            <div className="program-enrollment-note">
              <FormattedMessage
                id="directory.program.enrollment.note"
                defaultMessage="Lewis never charges patients. You'll pay the ETC directly for the treatment."
              />
            </div>
          </section>

          {program.costRange && (
            <section className="program-panel" id="cost">
              <h2 className="program-panel-title">
                <FormattedMessage
                  id="directory.program.cost.heading"
                  defaultMessage="What this typically costs."
                />
              </h2>
              <ProgramCostPanel program={program} />
            </section>
          )}

          <div className="program-feedback-footer">
            <div className="program-ff-title serif">
              <FormattedMessage
                id="directory.program.feedback.heading"
                defaultMessage="Used Lewis?"
              />
            </div>
            <div className="program-ff-body">
              <FormattedMessage
                id="directory.program.feedback.body"
                defaultMessage="If you've worked with an ETC through this directory, please share your story."
              />
            </div>
            <Link
              to={`/feedback?ref=program:${program.slug}`}
              className="pill pill-outline pill-sm"
            >
              <FormattedMessage
                id="directory.program.feedback.cta"
                defaultMessage="Share feedback"
              />
            </Link>
          </div>
        </main>

        <ProgramSectionNav program={program} sections={sections} />
      </div>
    </article>
  );
}
