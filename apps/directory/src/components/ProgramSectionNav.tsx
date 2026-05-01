import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useIntl } from "react-intl";

import type { PublicProgramDetail } from "@lewis/shared/api/public";

import { publicApi } from "../api/client";

// Slice 3 — directoryprd.md § 15. Sticky right rail that pairs with
// /programs/:slug per /design-shotgun Round 1 winner (Variant C, approved
// 2026-04-30).
//
// Top-to-bottom:
//   1. "On this page" — anchor links to body sections, with a scroll-spy
//      indicator on the active section.
//   2. "For patients" — primary CTA: Check my eligibility (the conversion).
//   3. "For physicians" — secondary CTAs: Refer this patient + Download brief.
//
// Patient CTA sits ABOVE the physician group because business priority is
// patient conversion; clinician actions are supporting per § 14.0 ("the
// door, not the conversion") + § 15 ("conversion surface").
//
// Hidden below 1100px via CSS in apps/directory/src/styles.css; the
// eligibility CTA falls back inline in the body's Who-this-is-for panel
// at that breakpoint (see .program-mobile-cta).

interface ProgramSectionNavProps {
  program: PublicProgramDetail;
  /** Section ids in render order. Drives the anchor list + scroll-spy. */
  sections: ReadonlyArray<{ id: string; labelId: string; defaultLabel: string }>;
}

export function ProgramSectionNav({ program, sections }: ProgramSectionNavProps) {
  const intl = useIntl();
  const [activeIdx, setActiveIdx] = useState(0);

  // Light scroll-spy. Pure DOM, no IntersectionObserver — the page has
  // ~6 sections so re-checking on scroll is cheap and the threshold
  // logic is more predictable than IO's rootMargin gymnastics.
  useEffect(() => {
    function onScroll() {
      const y = window.scrollY + 140; // 80px topnav + 60px breathing strip
      let active = 0;
      for (let i = 0; i < sections.length; i++) {
        const el = document.getElementById(sections[i]!.id);
        if (el && el.offsetTop <= y) active = i;
      }
      setActiveIdx(active);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  return (
    <aside
      className="program-section-nav"
      aria-label={intl.formatMessage({
        id: "directory.program.section-nav.aria",
        defaultMessage: "On this page",
      })}
    >
      <div className="psn-label">
        {intl.formatMessage({
          id: "directory.program.section-nav.heading",
          defaultMessage: "On this page",
        })}
      </div>
      <ol>
        {sections.map((s, i) => (
          <li key={s.id} className={i === activeIdx ? "is-active" : undefined}>
            <a href={`#${s.id}`}>
              {intl.formatMessage({ id: s.labelId, defaultMessage: s.defaultLabel })}
            </a>
          </li>
        ))}
      </ol>

      <div className="psn-cta-patient">
        <div className="psn-label">
          {intl.formatMessage({
            id: "directory.program.cta.patient.heading",
            defaultMessage: "For patients",
          })}
        </div>
        <Link className="pill pill-primary" to={`/eligibility/${program.slug}`}>
          {intl.formatMessage({
            id: "directory.program.cta.patient.eligibility",
            defaultMessage: "Check my eligibility →",
          })}
        </Link>
      </div>

      <div className="psn-cta-physician">
        <div className="psn-label">
          {intl.formatMessage({
            id: "directory.program.cta.physician.heading",
            defaultMessage: "For physicians",
          })}
        </div>
        <Link className="pill pill-outline" to={`/connect/${program.slug}?referrer=clinician`}>
          {intl.formatMessage({
            id: "directory.program.cta.physician.refer",
            defaultMessage: "Refer this patient",
          })}
        </Link>
        {/* Native <a download> — direct API hit, no JS. The browser handles
            the file download natively which is the most accessible path
            (works without analytics, without timeouts). */}
        <a className="pill pill-outline" href={publicApi.briefPdfUrl(program.slug)} download>
          {intl.formatMessage({
            id: "directory.program.cta.physician.brief",
            defaultMessage: "Download brief",
          })}
        </a>
      </div>
    </aside>
  );
}
