import { Link, useLocation } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import { Magnifier } from "./icons";
import { useSearchOverlay } from "../search/SearchContext";

export function TopNav() {
  const location = useLocation();
  const intl = useIntl();
  const isBrowse = location.pathname.startsWith("/browse");
  const isConditions = location.pathname.startsWith("/conditions");
  const { open } = useSearchOverlay();

  return (
    <header style={{ background: "var(--paper)", position: "sticky", top: 0, zIndex: 30 }}>
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "0 24px",
          height: 80,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Link
          to="/"
          aria-label={intl.formatMessage({
            id: "directory.home.aria",
            defaultMessage: "Lewis home",
          })}
          style={{ display: "inline-flex", alignItems: "baseline" }}
        >
          <span
            className="serif"
            style={{
              fontSize: 24,
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
              fontSize: 24,
              fontWeight: 300,
              fontStyle: "italic",
              letterSpacing: "-0.025em",
              lineHeight: 1,
              color: "var(--ink-soft)",
            }}
          >
            health
          </span>
        </Link>
        <nav aria-label="Primary" style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link
            to="/conditions"
            className="topnav-link"
            aria-current={isConditions ? "page" : undefined}
            style={{
              fontSize: 14,
              color: isConditions ? "var(--ink)" : "var(--ink-soft)",
              textDecoration: "none",
              borderBottom: isConditions ? "1px solid var(--ink)" : "1px solid transparent",
              paddingBottom: 2,
              transition: "color 120ms ease, border-color 120ms ease",
            }}
          >
            <FormattedMessage id="directory.nav.conditions" defaultMessage="Conditions" />
          </Link>
          <Link
            to="/browse"
            className="pill pill-outline pill-sm"
            aria-current={isBrowse ? "page" : undefined}
            style={{
              borderColor: isBrowse ? "var(--ink)" : "rgba(27,24,20,0.25)",
            }}
          >
            <span className="topnav-browse-full">
              <FormattedMessage id="directory.nav.browse" defaultMessage="Browse Treatments" />
            </span>
            <span className="topnav-browse-short">
              <FormattedMessage id="directory.nav.browse.short" defaultMessage="Browse" />
            </span>
          </Link>
          <button
            type="button"
            onClick={open}
            aria-label={intl.formatMessage({
              id: "directory.nav.search.aria",
              defaultMessage: "Search",
            })}
            style={{
              width: 40,
              height: 40,
              padding: 0,
              border: "none",
              borderRadius: "var(--radius-button-sm)",
              background: "var(--accent)",
              color: "var(--paper)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Magnifier />
          </button>
        </nav>
      </div>
    </header>
  );
}
