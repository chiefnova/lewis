import type { CSSProperties, ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { RECENT_ON_LEWIS } from "./recent-on-lewis";
import type { SearchSections } from "./use-typeahead-search";

// Shared rendering primitives used by both the SearchOverlay (Surface 1) and
// HeroSearchTypeahead (homepage hero inline popover). Output is identical
// across surfaces — the same listbox markup, the same option ids, the same
// section ordering — so screen-reader experience is consistent regardless of
// which entry point the patient takes.

type ConditionState = SearchSections["conditions"][number]["state"];

const CONDITION_STATE_MESSAGE_ID: Record<ConditionState, string> = {
  live: "directory.search.results.row.live",
  coming_soon: "directory.search.results.row.coming-soon",
  not_offered: "directory.search.results.row.not-offered",
};

export const LISTBOX_ID = "lewis-search-listbox";

/** Stable per-suggestion id used by aria-activedescendant. Keeps URL-safe. */
export function optionIdFor(key: string): string {
  return `lewis-search-option-${key.replace(/:/g, "-")}`;
}

export function SectionedResults({
  sections,
  activeIndex,
  onSelect,
  listboxId = LISTBOX_ID,
}: {
  sections: SearchSections;
  activeIndex: number;
  onSelect(href: string): void;
  /** Override the listbox id when two surfaces could co-exist (defensive). */
  listboxId?: string;
}) {
  const intl = useIntl();
  // Virtual-focus offsets map activeIndex → a single highlighted row across
  // the merged Conditions → Treatments → ETCs list.
  const conditionsOffset = 0;
  const treatmentsOffset = sections.conditions.length;
  const etcsOffset = treatmentsOffset + sections.treatments.length;

  return (
    <div role="listbox" id={listboxId}>
      {sections.conditions.length > 0 && (
        <Section headingId="directory.search.section.conditions" count={sections.conditions.length}>
          {sections.conditions.map((hit, i) => (
            <SuggestionButton
              key={hit.slug}
              optionKey={`condition:${hit.slug}`}
              label={hit.name}
              meta={intl.formatMessage({ id: CONDITION_STATE_MESSAGE_ID[hit.state] })}
              active={activeIndex === conditionsOffset + i}
              onClick={() => onSelect(hit.href)}
            />
          ))}
        </Section>
      )}

      {sections.treatments.length > 0 && (
        <Section headingId="directory.search.section.treatments" count={sections.treatments.length}>
          {sections.treatments.map((hit, i) => (
            <SuggestionButton
              key={hit.slug}
              optionKey={`treatment:${hit.slug}`}
              label={hit.name}
              meta={hit.drug ?? null}
              active={activeIndex === treatmentsOffset + i}
              onClick={() => onSelect(hit.href)}
            />
          ))}
        </Section>
      )}

      {sections.etcs.length > 0 && (
        <Section headingId="directory.search.section.etcs" count={sections.etcs.length}>
          {sections.etcs.map((hit, i) => (
            <SuggestionButton
              key={hit.slug}
              optionKey={`etc:${hit.slug}`}
              label={hit.name}
              meta={hit.city}
              active={activeIndex === etcsOffset + i}
              onClick={() => onSelect(hit.href)}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

export function RecentOnLewis({ onClick }: { onClick(href: string): void }) {
  return (
    <div>
      <SectionHeading>
        <FormattedMessage id="directory.search.empty.heading" />
      </SectionHeading>
      <div>
        {RECENT_ON_LEWIS.map((entry) => (
          <button
            key={entry.href}
            type="button"
            onClick={() => onClick(entry.href)}
            style={resultButtonStyle()}
          >
            <FormattedMessage id={entry.labelId} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function NoResults({ q, onClick }: { q: string; onClick(href: string): void }) {
  return (
    <div>
      <p
        style={{
          fontSize: 15,
          color: "var(--ink-soft)",
          marginBottom: 20,
          marginTop: 0,
        }}
      >
        <FormattedMessage id="directory.search.no-results.heading" values={{ query: q }} />
      </p>
      <SectionHeading>
        <FormattedMessage id="directory.search.no-results.fallback-heading" />
      </SectionHeading>
      <div>
        {RECENT_ON_LEWIS.map((entry) => (
          <button
            key={entry.href}
            type="button"
            onClick={() => onClick(entry.href)}
            style={resultButtonStyle()}
          >
            <FormattedMessage id={entry.labelId} />
          </button>
        ))}
      </div>
    </div>
  );
}

function Section({
  headingId,
  count,
  children,
}: {
  headingId: string;
  count: number;
  children: ReactNode;
}) {
  // role="group" lets options be direct ARIA children of the section while
  // staying inside the outer listbox per WAI-ARIA combobox-with-listbox.
  // Without this, axe flags aria-required-parent on each option because
  // <ul>/<li> intermediaries sever the listbox→option relationship.
  return (
    <div style={{ marginBottom: 20 }} role="group">
      <SectionHeading>
        <FormattedMessage id={headingId} /> · {count}
      </SectionHeading>
      <div>{children}</div>
    </div>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "var(--ink-soft)",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function SuggestionButton({
  optionKey,
  label,
  meta,
  active,
  onClick,
}: {
  /** Stable key (e.g. "condition:diabetic-pn") used to derive the option id. */
  optionKey: string;
  label: string;
  meta: string | null;
  active: boolean;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      id={optionIdFor(optionKey)}
      role="option"
      aria-selected={active}
      // Pointer-down (not click) so suggestion activation wins the race
      // with input blur — without this, on some browsers the popover
      // closes via blur before the click handler resolves.
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      onClick={onClick}
      style={resultButtonStyle(active)}
    >
      <span style={{ fontSize: 15, color: "var(--ink)" }}>{label}</span>
      {meta ? (
        <span style={{ fontSize: 12.5, color: "var(--ink-soft)", marginLeft: 12 }}>{meta}</span>
      ) : null}
    </button>
  );
}

export function SkeletonRow() {
  return (
    <div
      aria-hidden="true"
      style={{
        height: 14,
        width: "60%",
        background: "rgba(27,24,20,0.06)",
        borderRadius: 4,
        marginTop: 6,
      }}
    />
  );
}

function resultButtonStyle(active = false): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    width: "100%",
    padding: "10px 12px",
    border: "none",
    borderRadius: 6,
    background: active ? "var(--paper-deep)" : "transparent",
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "var(--sans)",
  };
}
