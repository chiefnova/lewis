import { useEffect, useState } from "react";

// Scrollspy hook for the /conditions/:slug detail page TOC. Observes each
// rendered <section id="..."> and returns the id closest to the top of the
// readable area. Respects the sticky TopNav (80px) + TOC top-offset (104px)
// via the rootMargin: a section becomes "active" when its top crosses
// roughly the bottom of the header, and de-activates when its top has
// scrolled to ~40% of the viewport.
//
// Defaults to the first id when nothing is intersecting (e.g. before the
// reader has scrolled past the hero card).

export function useScrollSpy(
  ids: ReadonlyArray<string>,
  rootMargin: string = "-120px 0px -60% 0px",
): string | null {
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    if (ids.length === 0) {
      setActiveId(null);
      return;
    }
    setActiveId(ids[0] ?? null);

    // Guard for environments without IntersectionObserver — jsdom (the
    // vitest test env) doesn't ship it, and very old browsers don't either.
    // Falling back to the first id is correct: the page just renders with
    // a static highlight and no scroll-tracking, which is fine for tests
    // and degrades safely on legacy clients.
    if (typeof IntersectionObserver === "undefined") return;

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const top = visible[0];
        if (top) {
          setActiveId(top.target.id);
        }
      },
      { rootMargin, threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids, rootMargin]);

  return activeId;
}
