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
 *   Secondary (pro + company):   For Clinicians, For Manufacturers, For ETCs,
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
  // ETC access temporarily hidden from nav — uncomment to restore.
  // { to: "/etcs", id: "directory.nav.etcs", default: "ETCs" },
] as const;

const SECONDARY_LINKS = [
  { to: "/for-clinicians", id: "directory.nav.for_clinicians", default: "For Clinicians" },
  { to: "/for-manufacturers", id: "directory.nav.for_manufacturers", default: "For Manufacturers" },
  // ETC access temporarily hidden from nav — uncomment to restore.
  // { to: "/for-etcs", id: "directory.nav.for_etcs", default: "For ETCs" },
  { to: "/platform", id: "directory.nav.platform", default: "Operating platform" },
  { to: "/how-it-works", id: "directory.nav.how_it_works", default: "How it works" },
  { to: "/faq", id: "directory.nav.faq", default: "Frequently asked" },
  { to: "/about", id: "directory.nav.about", default: "About" },
] as const;

export function SecondaryNavDrawer({ open, onClose }: SecondaryNavDrawerProps) {
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const priorActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // Save the element focused before the drawer opened so we can restore
    // focus on close — required for aria-modal="true" consumers.
    priorActiveRef.current =
      typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;
    firstLinkRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      // Focus trap: aria-modal="true" promises focus stays inside the panel.
      // Without intercepting Tab, screen-reader and keyboard users can tab
      // into background content while the dialog is "modal".
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      // Restore focus to the element that opened the drawer (e.g., the
      // hamburger button) so keyboard flow resumes where the user left off.
      priorActiveRef.current?.focus?.();
    };
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
      <div className="nav-drawer__panel" ref={panelRef}>
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
