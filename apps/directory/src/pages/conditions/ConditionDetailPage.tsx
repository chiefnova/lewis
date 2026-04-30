import type { ConditionState, PublicConditionDetail } from "@lewis/shared/api/public";
import { useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Link, useParams } from "react-router-dom";

import { ConditionEmailSignup } from "../../components/ConditionEmailSignup";
import { ConditionStateBadge } from "../../components/ConditionStateBadge";
import { TopicalTube, Vial } from "../../components/Products";
import {
  getConditionContent,
  type ConditionContent,
  type StandardOfCareContent,
} from "../../data/conditions-content";
import { buildMedicalConditionJsonLd } from "../../seo/medical-condition-json-ld";
import { siteUrl, useSeo } from "../../seo/useSeo";
import { useConditionDetail } from "./use-condition-detail";
import { useScrollSpy } from "./use-scroll-spy";

// Condition detail page — C1 architecture per design-shotgun Round 2.
// Layout: TopNav → Breadcrumb → Badge → H1 → Italic Summary → ICD chips →
// HERO CARD (programs / Lewis-is-tracking / not-offered, all share the same
// 110px-asset-well + body grid) → TOC anchor-nav layout (sticky left,
// content right) → disclaimer.
//
// Three states share the same shell; the hero card content + TOC entries
// vary per state. Implementation pattern: <ConditionStatePanel> dispatches
// to <LiveHeroCard> / <ComingSoonHeroCard> / <NotOfferedHeroCard>, then
// <DetailToc> + <DetailContent> handle the editorial sections.

export function ConditionDetailPage() {
  const intl = useIntl();
  const { slug = "" } = useParams<{ slug: string }>();
  const { condition, loading, error, notFound, retry } = useConditionDetail(slug);
  const content = condition ? getConditionContent(condition.slug) : undefined;

  const indexCanonical = siteUrl("/conditions");
  const detailCanonical = condition ? siteUrl(`/conditions/${condition.slug}`) : indexCanonical;

  useSeo({
    title: condition
      ? `${condition.name} — Lewis Health`
      : intl.formatMessage({ id: "directory.conditions.not-found.title" }) + " — Lewis Health",
    description: condition
      ? `Experimental treatments for ${condition.name} in Montana.`
      : intl.formatMessage({ id: "directory.conditions.not-found.body" }),
    canonical: detailCanonical,
    noIndex: notFound || !!error,
    jsonLd: condition ? buildMedicalConditionJsonLd(condition, content) : undefined,
  });

  if (loading) return <ConditionDetailSkeleton />;
  if (notFound) return <ConditionNotFound />;
  if (error || !condition) return <ConditionDetailError onRetry={retry} />;

  return (
    <article className="fade-up condition-detail">
      <div className="container">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/conditions">
            ← <FormattedMessage id="directory.conditions.detail.breadcrumb" />
          </Link>
        </nav>

        <div className="badge-row">
          <ConditionStateBadge state={condition.state} />
        </div>

        <h1 className="page-h1">
          <FormattedMessage
            id="directory.conditions.detail.h1"
            values={{
              name: <em>{condition.name}</em>,
            }}
          />
        </h1>

        {condition.summary ? <p className="page-summary">{condition.summary}</p> : null}

        {condition.icd10Codes.length > 0 ? (
          <div className="icd-row">
            {condition.icd10Codes.map((code) => (
              <span key={code} className="icd-chip">
                ICD-10 {code}
              </span>
            ))}
          </div>
        ) : null}

        <ConditionStatePanel condition={condition} />
        <DetailToc condition={condition} content={content} />
        <p className="disclaimer">
          <FormattedMessage id="directory.conditions.detail.disclaimer" />
        </p>
      </div>
    </article>
  );
}

// ----- Hero panel dispatch ------------------------------------------------

function ConditionStatePanel({ condition }: { condition: PublicConditionDetail }) {
  if (condition.state === "live") {
    return <LiveHeroPanel condition={condition} />;
  }
  if (condition.state === "coming_soon") {
    return <ComingSoonHeroPanel condition={condition} />;
  }
  return <NotOfferedHeroPanel condition={condition} />;
}

function LiveHeroPanel({ condition }: { condition: PublicConditionDetail }) {
  const intl = useIntl();
  if (condition.linkedPrograms.length === 0) {
    // Edge case: condition is live in DB but has zero directory_published
    // programs. Treat as coming-soon visually (this shouldn't happen if the
    // publish flags are consistent, but defense-in-depth).
    return <ComingSoonHeroPanel condition={condition} />;
  }
  const programCount = condition.linkedPrograms.length;
  const meta = intl.formatMessage(
    { id: "directory.conditions.detail.live.hero.meta" },
    { programs: programCount },
  );
  return (
    <>
      <div className="hero-head">
        <h2>
          <FormattedMessage id="directory.conditions.detail.live.hero.heading" />
        </h2>
        <span className="hero-meta">{meta}</span>
      </div>
      {condition.linkedPrograms.map((program) => {
        // Render only fields the API actually returned. Drug, manufacturer,
        // form, and phase are all nullable on the schema; missing values
        // simply drop out of the meta line rather than rendering placeholders.
        const metaParts = [
          program.drug && program.drug !== program.name ? program.drug : null,
          program.manufacturer,
          program.form,
          program.phase,
        ].filter((v): v is string => Boolean(v));
        return (
          <article key={program.slug} className="hero-card" style={{ marginBottom: 12 }}>
            <Link to={`/programs/${program.slug}`} className="hero-card-link">
              <div className="hero-asset" aria-hidden="true">
                <ProgramAsset programSlug={program.slug} />
              </div>
              <div className="hero-card-body">
                <h3>{program.name}</h3>
                {metaParts.length > 0 ? (
                  <span className="program-meta">{metaParts.join(" · ")}</span>
                ) : null}
              </div>
              <span className="hero-card-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </article>
        );
      })}
    </>
  );
}

function ComingSoonHeroPanel({ condition }: { condition: PublicConditionDetail }) {
  return (
    <>
      <div className="hero-head">
        <h2>
          <FormattedMessage id="directory.conditions.detail.coming-soon.hero.heading" />
        </h2>
        <span className="hero-meta">
          <FormattedMessage id="directory.conditions.detail.coming-soon.hero.meta" />
        </span>
      </div>
      <article className="hero-card">
        <div className="hero-card-static">
          <div className="hero-asset is-quiet" aria-hidden="true">
            <Vial size={64} />
          </div>
          <div className="hero-card-body">
            <h3>
              <FormattedMessage id="directory.conditions.detail.coming-soon.hero.title" />
            </h3>
            <p>
              <FormattedMessage id="directory.conditions.detail.coming-soon.hero.body" />
            </p>
            <ConditionEmailSignup state="coming_soon" conditionName={condition.name} />
          </div>
        </div>
      </article>
    </>
  );
}

function NotOfferedHeroPanel({ condition }: { condition: PublicConditionDetail }) {
  return (
    <>
      <div className="hero-head">
        <h2>
          <FormattedMessage id="directory.conditions.detail.not-offered.hero.heading" />
        </h2>
        <span className="hero-meta">
          <FormattedMessage id="directory.conditions.detail.not-offered.hero.meta" />
        </span>
      </div>
      <article className="hero-card">
        <div className="hero-card-static">
          <div className="hero-asset is-quiet" aria-hidden="true">
            <Vial size={64} />
          </div>
          <div className="hero-card-body">
            <h3>
              <FormattedMessage
                id="directory.conditions.detail.not-offered.hero.title"
                values={{ condition: condition.name }}
              />
            </h3>
            <p>
              <FormattedMessage id="directory.conditions.detail.not-offered.hero.body" />
            </p>
          </div>
        </div>
      </article>
    </>
  );
}

function ProgramAsset({ programSlug }: { programSlug: string }) {
  // Slice 2 placeholder: every live program in the catalog renders the
  // existing TopicalTube SVG. Future iteration (proper product photography)
  // will key off `programSlug` to load `program.directoryAssetUrl` from the
  // catalog. For now: WST-057 is the only live program, and its asset is
  // already topical-tube-shaped.
  if (programSlug === "wst-057") return <TopicalTube size={64} />;
  return <TopicalTube size={64} />;
}

// ----- TOC + content ------------------------------------------------------

interface TocEntry {
  id: string;
  labelMessageId: string;
}

function buildTocEntriesFor(state: ConditionState, hasAdvocacy: boolean): ReadonlyArray<TocEntry> {
  const entries: TocEntry[] = [
    { id: "about", labelMessageId: "directory.conditions.detail.about.heading" },
  ];

  if (state === "live" || state === "coming_soon") {
    entries.push({
      id: "standard-of-care",
      labelMessageId: "directory.conditions.detail.standard-of-care.heading",
    });
  }

  if (state === "coming_soon" || state === "not_offered") {
    entries.push({
      id: "while-you-wait",
      labelMessageId: "directory.conditions.detail.while-you-wait.heading",
    });
  }

  entries.push({
    id: "why-experimental",
    labelMessageId: "directory.conditions.detail.why-experimental.heading",
  });

  if (hasAdvocacy) {
    entries.push({
      id: "advocacy",
      labelMessageId: "directory.conditions.detail.advocacy.heading",
    });
  }

  return entries;
}

function DetailToc({
  condition,
  content,
}: {
  condition: PublicConditionDetail;
  content: ConditionContent | undefined;
}) {
  // Stabilize the entries array so useScrollSpy's effect doesn't re-fire
  // on every render and reset the active id back to "about". The TOC
  // shape is a pure function of (state, has-advocacy) — both primitives —
  // so memoize on those. Using the by-reference condition/content objects
  // as deps would invalidate every render.
  const hasAdvocacy = (content?.sidebar?.advocacyOrgs?.length ?? 0) > 0;
  const entries = useMemo(
    () => buildTocEntriesFor(condition.state, hasAdvocacy),
    [condition.state, hasAdvocacy],
  );
  const ids = useMemo(() => entries.map((e) => e.id), [entries]);
  const activeId = useScrollSpy(ids);

  return (
    <div className="toc-layout">
      <aside className="toc" aria-label="On this page">
        <div className="toc-title">
          <FormattedMessage id="directory.conditions.detail.toc.title" />
        </div>
        <ol>
          {entries.map((entry) => (
            <li key={entry.id} className={activeId === entry.id ? "is-active" : undefined}>
              <a href={`#${entry.id}`}>
                <FormattedMessage id={entry.labelMessageId} />
              </a>
            </li>
          ))}
        </ol>
      </aside>

      <main className="toc-main">
        {content?.explainer ? <AboutSection explainer={content.explainer} /> : null}

        {(condition.state === "live" || condition.state === "coming_soon") &&
        content?.standardOfCare ? (
          <StandardOfCareSection condition={condition} standardOfCare={content.standardOfCare} />
        ) : null}

        {condition.state === "coming_soon" ? <WhileYouWaitSection condition={condition} /> : null}

        {condition.state === "not_offered" ? (
          <NotOfferedPathsSection condition={condition} />
        ) : null}

        <WhyExperimentalSection />

        {content?.sidebar?.advocacyOrgs && content.sidebar.advocacyOrgs.length > 0 ? (
          <AdvocacySection advocacyOrgs={content.sidebar.advocacyOrgs} />
        ) : null}
      </main>
    </div>
  );
}

function AboutSection({ explainer }: { explainer: NonNullable<ConditionContent["explainer"]> }) {
  return (
    <section className="section prose" id="about">
      <div className="section-eyebrow">
        <FormattedMessage id="directory.conditions.detail.about.eyebrow" />
      </div>
      <h2 className="section-h2">
        <FormattedMessage id="directory.conditions.detail.about.heading" />
      </h2>
      {explainer.paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
      <div className="source">
        Source:{" "}
        <a href={explainer.sourceUrl} target="_blank" rel="noreferrer">
          {explainer.sourceLabel}
        </a>
      </div>
    </section>
  );
}

function StandardOfCareSection({
  condition,
  standardOfCare,
}: {
  condition: PublicConditionDetail;
  standardOfCare: StandardOfCareContent;
}) {
  return (
    <section className="section prose" id="standard-of-care">
      <div className="section-eyebrow">
        <FormattedMessage id="directory.conditions.detail.standard-of-care.eyebrow" />
      </div>
      <h2 className="section-h2">
        <FormattedMessage id="directory.conditions.detail.standard-of-care.heading" />
      </h2>
      <p className="muted">{standardOfCare.intro}</p>
      <ul className="soc-list">
        {standardOfCare.treatments.map((treatment) => (
          <li key={treatment}>{treatment}</li>
        ))}
      </ul>
      <div className="soc-closing">{standardOfCare.closing}</div>
      <div className="source">
        Source:{" "}
        <a href={standardOfCare.sourceUrl} target="_blank" rel="noreferrer">
          {standardOfCare.sourceLabel}
        </a>
      </div>
      <span className="visually-hidden">{condition.name}</span>
    </section>
  );
}

function WhileYouWaitSection({ condition }: { condition: PublicConditionDetail }) {
  const ctgUrl = `https://clinicaltrials.gov/search?cond=${encodeURIComponent(condition.name)}`;
  return (
    <section className="section" id="while-you-wait">
      <div className="while-you-wait">
        <h3>
          <FormattedMessage id="directory.conditions.detail.while-you-wait.heading" />
        </h3>
        <p>
          <FormattedMessage
            id="directory.conditions.detail.while-you-wait.body"
            values={{ condition: condition.name }}
          />
        </p>
        <a className="cta" href={ctgUrl} target="_blank" rel="noreferrer">
          <FormattedMessage id="directory.conditions.detail.while-you-wait.cta" />
        </a>
      </div>
    </section>
  );
}

function NotOfferedPathsSection({ condition }: { condition: PublicConditionDetail }) {
  const ctgUrl = `https://clinicaltrials.gov/search?cond=${encodeURIComponent(condition.name)}`;
  return (
    <section className="section" id="while-you-wait">
      <div className="not-offered-paths">
        <h3>
          <FormattedMessage id="directory.conditions.detail.not-offered.three-paths.heading" />
        </h3>
        <div className="not-offered-path-grid">
          <article className="path-card">
            <h4>
              <FormattedMessage id="directory.conditions.detail.not-offered.three-paths.ctgov.title" />
            </h4>
            <p>
              <FormattedMessage
                id="directory.conditions.detail.not-offered.three-paths.ctgov.body"
                values={{ condition: condition.name }}
              />
            </p>
            <a className="cta" href={ctgUrl} target="_blank" rel="noreferrer">
              <FormattedMessage id="directory.conditions.detail.not-offered.three-paths.ctgov.cta" />
            </a>
          </article>

          <article className="path-card">
            <h4>
              <FormattedMessage id="directory.conditions.detail.not-offered.three-paths.physician.title" />
            </h4>
            <p>
              <FormattedMessage id="directory.conditions.detail.not-offered.three-paths.physician.body" />
            </p>
          </article>

          <article className="path-card">
            <h4>
              <FormattedMessage
                id="directory.conditions.detail.not-offered.three-paths.notify.title"
                values={{ condition: condition.name }}
              />
            </h4>
            <ConditionEmailSignup state="not_offered" conditionName={condition.name} />
          </article>
        </div>
      </div>
    </section>
  );
}

function WhyExperimentalSection() {
  return (
    <section className="section" id="why-experimental">
      <aside className="callout">
        <h3>
          <FormattedMessage id="directory.conditions.detail.why-experimental.heading" />
        </h3>
        <p>
          <FormattedMessage id="directory.conditions.detail.why-experimental.body" />
        </p>
      </aside>
    </section>
  );
}

function AdvocacySection({
  advocacyOrgs,
}: {
  advocacyOrgs: NonNullable<NonNullable<ConditionContent["sidebar"]>["advocacyOrgs"]>;
}) {
  return (
    <section className="section" id="advocacy">
      <div className="section-eyebrow">
        <FormattedMessage id="directory.conditions.detail.advocacy.eyebrow" />
      </div>
      <h2 className="section-h2">
        <FormattedMessage id="directory.conditions.detail.advocacy.heading" />
      </h2>
      <ul className="advocacy-list">
        {advocacyOrgs.map((org) => (
          <li key={org.url}>
            <a href={org.url} target="_blank" rel="noreferrer">
              {org.name}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ----- Loading + error + not-found states (Round 8 will refine) ----------

function ConditionDetailSkeleton() {
  return (
    <div className="condition-detail" aria-live="polite" aria-busy="true">
      <div className="container-narrow" style={{ padding: "48px 0" }}>
        <div className="lewis-skeleton" style={{ height: 28, width: 200, marginBottom: 16 }} />
        <div className="lewis-skeleton" style={{ height: 52, width: "85%", marginBottom: 16 }} />
        <div className="lewis-skeleton" style={{ height: 22, width: "60%", marginBottom: 28 }} />
        <div
          className="lewis-skeleton is-card"
          style={{ height: 110, width: "100%", marginBottom: 18 }}
        />
        <div className="lewis-skeleton" style={{ height: 18, width: "70%", marginBottom: 10 }} />
        <div className="lewis-skeleton" style={{ height: 18, width: "55%", marginBottom: 10 }} />
        <div className="lewis-skeleton" style={{ height: 18, width: "65%" }} />
      </div>
    </div>
  );
}

function ConditionDetailError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="condition-detail">
      <div className="container-narrow">
        <div className="lewis-error-block" role="alert">
          <h2>
            <FormattedMessage id="directory.conditions.detail.error.heading" />
          </h2>
          <p>
            <FormattedMessage id="directory.conditions.detail.error.body" />
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="pill pill-outline pill-sm"
            style={{ cursor: "pointer" }}
          >
            <FormattedMessage id="directory.conditions.detail.error.retry" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ConditionNotFound() {
  return (
    <div className="condition-detail fade-up" style={{ padding: "80px 0 120px" }}>
      <div className="container-narrow">
        <h1
          className="serif"
          style={{
            fontSize: 42,
            lineHeight: 1.05,
            marginBottom: 18,
            fontVariationSettings: '"opsz" 56',
          }}
        >
          <FormattedMessage id="directory.conditions.not-found.title" />
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 16, lineHeight: 1.65, marginBottom: 28 }}>
          <FormattedMessage id="directory.conditions.not-found.body" />
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link to="/conditions" className="pill pill-outline">
            <FormattedMessage id="directory.conditions.detail.breadcrumb" />
          </Link>
          <Link to="/search" className="pill pill-primary">
            <FormattedMessage id="directory.conditions.not-found.search-cta" />
          </Link>
        </div>
      </div>
    </div>
  );
}
