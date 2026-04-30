import { useEffect, useState } from "react";

// Subscribes to a CSS media query and re-renders on match-state changes.
// SSR/test-safe: when window or matchMedia is missing, returns the explicit
// `defaultValue` (false unless overridden) and never registers a listener.
//
// Why a custom hook instead of a one-liner: the directory needs the same
// query result in two places at minimum (HeroSearchTypeahead's mobile branch
// and a future TopNav restructure). Centralizing the matchMedia subscription
// pattern keeps the listener-cleanup discipline consistent.

export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return defaultValue;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const mql = window.matchMedia(query);
    // Initialize from the live MediaQueryList in case the constructor branch
    // ran during SSR and the client is now hydrating with a different value.
    setMatches(mql.matches);

    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
