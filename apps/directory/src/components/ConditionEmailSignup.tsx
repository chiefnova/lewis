import type { ConditionState } from "@lewis/shared/api/public";
import { FormattedMessage, useIntl } from "react-intl";

// Disabled-CTA email signup. Variant A from design-shotgun Round 7 — see
// ~/.gstack/projects/chiefnova-lewis/designs/condition-email-signup-20260429/approved.json
//
// The form is visually styled but `disabled` — submit is a no-op. A small
// italic note clarifies "Notifications are not yet available — we'll switch
// this on shortly." The future signup-wiring slice removes the `disabled`
// attrs and the disabled-note message; visual identity stays the same.
//
// Used on /conditions/:slug detail pages for both `coming_soon` (placeholder
// "Get notified when {condition} is listed") and `not_offered` (placeholder
// "Get notified if a Montana ETC adds a program for {condition}").

const PLACEHOLDER_MESSAGE_ID: Record<
  Extract<ConditionState, "coming_soon" | "not_offered">,
  string
> = {
  coming_soon: "directory.conditions.detail.coming-soon.signup.placeholder",
  not_offered: "directory.conditions.detail.not-offered.signup.placeholder",
};

interface ConditionEmailSignupProps {
  state: "coming_soon" | "not_offered";
  conditionName: string;
}

export function ConditionEmailSignup({ state, conditionName }: ConditionEmailSignupProps) {
  const intl = useIntl();
  const placeholder = intl.formatMessage(
    { id: PLACEHOLDER_MESSAGE_ID[state] },
    { condition: conditionName },
  );

  return (
    <div className="condition-email-signup">
      <div className="condition-email-signup-row">
        <input
          type="email"
          placeholder={placeholder}
          aria-label={placeholder}
          disabled
          aria-disabled="true"
        />
        <button type="button" disabled aria-disabled="true">
          <FormattedMessage id="directory.conditions.detail.signup.cta" />
        </button>
      </div>
      <span className="condition-email-signup-note">
        <FormattedMessage id="directory.conditions.detail.signup.disabled-note" />
      </span>
    </div>
  );
}
