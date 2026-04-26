import { Link } from "react-router-dom";

import montanaFlag from "../assets/montana-flag.svg";

export function Footer() {
  return (
    <footer style={{ background: "var(--paper)", paddingTop: 40, paddingBottom: 56 }}>
      <div className="container">
        <div className="rule" style={{ marginBottom: 32 }} />
        <div
          className="footer-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center",
            gap: 24,
            fontSize: 12.5,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--ink-soft)",
          }}
        >
          <div className="footer-attribution">
            {/* Flag + wordmark mirror the header treatment: serif "Lewis", accent
                period, italic ink-soft "health". Inherits the footer's 12.5px so
                it stays a quiet attribution mark, not a second brand banner. */}
            <img
              src={montanaFlag}
              alt=""
              aria-hidden="true"
              className="footer-flag-img"
              width={51}
              height={34}
              loading="lazy"
              decoding="async"
            />
            <span
              className="footer-wordmark-inline"
              style={{
                display: "inline-flex",
                alignItems: "baseline",
                textTransform: "none",
                letterSpacing: "-0.015em",
                fontSize: 18,
              }}
            >
              <span className="serif" style={{ color: "var(--ink)" }}>
                Lewis
              </span>
              <span className="serif" style={{ color: "var(--accent)" }} aria-hidden="true">
                .
              </span>
              <span className="serif italic" style={{ color: "var(--ink-soft)", fontWeight: 300 }}>
                health
              </span>
            </span>
          </div>
          <div
            className="footer-links"
            style={{
              display: "flex",
              gap: 22,
              justifyContent: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <Link to="/privacy" style={{ borderBottom: "1px solid var(--rule)" }}>
              Privacy
            </Link>
            <Link to="/terms" style={{ borderBottom: "1px solid var(--rule)" }}>
              Terms
            </Link>
            <Link to="/feedback" style={{ borderBottom: "1px solid var(--rule)" }}>
              Share Feedback
            </Link>
            <Link to="/for-etcs" style={{ borderBottom: "1px solid var(--rule)" }}>
              For ETCs
            </Link>
            <Link to="/for-sponsors" style={{ borderBottom: "1px solid var(--rule)" }}>
              For Sponsors
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
