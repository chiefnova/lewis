import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer style={{ background: "var(--paper)", paddingTop: 40, paddingBottom: 56 }}>
      <div className="container">
        <div className="rule" style={{ marginBottom: 32 }} />
        <div
          className="footer-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: 24,
            fontSize: 12.5,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--ink-soft)",
          }}
        >
          <div className="footer-attribution">Designed in Bozeman by Lewis Health</div>
          <div
            className="footer-wordmark serif"
            style={{ fontSize: 16, letterSpacing: "-0.01em", textTransform: "none" }}
          >
            Lewis
            <span className="serif italic" style={{ color: "var(--ink-soft)" }}>
              {" "}
              / health
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
