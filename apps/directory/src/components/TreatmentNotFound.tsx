import { Link } from "react-router-dom";
import { FormattedMessage } from "react-intl";

import { ArrowLeft, ArrowRight } from "./icons";

// Inline not-found state for /programs/:slug. /design-shotgun Round 5
// Variant A (approved 2026-04-30). Same shell as TreatmentDetailError —
// stays in the .split-detail layout — but offers back-to-browse as the
// primary action since the user is at a terminal state (no slug to retry).

export function TreatmentNotFound() {
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
          <h1 className="program-state-msg-h1">
            <FormattedMessage
              id="directory.program.not-found.heading"
              defaultMessage="We couldn't find a treatment at that address."
            />
          </h1>
          <p className="program-state-msg-body">
            <FormattedMessage
              id="directory.program.not-found.body"
              defaultMessage="The link may have changed, or the program may not be in the directory yet. Browse the current list of treatments to find what you're looking for."
            />
          </p>
          <div className="program-state-msg-actions">
            <Link to="/browse" className="pill pill-outline pill-sm">
              <FormattedMessage
                id="directory.program.not-found.back-to-browse"
                defaultMessage="Back to browse"
              />
              <ArrowRight size={12} />
            </Link>
          </div>
        </main>
      </div>
    </article>
  );
}
