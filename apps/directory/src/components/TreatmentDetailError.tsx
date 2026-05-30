import { Link } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";

import { ArrowLeft } from "./icons";

// Inline error state for /programs/:slug. /design-shotgun Round 5 Variant A
// (approved 2026-04-30). Stays inside the .split-detail shell so the
// topnav + sticky art panel remain in place; only the right column
// changes. Calm serif H1 + body + retry-as-underlined-serif-anchor +
// quiet support email link. Lewis voice: recoverable, no alarm.

interface TreatmentDetailErrorProps {
  onRetry: () => void;
}

export function TreatmentDetailError({ onRetry }: TreatmentDetailErrorProps) {
  const intl = useIntl();
  return (
    <article className="split-detail">
      <div className="split-detail-art" style={{ flexDirection: "column", position: "sticky" }}>
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 32,
            fontStyle: "italic",
            fontFamily: "var(--serif)",
            color: "var(--ink-faint)",
            fontSize: 13,
          }}
        >
          <FormattedMessage
            id="directory.program.product-disclaimer"
            defaultMessage="Actual product appearance may vary."
          />
        </div>
      </div>

      <div className="split-detail-content-grid">
        <main>
          <Link to="/browse" className="program-back-link">
            <ArrowLeft />
            <FormattedMessage
              id="directory.program.back-to-browse"
              defaultMessage="Back to browse"
            />
          </Link>
          {/*
            Scope role="alert" to just the heading + body so the retry
            button and support link don't sit inside an assertive live
            region. role="alert" implies aria-live="assertive" +
            aria-atomic="true"; with the wider <main role="alert">,
            screen-reader users would hear the message re-announced
            whenever they navigated through the interactive controls
            below it. This wrapper announces the message on mount and
            keeps the controls outside the live region.
          */}
          <div role="alert">
            <h1 className="program-state-msg-h1">
              <FormattedMessage
                id="directory.program.error.heading"
                defaultMessage="We couldn't load this treatment."
              />
            </h1>
            <p className="program-state-msg-body">
              <FormattedMessage
                id="directory.program.error.body"
                defaultMessage="A network hiccup, briefly. Try again — your connection may have just blipped."
              />
            </p>
          </div>
          <div className="program-state-msg-actions">
            <button type="button" className="program-state-msg-retry-link" onClick={onRetry}>
              {intl.formatMessage({
                id: "directory.program.error.retry",
                defaultMessage: "Try again",
              })}
            </button>
            <span className="program-state-msg-support">
              <FormattedMessage
                id="directory.program.error.support"
                defaultMessage="If this persists, contact <a>support@lewis.health</a>."
                values={{
                  a: (chunks) => <a href="mailto:support@lewis.health">{chunks}</a>,
                }}
              />
            </span>
          </div>
        </main>
      </div>
    </article>
  );
}
