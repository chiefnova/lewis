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
            {/* Flag + wordmark mirror the header treatment exactly:
                serif "lewis." + italic ink-soft "health". Footer keeps the
                smaller 18px size so it stays a quiet attribution mark, not
                a second brand banner. */}
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
              }}
            >
              <span
                className="serif"
                style={{
                  fontSize: 18,
                  fontWeight: 400,
                  letterSpacing: "-0.025em",
                  lineHeight: 1,
                }}
              >
                lewis.
              </span>
              <span
                className="serif italic"
                style={{
                  fontSize: 18,
                  fontWeight: 300,
                  fontStyle: "italic",
                  letterSpacing: "-0.025em",
                  lineHeight: 1,
                  color: "var(--ink-soft)",
                }}
              >
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
