import type { PublicProgramFacets, PublicProgramListResponse } from "@lewis/shared/api/public";
import { useCallback, useEffect, useState } from "react";

import { ApiNetworkError, ApiSchemaError, publicApi, type ProgramListParams } from "../api/client";

// Slice 4 — drives the rewritten /browse with URL-state filters + Amazon-style
// facet counts. Both endpoints share the same query params (the facet handler
// computes counts against the same base WHERE), so this hook fetches them
// together with a single AbortController gating both requests.
//
// Filter changes debounce-trigger a fresh fetch via the params dep — the
// caller passes a stable params object (e.g. memoized off URL state) so the
// hook only fires when filters actually change.

// Slice 4 — drives the rewritten /browse with URL-state filters + Amazon-style
// facet counts. Both endpoints share the same query params (the facet handler
// computes counts against the same base WHERE), so this hook fetches them
// together with a single AbortController gating both requests. We keep the
// prior list/facets visible during in-flight refetches so filter changes
// don't blank the grid on every keystroke.
//
// Returns a flat object so callers can destructure cleanly. The caller passes
// a stable params shape (e.g. memoized off URL state) so the hook only
// fires when filters actually change.

export type ProgramsBrowseResult = {
  list: PublicProgramListResponse | undefined;
  facets: PublicProgramFacets | undefined;
  loading: boolean;
  error: Error | undefined;
  retry: () => void;
};

export function useProgramsBrowse(params: ProgramListParams): ProgramsBrowseResult {
  const [list, setList] = useState<PublicProgramListResponse | undefined>(undefined);
  const [facets, setFacets] = useState<PublicProgramFacets | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [retryToken, setRetryToken] = useState(0);

  const dep = JSON.stringify({
    conditions: [...(params.conditions ?? [])].sort(),
    forms: [...(params.forms ?? [])].sort(),
    phases: [...(params.phases ?? [])].sort(),
    etcs: [...(params.etcs ?? [])].sort(),
    manufacturers: [...(params.manufacturers ?? [])].sort(),
    sort: params.sort ?? "alphabetical",
    retryToken,
  });

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(undefined);
    Promise.all([
      publicApi.listPrograms({ signal: ctrl.signal, params }),
      publicApi.getProgramFacets({ signal: ctrl.signal, params }),
    ])
      .then(([newList, newFacets]) => {
        if (ctrl.signal.aborted) return;
        setList(newList);
        setFacets(newFacets);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        if (err instanceof ApiNetworkError || err instanceof ApiSchemaError) {
          setError(err);
          setLoading(false);
          return;
        }
        if (err instanceof Error) {
          if (err.name === "AbortError") return;
          setError(err);
          setLoading(false);
          return;
        }
        setError(new Error(typeof err === "string" ? err : "Unknown error"));
        setLoading(false);
      });
    return () => ctrl.abort();
    // dep is the canonical shape signature; params on its own would re-fire
    // on identity changes from the caller's URL parsing.
  }, [dep]);

  const retry = useCallback(() => setRetryToken((n) => n + 1), []);
  return { list, facets, loading, error, retry };
}
