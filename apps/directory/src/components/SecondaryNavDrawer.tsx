import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FormattedMessage } from "react-intl";

/**
 * Slice 4 § 10.1 — mobile nav drawer for the flat-comprehensive TopNav
 * (Round 3 locked option C). On desktop the full nav is visible inline, so
 * this drawer is the MOBILE collapse target only — the TopNav hamburger is
 * the sole trigger (hidden >720px via CSS).
 *
 * Carries all 10 nav destinations (full parity with the footer minus Legal),
 * grouped to match the desktop layout:
 *   Primary (patient discovery): Conditions, Browse Treatments, ETCs
 *   Secondary (pro + company):   For Physicians, For Sponsors, For ETCs,
 *                                Operating platform, How it works,
 *                                Frequently asked, About
 *
 * Behavior: ESC closes, click-outside closes, focus moves to the first link
 * on open.
 */

interface SecondaryNavDrawerProps {
  open: boolean;
  onClose: () => void;
}

const PRIMARY_LINKS = [
  { to: "/conditions", id: "directory.nav.conditions", default: "Conditions" },
  { to: "/browse", id: "directory.nav.browse", default: "Browse Treatments" },
  { to: "/etcs", id: "directory.nav.etcs", default: "ETCs" },
] as const;

const SECONDARY_LINKS = [
  { to: "/for-clinicians", id: "directory.nav.for_physicians", default: "For Physicians" },
  { to: "/for-sponsors", id: "directory.nav.for_sponsors", default: "For Sponsors" },
  { to: "/for-etcs", id: "directory.nav.for_etcs", default: "For ETCs" },
  { to: "/platform", id: "directory.nav.platform", default: "Operating platform" },
  { to: "/how-it-works", id: "directory.nav.how_it_works", default: "How it works" },
  { to: "/faq", id: "directory.nav.faq", default: "Frequently asked" },
  { to: "/about", id: "directory.nav.about", default: "About" },
] as const;

export function SecondaryNavDrawer({ open, onClose }: SecondaryNavDrawerProps) {
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    firstLinkRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="nav-drawer" role="dialog" aria-modal="true" aria-label="Menu">
      <button
        type="button"
        className="nav-drawer__overlay"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div className="nav-drawer__panel">
        <button
          type="button"
          className="nav-drawer__close"
          onClick={onClose}
          aria-label="Close menu"
        >
          ×
        </button>

        <nav aria-label="Primary" className="nav-drawer__group">
          {PRIMARY_LINKS.map(({ to, id, default: def }, index) => (
            <Link
              key={to}
              to={to}
              ref={index === 0 ? firstLinkRef : undefined}
              className="nav-drawer__link"
              onClick={onClose}
            >
              <FormattedMessage id={id} defaultMessage={def} />
            </Link>
          ))}
        </nav>

        <nav aria-label="More" className="nav-drawer__group nav-drawer__group--secondary">
          {SECONDARY_LINKS.map(({ to, id, default: def }) => (
            <Link key={to} to={to} className="nav-drawer__link" onClick={onClose}>
              <FormattedMessage id={id} defaultMessage={def} />
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
