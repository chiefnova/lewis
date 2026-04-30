import type { ConditionState, PublicConditionSummary } from "@lewis/shared/api/public";
import { FormattedMessage, useIntl } from "react-intl";
import { Link } from "react-router-dom";

import { siteUrl, useSeo } from "../../seo/useSeo";
import { useConditionsList } from "./use-conditions-list";

// Newspaper-directory layout per directoryprd.md § 14.1 + design-shotgun
// Round 1 winner (variant B refined). Three semantic <table> blocks per
// state with serif captions, accent dots, and a count chip floated to the
// right edge. Not-offered rows go italic Fraunces ink-soft to step back
// honestly. The catalog is read from `/v1/public/conditions` — DB is the
// single source of truth post-Slice-2 (see plans/.../immutable-squishing-sprout.md
// architecture decision 1).

const STATE_ORDER: ReadonlyArray<ConditionState> = ["live", "coming_soon", "not_offered"];

const STATE_TITLE_MESSAGE_ID: Record<ConditionState, string> = {
  live: "directory.conditions.index.section.live",
  coming_soon: "directory.conditions.index.section.coming-soon",
  not_offered: "directory.conditions.index.section.not-offered",
};

function buildItemListJsonLd(conditions: ReadonlyArray<PublicConditionSummary>) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Conditions with experimental treatments in Montana",
    itemListElement: conditions.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      url: siteUrl(`/conditions/${c.slug}`),
    })),
  };
}

function orderConditionsForIndex(
  conditions: ReadonlyArray<PublicConditionSummary>,
): PublicConditionSummary[] {
  return STATE_ORDER.flatMap((state) =>
    conditions
      .filter((c) => c.state === state)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
}

export function ConditionsIndexPage() {
  const intl = useIntl();
  const { data, loading, error, retry } = useConditionsList();
  const orderedConditions = data ? orderConditionsForIndex(data.conditions) : undefined;

  const indexTitle = intl.formatMessage({ id: "directory.conditions.index.title" });
  const indexDescription = intl.formatMessage({
    id: "directory.conditions.index.description",
  });

  useSeo({
    title: `${indexTitle} — Lewis Health`,
    description: indexDescription,
    canonical: siteUrl("/conditions"),
    jsonLd: orderedConditions ? buildItemListJsonLd(orderedConditions) : undefined,
  });

  return (
    <div className="fade-up conditions-index">
      <div className="container">
        <header className="masthead">
          <div className="masthead-eyebrow">
            <span>
              <FormattedMessage id="directory.conditions.index.eyebrow" />
            </span>
            <span>
              <FormattedMessage id="directory.conditions.index.dateline" />
            </span>
          </div>
          <h1 className="serif">
            Conditions with experimental treatments in <em>Montana</em>.
          </h1>
          <p className="masthead-lede">
            <FormattedMessage id="directory.conditions.index.description" />
          </p>
        </header>

        {loading ? <ConditionsIndexSkeleton /> : null}
        {error && !loading ? <ConditionsIndexError onRetry={retry} /> : null}
        {orderedConditions && !loading && !error ? (
          <ConditionsIndexBody conditions={orderedConditions} />
        ) : null}

        <p className="footer-note">
          <FormattedMessage id="directory.conditions.index.footer-note" />{" "}
          <Link to="/about">
            <FormattedMessage id="directory.conditions.index.footer-note.about-cta" />
          </Link>
        </p>
      </div>
    </div>
  );
}

// ----- Body --------------------------------------------------------------

function ConditionsIndexBody({
  conditions,
}: {
  conditions: ReadonlyArray<PublicConditionSummary>;
}) {
  // Group by state for the visual sections. The incoming array is already
  // state-grouped and name-sorted by orderConditionsForIndex().
  const byState = STATE_ORDER.map((state) => ({
    state,
    items: conditions.filter((c) => c.state === state),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      {byState.map((group) => (
        <ConditionsStateTable key={group.state} state={group.state} conditions={group.items} />
      ))}
    </>
  );
}

// ----- Per-state table ---------------------------------------------------

function ConditionsStateTable({
  state,
  conditions,
}: {
  state: ConditionState;
  conditions: ReadonlyArray<PublicConditionSummary>;
}) {
  const intl = useIntl();
  const captionTitle = intl.formatMessage({ id: STATE_TITLE_MESSAGE_ID[state] });
  const captionCount = formatCaptionCount(intl, state, conditions);
  const tableClassName = state === "not_offered" ? "dir-table is-not" : "dir-table";

  return (
    <table className={tableClassName}>
      <caption>
        <div className="caption-row">
          {state === "live" ? <span className="caption-dot is-live" aria-hidden="true" /> : null}
          {state === "coming_soon" ? (
            <span className="caption-dot is-coming" aria-hidden="true" />
          ) : null}
          <span className="caption-title">{captionTitle}</span>
          <span className="caption-count">{captionCount}</span>
        </div>
      </caption>
      <thead>
        <tr>
          <th scope="col" className="col-name">
            <FormattedMessage id="directory.conditions.index.column.condition" />
          </th>
          <th scope="col" className="col-icd">
            <FormattedMessage id="directory.conditions.index.column.icd10" />
          </th>
          <th scope="col" className="col-arrow" aria-hidden="true" />
        </tr>
      </thead>
      <tbody>
        {conditions.map((c) => (
          <ConditionRow key={c.slug} condition={c} />
        ))}
      </tbody>
    </table>
  );
}

function formatCaptionCount(
  intl: ReturnType<typeof useIntl>,
  state: ConditionState,
  conditions: ReadonlyArray<PublicConditionSummary>,
): string {
  if (state === "live") {
    const programCount = conditions.reduce((sum, c) => sum + c.programCount, 0);
    return intl.formatMessage(
      { id: "directory.conditions.index.section.live.count" },
      { conditions: conditions.length, programs: programCount },
    );
  }
  if (state === "coming_soon") {
    return intl.formatMessage(
      { id: "directory.conditions.index.section.coming-soon.count" },
      { conditions: conditions.length },
    );
  }
  return intl.formatMessage({ id: "directory.conditions.index.section.not-offered.count" });
}

// ----- Single row --------------------------------------------------------

function ConditionRow({ condition }: { condition: PublicConditionSummary }) {
  const intl = useIntl();
  const noIcdLabel = intl.formatMessage({ id: "directory.conditions.index.icd10.none" });
  const icdDisplay = condition.icd10Codes.length > 0 ? condition.icd10Codes : null;

  return (
    <tr>
      <td>
        <div className="row-name">
          <Link to={`/conditions/${condition.slug}`}>{condition.name}</Link>
        </div>
        {condition.summary ? <div className="row-summary">{condition.summary}</div> : null}
      </td>
      <td className="row-icd">
        {icdDisplay
          ? icdDisplay.map((code, i) => (
              <span key={code}>
                {code}
                {i < icdDisplay.length - 1 ? <br /> : null}
              </span>
            ))
          : noIcdLabel}
      </td>
      <td className="row-arrow" aria-hidden="true">
        →
      </td>
    </tr>
  );
}

// ----- Loading + error states (rough first-pass — Round 8 will refine) ----

function ConditionsIndexSkeleton() {
  return (
    <div aria-live="polite" aria-busy="true" style={{ padding: "48px 0" }}>
      <div className="lewis-skeleton" style={{ height: 30, width: "30%", marginBottom: 24 }} />
      <div className="lewis-skeleton" style={{ height: 22, width: "85%", marginBottom: 16 }} />
      <div className="lewis-skeleton" style={{ height: 22, width: "75%", marginBottom: 16 }} />
      <div className="lewis-skeleton" style={{ height: 22, width: "80%", marginBottom: 36 }} />
      <div className="lewis-skeleton" style={{ height: 30, width: "25%", marginBottom: 18 }} />
      <div className="lewis-skeleton" style={{ height: 22, width: "70%", marginBottom: 12 }} />
      <div className="lewis-skeleton" style={{ height: 22, width: "65%" }} />
    </div>
  );
}

function ConditionsIndexError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="lewis-error-block" role="alert">
      <h2>
        <FormattedMessage id="directory.conditions.index.error.title" />
      </h2>
      <p>
        <FormattedMessage id="directory.conditions.index.error.body" />
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="pill pill-outline pill-sm"
        style={{ cursor: "pointer" }}
      >
        <FormattedMessage id="directory.conditions.index.error.retry" />
      </button>
    </div>
  );
}
