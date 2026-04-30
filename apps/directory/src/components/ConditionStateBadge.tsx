import type { ConditionState } from "@lewis/shared/api/public";
import { FormattedMessage } from "react-intl";

// Compact status chip used at the top of /conditions/:slug detail pages
// (and reusable inline elsewhere — search overlay results, future homepage
// FeaturedConditions cards). Same shape across all three states; the dot
// does the state-signaling work. Sentence case, 600 weight. Visual language
// mirrors the .caption-dot pattern on the index page.
//
// Per directoryprd.md § 14 + design-shotgun round 6 — see
// ~/.gstack/projects/chiefnova-lewis/designs/condition-state-badge-20260429/approved.json

const STATE_MESSAGE_ID: Record<ConditionState, string> = {
  live: "directory.conditions.state-badge.live",
  coming_soon: "directory.conditions.state-badge.coming-soon",
  not_offered: "directory.conditions.state-badge.not-offered",
};

const STATE_VARIANT_CLASS: Record<ConditionState, string> = {
  live: "is-live",
  coming_soon: "is-coming",
  not_offered: "is-not",
};

interface ConditionStateBadgeProps {
  state: ConditionState;
  size?: "md" | "sm";
}

export function ConditionStateBadge({ state, size = "md" }: ConditionStateBadgeProps) {
  const variantClass = STATE_VARIANT_CLASS[state];
  const sizeClass = size === "sm" ? " is-sm" : "";
  return (
    <span className={`state-badge ${variantClass}${sizeClass}`}>
      <span className="state-badge-dot" aria-hidden="true" />
      <FormattedMessage id={STATE_MESSAGE_ID[state]} />
    </span>
  );
}
