import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";

import { Magnifier } from "./icons";
import { useSearchOverlay } from "../search/SearchContext";
import { SecondaryNavDrawer } from "./SecondaryNavDrawer";
import { NavDropdown, type NavDropdownLink } from "./NavDropdown";

/** Partner + company clusters fold into two header dropdowns (full footer
 * parity minus Legal). For Clinicians stays a flat link — it's a distinct
 * patient-adjacent audience, not a business "partner". The mobile drawer
 * carries the same set. */
const PARTNER_LINKS: ReadonlyArray<NavDropdownLink> = [
  { to: "/for-manufacturers", id: "directory.nav.for_manufacturers", default: "For Manufacturers" },
  { to: "/for-etcs", id: "directory.nav.for_etcs", default: "For ETCs" },
  { to: "/platform", id: "directory.nav.platform", default: "Operating platform" },
];

const COMPANY_LINKS: ReadonlyArray<NavDropdownLink> = [
  { to: "/about", id: "directory.nav.about", default: "About" },
  { to: "/how-it-works", id: "directory.nav.how_it_works", default: "How it works" },
  { to: "/faq", id: "directory.nav.faq", default: "Frequently asked" },
];

/**
 * Slice 4 § 10.1 — TopNav, flat comprehensive IA (Round 3 locked option C).
 *
 * Desktop: condensed flat-3 + 2 dropdowns. Full reachability of every footer
 * destination (minus Legal) in ≤2 clicks, without 10 flat links crowding the
 * bar:
 *   [wordmark]
 *     Conditions · Browse Treatments · ETCs · For Clinicians
 *   | Partners ▾  (For Manufacturers · For ETCs · Operating platform)
 *   | Company ▾   (About · How it works · Frequently asked)
 *                                                       [magnifier]
 *
 * The three patient links render at full ink weight; For Clinicians and the
 * two dropdown triggers render at ink-soft so the patient surface still leads.
 * For Clinicians stays flat (not in Partners) — it's a patient-adjacent
 * audience, not a business partner.
 *
 * Magnifier opens the in-place search overlay (NOT navigation to /search).
 *
 * Below 960px the inline nav collapses; chrome becomes
 * [wordmark] [magnifier] [hamburger]. The hamburger opens SecondaryNavDrawer
 * which carries all 10 links.
 */

export function TopNav() {
  const location = useLocation();
  const intl = useIntl();
  const { open } = useSearchOverlay();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isBrowse = location.pathname.startsWith("/browse");
  // /etcs (patient discovery) must not light up on /for-etcs (B2B).
  const isEtcs = location.pathname === "/etcs" || location.pathname.startsWith("/etcs/");
  const isConditions = location.pathname.startsWith("/conditions");
  const isForClinicians = location.pathname.startsWith("/for-clinicians");

  return (
    <header className="topnav">
      <div className="topnav__inner">
        <Link
          to="/"
          aria-label={intl.formatMessage({
            id: "directory.home.aria",
            defaultMessage: "Lewis home",
          })}
          className="topnav__logo"
        >
          <span className="serif topnav__logo-primary">Lewis.</span>
          <span className="serif topnav__logo-secondary italic">health</span>
        </Link>

        {/* Primary row: 3 patient links (full ink) + For Clinicians (secondary,
            patient-adjacent audience kept visible rather than buried). Per
            slice-5 terminology unification: "clinicians" is the umbrella term
            because § 50-12-102(4)'s statutory "health care provider" is
            Montana-Title-37-scoped and would mischaracterize the out-of-state
            referring audience this page also addresses. */}
        <nav aria-label="Primary navigation" className="topnav__group topnav__group--primary">
          <Link
            to="/conditions"
            className="topnav__link"
            aria-current={isConditions ? "page" : undefined}
            data-active={isConditions ? "true" : undefined}
          >
            <FormattedMessage id="directory.nav.conditions" defaultMessage="Conditions" />
          </Link>
          <Link
            to="/browse"
            className="topnav__link"
            aria-current={isBrowse ? "page" : undefined}
            data-active={isBrowse ? "true" : undefined}
          >
            <FormattedMessage id="directory.nav.browse" defaultMessage="Browse Treatments" />
          </Link>
          <Link
            to="/etcs"
            className="topnav__link"
            aria-current={isEtcs ? "page" : undefined}
            data-active={isEtcs ? "true" : undefined}
          >
            <FormattedMessage id="directory.nav.etcs" defaultMessage="ETCs" />
          </Link>
          <Link
            to="/for-clinicians"
            className="topnav__link topnav__link--secondary"
            aria-current={isForClinicians ? "page" : undefined}
            data-active={isForClinicians ? "true" : undefined}
          >
            <FormattedMessage id="directory.nav.for_clinicians" defaultMessage="For Clinicians" />
          </Link>
        </nav>

        <span className="topnav__sep" aria-hidden="true" />

        {/* Partner cluster — Manufacturers / ETCs / Operating platform. */}
        <NavDropdown
          label={{ id: "directory.nav.group.partners", default: "Partners" }}
          links={PARTNER_LINKS}
          currentPath={location.pathname}
        />

        <span className="topnav__sep" aria-hidden="true" />

        {/* Company / learn cluster — folded into a disclosure dropdown. */}
        <NavDropdown
          label={{ id: "directory.nav.group.company", default: "Company" }}
          links={COMPANY_LINKS}
          currentPath={location.pathname}
        />

        <span className="topnav__spacer" />

        <button
          type="button"
          onClick={() => open()}
          aria-label={intl.formatMessage({
            id: "directory.nav.search.aria",
            defaultMessage: "Search",
          })}
          className="topnav__magnifier"
        >
          <Magnifier />
        </button>

        {/* Mobile-only hamburger — collapses the whole nav into the drawer. */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label={intl.formatMessage({
            id: "directory.nav.menu.aria",
            defaultMessage: "Menu",
          })}
          aria-expanded={drawerOpen}
          aria-haspopup="dialog"
          className="topnav__hamburger"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
      </div>

      <SecondaryNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}
