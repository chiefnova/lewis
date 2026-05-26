import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";

import type { PublicProgramFacets, PublicProgramSummary } from "@lewis/shared/api/public";
import type { ProgramListParams } from "../api/client";

// Mirrors the inline union on ProgramListParams.sort in api/client.ts.
type ProgramSort = "alphabetical" | "recent" | "etc_count";
import { useProgramsBrowse } from "./use-program-facets";
import { useSeo, siteUrl } from "../seo/useSeo";
import { formatEtcName } from "../data/etcs-content";
import { Capsule, IVBag, Pen, TopicalTube, Vial } from "../components/Products";
import { EmailSignupForm } from "../components/EmailSignupForm";

/**
 * Slice 4 § 11.4b — /browse faceted catalog. Round 6 locked Variant D:
 * a compact editorial facet rail + square photo-tile cards (trumprx-style
 * STRUCTURE, Lewis clinical content — never pricing or marketing seals).
 *
 * URL is the source of truth for filter state: ?condition=… (repeatable),
 * ?form=, ?phase=, ?etc=, ?manufacturer=, ?sort=. State lives in
 * useSearchParams so links are shareable + browser back/forward works.
 */

const SORT_OPTIONS: Array<{ value: ProgramSort; label: string }> = [
  { value: "alphabetical", label: "Alphabetical" },
  { value: "recent", label: "Recently added" },
  { value: "etc_count", label: "By number of ETCs" },
];

const PHASE_LABEL: Record<string, string> = {
  phase_1: "Phase 1",
  phase_2: "Phase 2",
  phase_3: "Phase 3",
  phase_4: "Phase 4",
};
const FORM_LABEL: Record<string, string> = {
  topical: "Topical",
  oral: "Oral",
  injection: "Injection",
  infusion: "Infusion",
};
function prettyPhase(phase: string | null): string | null {
  if (!phase) return null;
  return PHASE_LABEL[phase] ?? phase;
}
function prettyForm(form: string | null): string | null {
  if (!form) return null;
  return FORM_LABEL[form] ?? form;
}

/** Maps a program's form to the right Products glyph, with a generic Vial
 * fallback so a missing form never crashes the tile. */
function ProductArt({ form, size = 130 }: { form: string | null; size?: number }) {
  const Glyph =
    form === "topical"
      ? TopicalTube
      : form === "oral"
        ? Capsule
        : form === "injection"
          ? Pen
          : form === "infusion"
            ? IVBag
            : Vial;
  return <Glyph size={size} />;
}

export function BrowsePage() {
  const intl = useIntl();
  const [params, setParams] = useSearchParams();

  const listParams: ProgramListParams = useMemo(() => {
    const sortRaw = params.get("sort");
    const sort: ProgramSort =
      sortRaw === "recent" || sortRaw === "etc_count" ? sortRaw : "alphabetical";
    return {
      conditions: params.getAll("condition"),
      forms: params.getAll("form"),
      phases: params.getAll("phase"),
      etcs: params.getAll("etc"),
      manufacturers: params.getAll("manufacturer"),
      sort,
    };
  }, [params]);

  const { list, facets, loading, error, retry } = useProgramsBrowse(listParams);

  // ItemList JSON-LD narrows SERPs to the current filtered catalog when this
  // is the canonical entry point. Skip when no programs visible.
  const itemListJsonLd = useMemo(() => {
    const programs = list?.programs ?? [];
    if (programs.length === 0) return undefined;
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: programs.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: siteUrl(`/programs/${p.slug}`),
        name: p.name,
      })),
    };
  }, [list]);

  useSeo({
    title: intl.formatMessage({
      id: "directory.browse.title",
      defaultMessage: "Browse experimental treatments in Montana — Lewis Health",
    }),
    description: intl.formatMessage({
      id: "directory.browse.description",
      defaultMessage:
        "Every investigational treatment available through a licensed Montana Experimental Treatment Center.",
    }),
    canonical: siteUrl("/browse"),
    jsonLd: itemListJsonLd,
  });

  const toggleFacet = (key: string, value: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const current = next.getAll(key);
        next.delete(key);
        const updated = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        for (const v of updated) next.append(key, v);
        return next;
      },
      { replace: true },
    );
  };

  const setSort = (value: ProgramSort) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === "alphabetical") next.delete("sort");
        else next.set("sort", value);
        return next;
      },
      { replace: true },
    );
  };

  const clearFilters = () => {
    const sort = params.get("sort");
    const next = new URLSearchParams();
    if (sort) next.set("sort", sort);
    setParams(next, { replace: true });
  };

  const activeChips = buildActiveChips(listParams, facets);
  const hasActiveFilters = activeChips.length > 0;

  return (
    <div className="browse-wrap">
      <header className="masthead">
        <div className="masthead-eyebrow">
          <span>
            <FormattedMessage
              id="directory.browse.eyebrow"
              defaultMessage="Treatment directory · Montana"
            />
          </span>
          <span>
            <FormattedMessage id="directory.browse.dateline" defaultMessage="Updated daily" />
          </span>
        </div>
        <h1 className="serif">
          <FormattedMessage
            id="directory.browse.h1"
            defaultMessage="Browse experimental treatments in <em>Montana</em>."
            values={{ em: (chunks) => <em>{chunks}</em> }}
          />
        </h1>
        <p className="masthead-lede">
          <FormattedMessage
            id="directory.browse.intro"
            defaultMessage="Every investigational treatment available through a licensed Montana ETC. Filter by condition, form, or trial phase."
          />
        </p>
      </header>

      <div className="browse-cols">
        <aside className="browse-rail" aria-label="Filter treatments">
          {facets ? (
            <>
              <FacetGroup
                title={intl.formatMessage({
                  id: "directory.browse.f.condition",
                  defaultMessage: "By condition",
                })}
                items={facets.conditions.map((c) => ({
                  value: c.slug,
                  label: c.name,
                  count: c.count,
                }))}
                active={listParams.conditions ?? []}
                onToggle={(v) => toggleFacet("condition", v)}
              />
              <FacetGroup
                title={intl.formatMessage({
                  id: "directory.browse.f.etc",
                  defaultMessage: "By ETC",
                })}
                items={facets.etcs.map((e) => ({
                  value: e.slug,
                  label: formatEtcName(e.name),
                  count: e.count,
                }))}
                active={listParams.etcs ?? []}
                onToggle={(v) => toggleFacet("etc", v)}
                emptyMore={intl.formatMessage({
                  id: "directory.browse.f.etc.more",
                  defaultMessage: "More as centers license.",
                })}
              />
              <FacetGroup
                title={intl.formatMessage({
                  id: "directory.browse.f.form",
                  defaultMessage: "By form",
                })}
                items={facets.forms.map((f) => ({
                  value: f.code,
                  label: f.display,
                  count: f.count,
                }))}
                active={listParams.forms ?? []}
                onToggle={(v) => toggleFacet("form", v)}
              />
              <FacetGroup
                title={intl.formatMessage({
                  id: "directory.browse.f.phase",
                  defaultMessage: "By phase",
                })}
                items={facets.phases.map((p) => ({
                  value: p.code,
                  label: p.display,
                  count: p.count,
                }))}
                active={listParams.phases ?? []}
                onToggle={(v) => toggleFacet("phase", v)}
              />
              {facets.manufacturers.length > 0 && (
                <FacetGroup
                  title={intl.formatMessage({
                    id: "directory.browse.f.manufacturer",
                    defaultMessage: "By manufacturer",
                  })}
                  items={facets.manufacturers.map((m) => ({
                    value: m.slug,
                    label: m.name,
                    count: m.count,
                  }))}
                  active={listParams.manufacturers ?? []}
                  onToggle={(v) => toggleFacet("manufacturer", v)}
                />
              )}
            </>
          ) : (
            <FacetSkeleton />
          )}
        </aside>

        <main className="browse-main">
          <div className="browse-toolbar">
            <span className="browse-count">
              {loading && !list ? (
                <span
                  className="etcs-skel etcs-skel--line"
                  style={{ width: 90, display: "inline-block" }}
                />
              ) : (
                <FormattedMessage
                  id="directory.browse.count"
                  defaultMessage="{count, plural, =0 {No treatments} one {1 treatment} other {# treatments}}"
                  values={{ count: list?.programs.length ?? 0 }}
                />
              )}
            </span>
            <label className="browse-sort__label" htmlFor="browse-sort">
              <FormattedMessage id="directory.browse.sort" defaultMessage="Sort" />
              <select
                id="browse-sort"
                className="browse-sort"
                value={listParams.sort ?? "alphabetical"}
                onChange={(e) => setSort(e.target.value as ProgramSort)}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {hasActiveFilters && (
            <div className="browse-chips" role="region" aria-label="Active filters">
              {activeChips.map((chip) => (
                <button
                  key={chip.key + chip.value}
                  type="button"
                  className="browse-chip"
                  onClick={() => toggleFacet(chip.key, chip.value)}
                  aria-label={`Remove ${chip.label} filter`}
                >
                  {chip.label}
                  <span className="browse-chip__x" aria-hidden="true">
                    ✕
                  </span>
                </button>
              ))}
              <button
                type="button"
                className="browse-chip browse-chip--clear"
                onClick={clearFilters}
              >
                <FormattedMessage id="directory.browse.clear" defaultMessage="Clear all" />
              </button>
            </div>
          )}

          {error && !list && (
            <div className="etcs-error" role="alert">
              <p className="etcs-error__msg">
                <FormattedMessage
                  id="directory.browse.error"
                  defaultMessage="We couldn't load treatments just now."
                />
              </p>
              <button type="button" className="etcs-error__retry" onClick={retry}>
                <FormattedMessage id="directory.browse.retry" defaultMessage="Try again" />
              </button>
            </div>
          )}

          {loading && !list ? (
            <div className="browse-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProgramCardSkeleton key={i} />
              ))}
            </div>
          ) : list && list.programs.length === 0 ? (
            <div className="browse-empty">
              <p>
                <FormattedMessage
                  id="directory.browse.empty"
                  defaultMessage="No treatments match these filters yet."
                />
              </p>
              {hasActiveFilters && (
                <button type="button" className="etc-card__pill" onClick={clearFilters}>
                  <FormattedMessage id="directory.browse.clear" defaultMessage="Clear all" />
                </button>
              )}
            </div>
          ) : (
            <div className="browse-grid">
              {list?.programs.map((p) => (
                <ProgramCard key={p.slug} program={p} />
              ))}
            </div>
          )}

          <div className="browse-signup">
            <p>
              <FormattedMessage
                id="directory.browse.signup"
                defaultMessage="Get notified when new treatments are added in Montana."
              />
            </p>
            <EmailSignupForm source="browse_bottom" variant="card" />
          </div>
        </main>
      </div>
    </div>
  );
}

interface FacetItem {
  value: string;
  label: string;
  count: number;
}
interface FacetGroupProps {
  title: string;
  items: ReadonlyArray<FacetItem>;
  active: ReadonlyArray<string>;
  onToggle: (value: string) => void;
  emptyMore?: string;
}
function FacetGroup({ title, items, active, onToggle, emptyMore }: FacetGroupProps) {
  if (items.length === 0 && !emptyMore) return null;
  return (
    <div className="browse-rail__grp">
      <div className="browse-rail__h">{title}</div>
      <div className="browse-rail__b">
        {items.map((it) => {
          const on = active.includes(it.value);
          return (
            <label key={it.value} className="browse-rail__opt" data-on={on ? "true" : undefined}>
              <input
                type="checkbox"
                className="browse-rail__cb"
                checked={on}
                onChange={() => onToggle(it.value)}
              />
              <span className="browse-rail__n">{it.label}</span>
              <span className="browse-rail__ct">{it.count}</span>
            </label>
          );
        })}
        {emptyMore && <p className="browse-rail__more">{emptyMore}</p>}
      </div>
    </div>
  );
}

function FacetSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="browse-rail__grp">
          <div className="etcs-skel etcs-skel--line" style={{ width: "60%", height: 16 }} />
          <div className="etcs-skel etcs-skel--line" style={{ width: "85%" }} />
          <div className="etcs-skel etcs-skel--line" style={{ width: "75%" }} />
        </div>
      ))}
    </>
  );
}

function ProgramCard({ program }: { program: PublicProgramSummary }) {
  const phase = prettyPhase(program.phase);
  const form = prettyForm(program.form);
  const etcLine =
    program.etcCount === 1
      ? "Available at 1 ETC"
      : program.etcCount > 1
        ? `Available at ${program.etcCount} ETCs`
        : "Coming soon";
  const meta = [form, etcLine].filter(Boolean).join(" · ");
  return (
    <Link to={`/programs/${program.slug}`} className="browse-card">
      <div className="browse-card__photo">
        {phase && <span className="browse-card__tag">{phase}</span>}
        <div className="browse-card__art" aria-hidden="true">
          <ProductArt form={program.form} size={130} />
        </div>
      </div>
      <div className="browse-card__name">{program.name}</div>
      {program.indication && <div className="browse-card__ind">{program.indication}</div>}
      <div className="browse-card__meta">{meta}</div>
      <span className="browse-card__btn">
        <FormattedMessage id="directory.browse.view" defaultMessage="View details" />
      </span>
    </Link>
  );
}

function ProgramCardSkeleton() {
  return (
    <div className="browse-card browse-card--skeleton" aria-hidden="true">
      <div className="browse-card__photo etcs-skel" />
      <div
        className="etcs-skel etcs-skel--line"
        style={{ width: "55%", marginTop: 18, height: 18 }}
      />
      <div className="etcs-skel etcs-skel--line" style={{ width: "70%" }} />
      <div className="etcs-skel etcs-skel--line" style={{ width: "40%" }} />
      <div
        className="etcs-skel etcs-skel--line"
        style={{ width: "100%", height: 34, marginTop: 8 }}
      />
    </div>
  );
}

interface ActiveChip {
  key: string;
  value: string;
  label: string;
}
function buildActiveChips(
  params: ProgramListParams,
  facets: PublicProgramFacets | undefined,
): ActiveChip[] {
  if (!facets) return [];
  for (const slug of params.conditions ?? []) void slug;
  const chips: ActiveChip[] = [];
  for (const slug of params.conditions ?? []) {
    const item = facets.conditions.find((c) => c.slug === slug);
    chips.push({ key: "condition", value: slug, label: item?.name ?? slug });
  }
  for (const slug of params.etcs ?? []) {
    const item = facets.etcs.find((e) => e.slug === slug);
    chips.push({ key: "etc", value: slug, label: item ? formatEtcName(item.name) : slug });
  }
  for (const code of params.forms ?? []) {
    const item = facets.forms.find((f) => f.code === code);
    chips.push({ key: "form", value: code, label: item?.display ?? code });
  }
  for (const code of params.phases ?? []) {
    const item = facets.phases.find((p) => p.code === code);
    chips.push({ key: "phase", value: code, label: item?.display ?? code });
  }
  for (const slug of params.manufacturers ?? []) {
    const item = facets.manufacturers.find((m) => m.slug === slug);
    chips.push({ key: "manufacturer", value: slug, label: item?.name ?? slug });
  }
  return chips;
}
