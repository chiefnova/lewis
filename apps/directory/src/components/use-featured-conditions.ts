import type { PublicConditionDetail } from "@lewis/shared/api/public";
import { useEffect, useState } from "react";

import { ApiNetworkError, ApiSchemaError, publicApi } from "../api/client";
import {
  FEATURED_COMING_SOON_CONDITION_SLUG,
  FEATURED_CONDITION_SLUGS,
} from "../data/featured-conditions";

// Slice 4 § 11.4 — homepage FeaturedConditions carousel reads per-slug from
// /v1/public/conditions in parallel. The 4 live PN conditions render as
// active cards; the 5th (PTSD coming-soon) renders muted. If any fetch
// fails, that card is filtered out — the drift test
// (apps/directory/src/data/featured-conditions.test.ts) prevents this from
// happening in practice by asserting every featured slug exists in the seed.

export type FeaturedConditionsState = {
  live: ReadonlyArray<PublicConditionDetail>;
  comingSoon: PublicConditionDetail | null;
  loading: boolean;
  error?: Error;
};

export function useFeaturedConditions(): FeaturedConditionsState {
  const [state, setState] = useState<FeaturedConditionsState>({
    live: [],
    comingSoon: null,
    loading: true,
  });

  useEffect(() => {
    const ctrl = new AbortController();
    const allSlugs = [...FEATURED_CONDITION_SLUGS, FEATURED_COMING_SOON_CONDITION_SLUG];
    Promise.all(
      allSlugs.map((slug) =>
        publicApi
          .getCondition(slug, { signal: ctrl.signal })
          .then((detail) => ({ slug, detail }))
          .catch((err: unknown) => {
            // Per-slug failure: log via console (the directory rules forbid
            // PHI in console — slug is public, not PHI). The carousel just
            // omits the failed card. A real outage produces 5 console
            // errors in dev — visibility without crashing the homepage.
            console.warn(`useFeaturedConditions: failed to load ${slug}`, err);
            return { slug, detail: null as PublicConditionDetail | null };
          }),
      ),
    )
      .then((results) => {
        if (ctrl.signal.aborted) return;
        const liveResults = results
          .filter((r) => FEATURED_CONDITION_SLUGS.includes(r.slug as never))
          .map((r) => r.detail)
          .filter((d): d is PublicConditionDetail => d !== null);
        const comingSoonResult = results.find(
          (r) => r.slug === FEATURED_COMING_SOON_CONDITION_SLUG,
        );
        setState({
          live: liveResults,
          comingSoon: comingSoonResult?.detail ?? null,
          loading: false,
        });
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        // Promise.all only rejects if a non-Error throws synchronously
        // (which the per-slug catch above prevents). Defensive shim.
        if (err instanceof ApiNetworkError || err instanceof ApiSchemaError) {
          setState({ live: [], comingSoon: null, loading: false, error: err });
          return;
        }
        if (err instanceof Error && err.name !== "AbortError") {
          setState({ live: [], comingSoon: null, loading: false, error: err });
          return;
        }
      });
    return () => ctrl.abort();
  }, []);

  return state;
}
