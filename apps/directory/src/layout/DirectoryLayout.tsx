import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { AnnouncementStrip } from "../components/AnnouncementStrip";
import { TopNav } from "../components/TopNav";
import { Footer } from "../components/Footer";

export function DirectoryLayout() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  // Reset scroll AND focus on every navigation. Without focus reset, screen-
  // reader users keep their cursor wherever it landed on the previous route
  // and get no announcement of the new page; sighted keyboard users keep
  // focus on the link they just clicked, which is now a different page's
  // chrome. Programmatic focus on <main tabIndex={-1}> is the standard fix.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  return (
    <div>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      {location.pathname === "/" && <AnnouncementStrip />}
      <TopNav />
      <main id="main" key={location.pathname} tabIndex={-1} ref={mainRef}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
