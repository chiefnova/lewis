import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FormattedMessage } from "react-intl";

import type { PublicConditionDetail, PublicProgramSummary } from "@lewis/shared/api/public";
import { ApiNetworkError, ApiSchemaError, publicApi } from "../api/client";
import { TopicalTube, Vial } from "./Products";
import { FEATURED_CONDITION_SLUGS } from "../data/featured-conditions";

/**
 * Slice 4 § 11.4b — homepage FeaturedTreatments block (DEMOTED secondary).
 *
 * Editorial inline rows per locked Variant B:
 *   [title + small product-art glyph]  [italic indications · technical meta]  [italic chev]
 *
 * The italic-serif "For diabetic, chemotherapy-induced, ..." line is the
 * load-bearing scan target — a SERP-arriving patient finds their condition
 * immediately. The technical line (form · phase · ETC) sits beneath it as
 * quiet reference.
 *
 * Indications are derived from each program's linked conditions (the
 * conditions endpoint carries which programs link to it). We aggregate
 * by program-slug across the featured PN conditions to build the "For …"
 * sentence. WST-057 covers all 4 PN conditions per the 0018 seed.
 */

interface FeaturedTreatmentsProps {
  /** Optional override of programs to feature; defaults to API listPrograms. */
  programs?: ReadonlyArray<PublicProgramSummary>;
}

type ProgramIndications = Map<string, string[]>;

function joinWithAnd(items: ReadonlyArray<string>): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  const head = items.slice(0, -1).join(", ");
  return `${head}, and ${items[items.length - 1] ?? ""}`;
}

function deriveIndicationPhrase(rawNames: ReadonlyArray<string>): string {
  // The featured PN conditions all end in "peripheral neuropathy". Strip the
  // common suffix so the joined phrase reads as "For diabetic, chemotherapy-
  // induced, HIV-induced, and idiopathic peripheral neuropathy." instead of
  // a four-fold repetition.
  const SUFFIX = "peripheral neuropathy";
  const lower = rawNames.map((n) => n.toLowerCase().trim());
  const allShareSuffix = lower.length >= 2 && lower.every((n) => n.endsWith(SUFFIX));
  if (allShareSuffix) {
    const stems = lower.map((n) =>
      n
        .slice(0, -SUFFIX.length)
        .trim()
        .replace(/[, ]+$/, ""),
    );
    const joined = joinWithAnd(stems.filter((s) => s.length > 0));
    return joined.length > 0 ? `${joined} ${SUFFIX}` : SUFFIX;
  }
  return joinWithAnd(rawNames);
}

function formatIndicationSentence(names: ReadonlyArray<string>): string {
  const phrase = deriveIndicationPhrase(names);
  if (phrase.length === 0) return "";
  // Sentence-case the leading letter; preserve internal capitalization
  // (e.g., HIV-induced).
  const lead = phrase.charAt(0).toUpperCase() + phrase.slice(1);
  return `For ${lead.charAt(0).toLowerCase() + lead.slice(1)}.`;
}

export function FeaturedTreatments({ programs }: FeaturedTreatmentsProps) {
  const [list, setList] = useState<ReadonlyArray<PublicProgramSummary> | undefined>(programs);
  const [indications, setIndications] = useState<ProgramIndications>(new Map());
  const [loading, setLoading] = useState<boolean>(programs === undefined);

  useEffect(() => {
    if (programs !== undefined) {
      setList(programs);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    publicApi
      .listPrograms({ signal: ctrl.signal })
      .then((res) => {
        if (ctrl.signal.aborted) return;
        setList(res.programs);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        if (err instanceof ApiNetworkError || err instanceof ApiSchemaError) {
          // Soft-fail: render an empty state. The home-page rail-style header
          // still renders so the section's H2 is consistent.
          setList([]);
          setLoading(false);
          return;
        }
        if (err instanceof Error && err.name === "AbortError") return;
        setList([]);
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [programs]);

  // Aggregate indications by program slug from the featured conditions.
  // Avoids /programs/:slug detail round-trips; conditions catalog already
  // carries linkedPrograms with name + slug.
  useEffect(() => {
    const ctrl = new AbortController();
    Promise.all(
      FEATURED_CONDITION_SLUGS.map((slug) =>
        publicApi
          .getCondition(slug, { signal: ctrl.signal })
          .then((detail): PublicConditionDetail | null => detail)
          .catch(() => null),
      ),
    ).then((conds) => {
      if (ctrl.signal.aborted) return;
      const next: ProgramIndications = new Map();
      for (const cond of conds) {
        if (!cond) continue;
        for (const linked of cond.linkedPrograms) {
          const arr = next.get(linked.slug) ?? [];
          if (!arr.includes(cond.name)) arr.push(cond.name);
          next.set(linked.slug, arr);
        }
      }
      setIndications(next);
    });
    return () => ctrl.abort();
  }, []);

  return (
    <section className="featured-treatments">
      <div className="featured-treatments__container">
        <div className="featured-treatments__label">
          <FormattedMessage
            id="directory.homepage.featured_treatments.label"
            defaultMessage="III · Treatments"
          />
        </div>
        <h3 className="featured-treatments__h3">
          <FormattedMessage
            id="directory.homepage.featured_treatments.h2"
            defaultMessage="Treatments available now in {italic}."
            values={{ italic: <i>Montana</i> }}
          />
        </h3>

        <div className="featured-treatments__list" role="list">
          {loading
            ? Array.from({ length: 1 }).map((_, i) => (
                <div
                  key={`ft-skel-${i}`}
                  className="featured-treatments__row featured-treatments__row--skeleton"
                  aria-hidden="true"
                >
                  <div className="featured-treatments__head">
                    <div className="featured-treatments__name shimmer" />
                  </div>
                  <div className="featured-treatments__meta">
                    <div className="featured-treatments__indications shimmer" />
                    <div className="featured-treatments__technical shimmer" />
                  </div>
                  <div className="featured-treatments__chev shimmer" />
                </div>
              ))
            : null}

          {!loading && list && list.length > 0
            ? list.map((p) => {
                const linkedNames = indications.get(p.slug) ?? [];
                const indicationLine = formatIndicationSentence(linkedNames);
                const technicalParts = [p.form, p.phase].filter(
                  (v): v is NonNullable<typeof v> => v !== null,
                );
                const technicalLine =
                  technicalParts.length > 0
                    ? `${technicalParts.join(" · ")}${
                        p.etcCount > 0
                          ? ` · Available at ${p.etcCount} ETC${p.etcCount === 1 ? "" : "s"}`
                          : ""
                      }`
                    : "";
                return (
                  <Link
                    key={p.slug}
                    to={`/programs/${p.slug}`}
                    className="featured-treatments__row"
                    role="listitem"
                  >
                    <div className="featured-treatments__head">
                      <div className="featured-treatments__name">{p.name}</div>
                      <div className="featured-treatments__art" aria-hidden="true">
                        <TopicalTube size={36} />
                      </div>
                    </div>
                    <div className="featured-treatments__meta">
                      {indicationLine && (
                        <div className="featured-treatments__indications">{indicationLine}</div>
                      )}
                      {technicalLine && (
                        <div className="featured-treatments__technical">{technicalLine}</div>
                      )}
                    </div>
                    <div className="featured-treatments__chev">
                      <FormattedMessage
                        id="directory.homepage.featured_treatments.view"
                        defaultMessage="View →"
                      />
                    </div>
                  </Link>
                );
              })
            : null}

          {!loading && list && list.length > 0 ? (
            <div
              className="featured-treatments__row featured-treatments__row--muted"
              role="listitem"
            >
              <div className="featured-treatments__head">
                <div className="featured-treatments__name">
                  <FormattedMessage
                    id="directory.homepage.featured_treatments.coming_soon_name"
                    defaultMessage="More treatments — coming soon"
                  />
                </div>
                <div className="featured-treatments__art" aria-hidden="true">
                  <Vial size={36} />
                </div>
              </div>
              <div className="featured-treatments__meta">
                <div className="featured-treatments__indications">
                  <FormattedMessage
                    id="directory.homepage.featured_treatments.coming_soon_indication"
                    defaultMessage="For new conditions as Montana sponsors onboard."
                  />
                </div>
                <div className="featured-treatments__technical">
                  <FormattedMessage
                    id="directory.homepage.featured_treatments.coming_soon_technical"
                    defaultMessage="Phase 2 sponsor onboarding next."
                  />
                </div>
              </div>
              <div className="featured-treatments__chev" aria-hidden="true" />
            </div>
          ) : null}
        </div>

        <div className="featured-treatments__cta">
          <Link to="/browse" className="featured-treatments__cta-link">
            <FormattedMessage
              id="directory.homepage.featured_treatments.cta"
              defaultMessage="Browse all treatments →"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
