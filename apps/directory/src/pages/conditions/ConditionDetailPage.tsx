import { FormattedMessage } from "react-intl";
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
  const condition = getConditionBySlug(slug);
  const programs = condition ? getProgramsForCondition(condition) : [];

  useSeo({
    title: condition ? `${condition.name} — Lewis Health` : "Condition not found — Lewis Health",
    description: condition
      ? `Experimental treatment options for ${condition.name} in Montana.`
      : "Browse listed conditions and programs in the Lewis Health public directory.",
    canonical: siteUrl(condition ? `/conditions/${condition.slug}` : "/conditions"),
    noIndex: !condition,
  });

  if (!condition) {
    return (
      <div className="fade-up" style={{ padding: "80px 0 120px" }}>
        <div className="container-narrow">
          <h1 className="serif" style={{ fontSize: 42, lineHeight: 1.05, marginBottom: 18 }}>
            Condition not found
          </h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 16, lineHeight: 1.65, marginBottom: 28 }}>
            This condition is not listed in the Lewis directory.
          </p>
          <Link to="/search" className="pill pill-primary">
            Search Lewis
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
          Back to search
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

        <Panel title="Listed programs.">
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

        <Panel title="Where to start.">
          <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.65, marginBottom: 18 }}>
            Lewis is a public directory. A licensed Montana Experimental Treatment Center determines
            clinical eligibility, required records, informed consent, and final pricing.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link to="/browse" className="pill pill-outline pill-sm">
              Browse all treatments
            </Link>
            {programs[0] ? (
              <Link to={`/eligibility/${programs[0].slug}`} className="pill pill-primary pill-sm">
                Check eligibility <ArrowRight size={12} />
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
  const clinicalTrialsUrl = `https://clinicaltrials.gov/search?cond=${encodeURIComponent(
    condition.name,
  )}`;

  return (
    <>
      <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.65, marginBottom: 18 }}>
        {condition.state === "coming_soon"
          ? "Lewis is tracking this condition, but no Montana ETC has a public program listed yet."
          : "No Montana ETC currently lists a public program for this condition."}
      </p>
      <a
        href={clinicalTrialsUrl}
        target="_blank"
        rel="noreferrer"
        className="pill pill-outline pill-sm"
      >
        Search ClinicalTrials.gov
      </a>
    </>
  );
}
