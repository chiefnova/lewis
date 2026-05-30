import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FormattedMessage } from "react-intl";

import type { PublicConditionDetail, PublicProgramSummary } from "@lewis/shared/api/public";
import { ApiNetworkError, ApiSchemaError, publicApi } from "../api/client";
import { FEATURED_CONDITION_SLUGS } from "../data/featured-conditions";
import { TopicalTube, Vial } from "./Products";

/**
 * Slice 4 § 11.4b — homepage FeaturedTreatments block.
 *
 * Visual parity with the FeaturedConditions block above: same numbered
 * editorial table-of-contents pattern (i. ii. iii.), same H2 weight, same
 * column grid (numeral · name · sub · chev), same font sizes. The
 * "demoted secondary" framing from the original slice 4 plan is dropped
 * — the user override is that conditions and treatments read as siblings,
 * not parent + footnote.
 *
 * Per-row layout: [i.]  [WST-057]  [italic indications line + small
 * technical line stacked]  [View →]. The 5th-position muted "More
 * treatments — coming soon" row mirrors the conditions block's PTSD
 * coming-soon row.
 *
 * Data:
 *   - Programs from publicApi.listPrograms()
 *   - Indications aggregated by program slug from the featured conditions'
 *     linkedPrograms (avoids extra /programs/:slug round-trips)
 */

const ROMAN = ["i.", "ii.", "iii.", "iv.", "v.", "vi.", "vii."];

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
  // common suffix so the joined phrase reads as "Diabetic, chemotherapy-
  // induced, HIV-induced, and idiopathic peripheral neuropathy" instead of
  // a four-fold repetition. Preserve case from the API so acronyms like
  // HIV and (future) ALS render correctly.
  const SUFFIX = "peripheral neuropathy";
  const cleaned = rawNames.map((n) => n.trim());
  const allShareSuffix =
    cleaned.length >= 2 && cleaned.every((n) => n.toLowerCase().endsWith(SUFFIX));
  if (allShareSuffix) {
    const stems = cleaned.map((n) =>
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
  // The first stem comes capitalized from the DB ("Diabetic", "Chemotherapy-
  // induced"). After "For " we want lowercase for proper sentence flow
  // ("For diabetic, ..."), but acronym stems like "HIV-induced" or "ALS"
  // (future conditions) must stay uppercase. Lowercase ONLY when the first
  // word is a regular Capitalized word (single uppercase letter followed
  // by lowercase letters), never when the lead is an all-caps acronym.
  const leadWordMatch = phrase.match(/^(\S+)/);
  if (leadWordMatch) {
    const leadWord = leadWordMatch[1] ?? "";
    const isCapitalizedWord = /^[A-Z][a-z]/.test(leadWord);
    if (isCapitalizedWord) {
      return `For ${phrase.charAt(0).toLowerCase()}${phrase.slice(1)}.`;
    }
  }
  return `For ${phrase}.`;
}

function buildTechnicalLine(p: PublicProgramSummary): string {
  const technicalParts = [p.form, p.phase].filter((v): v is NonNullable<typeof v> => v !== null);
  if (technicalParts.length === 0) return "";
  const etcSuffix =
    p.etcCount > 0 ? ` · Available at ${p.etcCount} ETC${p.etcCount === 1 ? "" : "s"}` : "";
  return `${technicalParts.join(" · ")}${etcSuffix}`;
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
          // Soft-fail: render an empty state. Section header still renders
          // so the H2 stays consistent with the rest of the page.
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
        <h2 className="featured-treatments__h2">
          <FormattedMessage
            id="directory.homepage.featured_treatments.h2"
            defaultMessage="Treatments available now in {italic}."
            values={{ italic: <i>Montana</i> }}
          />
        </h2>

        <div className="featured-treatments__toc" role="list">
          {loading
            ? Array.from({ length: 1 }).map((_, i) => (
                <div
                  key={`ft-skel-${i}`}
                  className="featured-treatments__row featured-treatments__row--skeleton"
                  role="listitem"
                  aria-hidden="true"
                >
                  <div className="featured-treatments__num">{ROMAN[i] ?? ""}</div>
                  <div className="featured-treatments__name shimmer" />
                  <div className="featured-treatments__sub">
                    <div className="featured-treatments__indications shimmer" />
                    <div className="featured-treatments__technical shimmer" />
                  </div>
                  <div className="featured-treatments__chev shimmer" />
                </div>
              ))
            : null}

          {!loading && list && list.length > 0
            ? list.map((p, i) => {
                const linkedNames = indications.get(p.slug) ?? [];
                const indicationLine = formatIndicationSentence(linkedNames);
                const technicalLine = buildTechnicalLine(p);
                return (
                  <Link
                    key={p.slug}
                    to={`/programs/${p.slug}`}
                    className="featured-treatments__row"
                    role="listitem"
                  >
                    <div className="featured-treatments__num">{ROMAN[i] ?? `${i + 1}.`}</div>
                    <div className="featured-treatments__name-cell">
                      <div className="featured-treatments__art" aria-hidden="true">
                        <TopicalTube size={40} />
                      </div>
                      <div className="featured-treatments__name">{p.name}</div>
                    </div>
                    <div className="featured-treatments__sub">
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
              <div className="featured-treatments__num">{ROMAN[list.length] ?? ""}</div>
              <div className="featured-treatments__name-cell">
                <div className="featured-treatments__art" aria-hidden="true">
                  <Vial size={40} />
                </div>
                <div className="featured-treatments__name">
                  <FormattedMessage
                    id="directory.homepage.featured_treatments.coming_soon_name"
                    defaultMessage="More treatments — coming soon"
                  />
                </div>
              </div>
              <div className="featured-treatments__sub">
                <div className="featured-treatments__indications">
                  <FormattedMessage
                    id="directory.homepage.featured_treatments.coming_soon_indication"
                    defaultMessage="For new conditions as Montana manufacturers onboard."
                  />
                </div>
                <div className="featured-treatments__technical">
                  <FormattedMessage
                    id="directory.homepage.featured_treatments.coming_soon_technical"
                    defaultMessage="Phase 2 manufacturer onboarding next."
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
