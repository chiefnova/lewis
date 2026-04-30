import { useEffect, useState, type ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Link, useSearchParams } from "react-router-dom";

import type { PublicSearchResponse } from "@lewis/shared/api/search";
import { ApiNetworkError, ApiSchemaError, publicApi } from "../api/client";
import { RECENT_ON_LEWIS } from "../search/recent-on-lewis";
import { useSeo, siteUrl } from "../seo/useSeo";

/**
 * Surface 2 of the public search per directoryprd.md § 13.1. The user
 * lands here either by submitting from the homepage hero, or by hitting
 * Enter without selecting a suggestion in the overlay (Surface 1).
 *
 * SEO:
 *   - Canonical strips the query string so Google never sees a long tail
 *     of `?q=…` variants. The empty-state /search is indexable; query
 *     results emit `<meta name="robots" content="noindex, follow">` via
 *     useSeo({ noIndex: !!q }).
 *   - Title is dynamic. Description summarizes the section purpose.
 *
 * Three states per § 13.2:
 *   A — query with results: sectioned in CONDITIONS → TREATMENTS → ETCs
 *       (server-enforced; this component renders the array as shipped).
 *   B — query with no results: graceful "try one of these" + curated list.
 *   C — empty query: "Search Lewis" framing + "Recent on Lewis" list.
 */

type SearchSections = PublicSearchResponse["sections"];
type ConditionState = PublicSearchResponse["sections"]["conditions"][number]["state"];

const CONDITION_STATE_MESSAGE_ID: Record<ConditionState, string> = {
  live: "directory.search.results.row.live",
  coming_soon: "directory.search.results.row.coming-soon",
  not_offered: "directory.search.results.row.not-offered",
};

export function SearchPage() {
  const [params] = useSearchParams();
  const q = (params.get("q") ?? "").trim();
  const intl = useIntl();

  const [sections, setSections] = useState<SearchSections | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSeo({
    title: q
      ? intl.formatMessage({ id: "directory.search.results.title" }, { query: q })
      : intl.formatMessage({ id: "directory.search.results.empty-title" }),
    description: q
      ? intl.formatMessage({ id: "directory.search.results.title" }, { query: q })
      : intl.formatMessage({ id: "directory.search.results.empty-body" }),
    canonical: siteUrl("/search"),
    noIndex: q.length > 0,
  });

  useEffect(() => {
    if (q.length === 0) {
      setSections(null);
      setError(null);
      setLoading(false);
      return;
    }
    let active = true;
    const controller = new AbortController();
    setSections(null);
    setLoading(true);
    setError(null);
    publicApi
      .searchPublic(q, { signal: controller.signal })
      .then((response) => {
        if (!active) return;
        setSections(response.sections);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active || (err instanceof DOMException && err.name === "AbortError")) return;
        if (err instanceof ApiNetworkError || err instanceof ApiSchemaError) {
          setError(intl.formatMessage({ id: "directory.search.error" }));
        } else {
          setError(intl.formatMessage({ id: "directory.search.error" }));
        }
        setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [q, intl]);

  return (
    <div className="fade-up" style={{ padding: "60px 0 120px" }}>
      <div className="container-narrow">
        <h1
          className="serif"
          style={{
            fontSize: "clamp(2rem, 4.4vw, 3rem)",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            marginBottom: 12,
          }}
        >
          {q ? (
            <FormattedMessage id="directory.search.results.title" values={{ query: q }} />
          ) : (
            <FormattedMessage id="directory.search.results.empty-title" />
          )}
        </h1>

        {!q && (
          <p style={{ color: "var(--ink-soft)", fontSize: 16, marginBottom: 32 }}>
            <FormattedMessage id="directory.search.results.empty-body" />
          </p>
        )}

        {error && <p style={{ color: "var(--accent)", fontSize: 14, marginTop: 24 }}>{error}</p>}

        {loading && !sections && (
          <p style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 24 }}>…</p>
        )}

        {q && sections && <SearchResults q={q} sections={sections} />}

        {!q && <RecentList />}
      </div>
    </div>
  );
}

function SearchResults({ q, sections }: { q: string; sections: SearchSections }) {
  const intl = useIntl();
  const conditionMeta = (state: ConditionState): string =>
    intl.formatMessage({ id: CONDITION_STATE_MESSAGE_ID[state] });

  const totalCount = sections.conditions.length + sections.treatments.length + sections.etcs.length;

  if (totalCount === 0) {
    return (
      <div style={{ marginTop: 32 }}>
        <p style={{ color: "var(--ink-soft)", fontSize: 16, marginBottom: 32 }}>
          <FormattedMessage id="directory.search.no-results.heading" values={{ query: q }} />
        </p>
        <RecentList headingId="directory.search.no-results.fallback-heading" />
      </div>
    );
  }

  return (
    <div style={{ marginTop: 32 }}>
      <ResultsSection
        headingId="directory.search.section.conditions"
        count={sections.conditions.length}
      >
        {sections.conditions.map((hit) => (
          <ResultRow
            key={hit.slug}
            label={hit.name}
            href={hit.href}
            meta={conditionMeta(hit.state)}
          />
        ))}
        {sections.conditions.length === 0 && <EmptySection />}
      </ResultsSection>

      <ResultsSection
        headingId="directory.search.section.treatments"
        count={sections.treatments.length}
      >
        {sections.treatments.map((hit) => (
          <ResultRow key={hit.slug} label={hit.name} href={hit.href} meta={hit.drug ?? null} />
        ))}
        {sections.treatments.length === 0 && <EmptySection />}
      </ResultsSection>

      <ResultsSection headingId="directory.search.section.etcs" count={sections.etcs.length}>
        {sections.etcs.map((hit) => (
          <ResultRow key={hit.slug} label={hit.name} href={hit.href} meta={hit.city} />
        ))}
        {sections.etcs.length === 0 && <EmptySection />}
      </ResultsSection>
    </div>
  );
}

function ResultsSection({
  headingId,
  count,
  children,
}: {
  headingId: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section style={{ padding: 0, marginBottom: 32 }}>
      <h2
        className="serif"
        style={{
          fontSize: 13,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--ink-soft)",
          marginBottom: 16,
          fontWeight: 500,
        }}
      >
        <FormattedMessage id={headingId} /> · {count}
      </h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>{children}</ul>
    </section>
  );
}

function ResultRow({ label, href, meta }: { label: string; href: string; meta: string | null }) {
  return (
    <li
      style={{
        borderBottom: "1px solid rgba(27,24,20,0.08)",
        padding: "14px 0",
      }}
    >
      <Link
        to={href}
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          textDecoration: "none",
          color: "var(--ink)",
        }}
      >
        <span className="serif" style={{ fontSize: 18, letterSpacing: "-0.01em" }}>
          {label}
        </span>
        {meta ? <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{meta}</span> : null}
      </Link>
    </li>
  );
}

function EmptySection() {
  return <li style={{ color: "var(--ink-soft)", fontSize: 14, padding: "8px 0" }}>—</li>;
}

function RecentList({ headingId = "directory.search.empty.heading" }: { headingId?: string }) {
  return (
    <div>
      <h2
        className="serif"
        style={{
          fontSize: 13,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--ink-soft)",
          marginBottom: 16,
          fontWeight: 500,
        }}
      >
        <FormattedMessage id={headingId} />
      </h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {RECENT_ON_LEWIS.map((entry) => (
          <li
            key={entry.href}
            style={{
              borderBottom: "1px solid rgba(27,24,20,0.08)",
              padding: "14px 0",
            }}
          >
            <Link
              to={entry.href}
              className="serif"
              style={{
                fontSize: 18,
                letterSpacing: "-0.01em",
                textDecoration: "none",
                color: "var(--ink)",
              }}
            >
              <FormattedMessage id={entry.labelId} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
