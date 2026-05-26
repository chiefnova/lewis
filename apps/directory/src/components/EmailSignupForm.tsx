import { useId, useState, type FormEvent } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { useMarketingSubscription } from "./use-marketing-subscription";

/**
 * Slice 4 § 11.2 / 11.9 / 7.5 — wired email signup. Three call sites:
 *   - AnnouncementStrip (variant="announcement")
 *   - BeginningSection on the homepage (variant="banner")
 *   - /browse bottom (variant="card")
 *
 * Single source of truth for the signup UX. Submits to
 * POST /v1/public/marketing-subscriptions via useMarketingSubscription.
 * Always-success-shaped response defeats email-existence timing attacks; the
 * UI flips to a "check your email" confirmation state regardless of whether
 * the address was new or already on the list.
 *
 * Per .claude/rules/frontend.md: react-intl for all user-facing copy. Plain
 * useState here (vs react-hook-form) since the form is one field — adding a
 * dep for that surface area is overkill, and the existing useState pattern
 * keeps the bundle thin.
 */

export type EmailSignupSource = "announcement_strip" | "homepage_beginning" | "browse_bottom";

export type EmailSignupVariant = "announcement" | "banner" | "card";

interface EmailSignupFormProps {
  source: EmailSignupSource;
  variant: EmailSignupVariant;
  /** Optional override for the success message (shown instead of API response). */
  successOverride?: string;
}

const VARIANT_CLASS: Record<EmailSignupVariant, string> = {
  announcement: "email-signup--announcement",
  banner: "email-signup--banner",
  card: "email-signup--card",
};

export function EmailSignupForm({ source, variant, successOverride }: EmailSignupFormProps) {
  const intl = useIntl();
  const inputId = useId();
  const errorId = useId();
  const [email, setEmail] = useState("");
  const { state, submit } = useMarketingSubscription();

  const placeholder = intl.formatMessage({
    id: "directory.marketing.email.placeholder",
    defaultMessage: "you@example.com",
  });
  const submitLabel = intl.formatMessage({
    id: "directory.marketing.cta",
    defaultMessage: "Get notified",
  });
  const inputAriaLabel = intl.formatMessage({
    id: "directory.marketing.email.label",
    defaultMessage: "Email address for new-program notifications",
  });

  if (state.phase === "success") {
    return (
      <div
        className={`email-signup email-signup--success ${VARIANT_CLASS[variant]}`}
        role="status"
        aria-live="polite"
      >
        <span className="email-signup__success-mark" aria-hidden="true">
          ✓
        </span>
        <span className="email-signup__success-text">
          {successOverride ?? (
            <FormattedMessage id={state.messageId} defaultMessage={state.messageDefault} />
          )}
        </span>
      </div>
    );
  }

  const isError = state.phase === "error";
  const isSubmitting = state.phase === "submitting";

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (trimmed.length === 0) return;
    await submit({ email: trimmed, source });
  };

  return (
    <form className={`email-signup ${VARIANT_CLASS[variant]}`} onSubmit={onSubmit} noValidate>
      <label htmlFor={inputId} className="visually-hidden">
        {inputAriaLabel}
      </label>
      <input
        id={inputId}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={placeholder}
        aria-label={inputAriaLabel}
        aria-invalid={isError ? "true" : undefined}
        aria-describedby={isError ? errorId : undefined}
        autoComplete="email"
        required
        disabled={isSubmitting}
        className="email-signup__input"
      />
      <button
        type="submit"
        disabled={isSubmitting || email.trim().length === 0}
        className="email-signup__submit"
      >
        {isSubmitting ? (
          <FormattedMessage id="directory.marketing.cta.submitting" defaultMessage="Sending…" />
        ) : (
          submitLabel
        )}
      </button>
      {isError && (
        <p id={errorId} className="email-signup__error" role="alert">
          <FormattedMessage id={state.messageId} defaultMessage={state.messageDefault} />
        </p>
      )}
    </form>
  );
}
