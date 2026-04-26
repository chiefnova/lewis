import { Link, useLocation } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import { Magnifier } from "./icons";

export function TopNav() {
  const location = useLocation();
  const intl = useIntl();
  const isBrowse = location.pathname.startsWith("/browse");

  return (
    <header style={{ background: "var(--paper)", position: "sticky", top: 0, zIndex: 30 }}>
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "0 32px",
          height: 80,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          to="/"
          aria-label={intl.formatMessage({
            id: "directory.home.aria",
            defaultMessage: "Corridor home",
          })}
          style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}
        >
          <span className="serif" style={{ fontSize: 24, letterSpacing: "-0.015em" }}>
            Corridor
          </span>
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--accent)",
              display: "inline-block",
              alignSelf: "center",
            }}
          />
          <span
            className="serif italic"
            style={{ fontSize: 18, color: "var(--ink-soft)", fontWeight: 300 }}
          >
            health
          </span>
        </Link>
        <nav aria-label="Primary" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            to="/browse"
            className="pill pill-outline pill-sm"
            style={{
              borderColor: isBrowse ? "var(--ink)" : "rgba(27,24,20,0.25)",
            }}
          >
            <FormattedMessage id="directory.nav.browse" defaultMessage="Browse Treatments" />
          </Link>
          <Link
            to="/search"
            aria-label={intl.formatMessage({
              id: "directory.nav.search.aria",
              defaultMessage: "Search",
            })}
            style={{
              width: 40,
              height: 40,
              borderRadius: 9999,
              background: "var(--ink)",
              color: "var(--paper)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Magnifier />
          </Link>
        </nav>
      </div>
    </header>
  );
}
