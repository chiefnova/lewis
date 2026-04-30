import { FormattedMessage, useIntl } from "react-intl";
import { Link, useParams } from "react-router-dom";

import { ArrowRight } from "../../components/icons";
import { Panel } from "../../components/Panel";
import {
  getConditionBySlug,
  getProgramsForCondition,
  type CatalogCondition,
  type CatalogProgram,
} from "../../data/catalog";
import { useSeo, siteUrl } from "../../seo/useSeo";

const STATE_MESSAGE_ID: Record<CatalogCondition["state"], string> = {
  live: "directory.conditions.detail.state.live",
  coming_soon: "directory.conditions.detail.state.coming-soon",
  not_offered: "directory.conditions.detail.state.not-offered",
};

export function ConditionDetailPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const intl = useIntl();
  const condition = getConditionBySlug(slug);
  const programs = condition ? getProgramsForCondition(condition) : [];

  useSeo({
    title: condition
      ? `${condition.name} — Lewis Health`
      : `${intl.formatMessage({ id: "directory.conditions.not-found.title" })} — Lewis Health`,
    description: condition
      ? `Experimental treatment options for ${condition.name} in Montana.`
      : intl.formatMessage({ id: "directory.conditions.not-found.body" }),
    canonical: siteUrl(condition ? `/conditions/${condition.slug}` : "/conditions"),
    noIndex: !condition,
  });

  if (!condition) {
    return (
      <div className="fade-up" style={{ padding: "80px 0 120px" }}>
        <div className="container-narrow">
          <h1 className="serif" style={{ fontSize: 42, lineHeight: 1.05, marginBottom: 18 }}>
            <FormattedMessage id="directory.conditions.not-found.title" />
          </h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 16, lineHeight: 1.65, marginBottom: 28 }}>
            <FormattedMessage id="directory.conditions.not-found.body" />
          </p>
          <Link to="/search" className="pill pill-primary">
            <FormattedMessage id="directory.conditions.not-found.search-cta" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up" style={{ padding: "72px 0 120px" }}>
      <div className="container-narrow">
        <Link
          to="/search"
          style={{
            color: "var(--ink-soft)",
            fontSize: 13,
            marginBottom: 26,
            display: "inline-flex",
            textDecoration: "none",
          }}
        >
          <FormattedMessage id="directory.conditions.detail.back" />
        </Link>

        <p
          style={{
            color: "var(--accent)",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 12,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          <FormattedMessage id={STATE_MESSAGE_ID[condition.state]} />
        </p>

        <h1
          className="serif"
          style={{
            fontSize: "clamp(2.4rem, 5vw, 3.6rem)",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            marginBottom: 20,
          }}
        >
          <FormattedMessage id="directory.conditions.detail.h1" values={{ name: condition.name }} />
        </h1>

        <p style={{ color: "var(--ink-soft)", fontSize: 17, lineHeight: 1.65, marginBottom: 28 }}>
          {condition.summary}
        </p>

        {condition.icd10Codes.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 36,
            }}
          >
            {condition.icd10Codes.map((code) => (
              <span
                key={code}
                style={{
                  border: "1px solid var(--rule)",
                  borderRadius: 9999,
                  color: "var(--ink-soft)",
                  fontSize: 12,
                  padding: "5px 10px",
                }}
              >
                ICD-10 {code}
              </span>
            ))}
          </div>
        ) : null}

        <Panel
          title={intl.formatMessage({ id: "directory.conditions.detail.listed-programs.title" })}
        >
          {programs.length > 0 ? (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {programs.map((program) => (
                <ProgramRow key={program.slug} program={program} />
              ))}
            </ul>
          ) : (
            <NoListedPrograms condition={condition} />
          )}
        </Panel>

        <Panel
          title={intl.formatMessage({ id: "directory.conditions.detail.where-to-start.title" })}
        >
          <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.65, marginBottom: 18 }}>
            <FormattedMessage id="directory.conditions.detail.where-to-start.body" />
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link to="/browse" className="pill pill-outline pill-sm">
              <FormattedMessage id="directory.conditions.detail.where-to-start.browse" />
            </Link>
            {programs[0] ? (
              <Link to={`/eligibility/${programs[0].slug}`} className="pill pill-primary pill-sm">
                <FormattedMessage id="directory.conditions.detail.where-to-start.eligibility" />
                <ArrowRight size={12} />
              </Link>
            ) : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ProgramRow({ program }: { program: CatalogProgram }) {
  return (
    <li
      style={{
        border: "1px solid var(--rule)",
        borderRadius: 6,
        padding: 20,
        marginBottom: 12,
      }}
    >
      <Link
        to={`/programs/${program.slug}`}
        style={{
          color: "var(--ink)",
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          textDecoration: "none",
        }}
      >
        <span>
          <span className="serif" style={{ display: "block", fontSize: 20, marginBottom: 6 }}>
            {program.name}
          </span>
          <span style={{ color: "var(--ink-soft)", display: "block", fontSize: 14 }}>
            {program.manufacturer ? `${program.manufacturer} · ` : ""}
            {[program.phase, program.form, program.etcCity].filter(Boolean).join(" · ")}
          </span>
        </span>
        <span
          aria-hidden="true"
          style={{ color: "var(--accent)", display: "inline-flex", paddingTop: 4 }}
        >
          <ArrowRight size={14} />
        </span>
      </Link>
    </li>
  );
}

function NoListedPrograms({ condition }: { condition: CatalogCondition }) {
  // Differentiated copy + CTA per directoryprd.md § 14.2:
  //   - coming_soon: Lewis is actively pursuing this. Don't redirect to a
  //     competitor's trial registry — the user should wait for the listing.
  //     The "Get notified" email-signup wiring lands in a follow-up slice
  //     (per directoryprd.md § 7.5 disabled CTAs); until then, no
  //     ClinicalTrials.gov fallback is rendered for this state.
  //   - not_offered: nothing in pipeline. Point the patient to
  //     clinicaltrials.gov so they have a real next step.
  if (condition.state === "coming_soon") {
    return (
      <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.65, margin: 0 }}>
        <FormattedMessage id="directory.conditions.detail.no-programs.coming-soon" />
      </p>
    );
  }

  const clinicalTrialsUrl = `https://clinicaltrials.gov/search?cond=${encodeURIComponent(
    condition.name,
  )}`;

  return (
    <>
      <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.65, marginBottom: 18 }}>
        <FormattedMessage id="directory.conditions.detail.no-programs.not-offered" />
      </p>
      <a
        href={clinicalTrialsUrl}
        target="_blank"
        rel="noreferrer"
        className="pill pill-outline pill-sm"
      >
        <FormattedMessage id="directory.conditions.detail.no-programs.ctgov-cta" />
      </a>
    </>
  );
}
