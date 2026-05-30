import type { PublicProgramDetail } from "@lewis/shared/api/public";
import { useCallback, useEffect, useState } from "react";

import { ApiNetworkError, ApiSchemaError, publicApi } from "../api/client";

// Mirrors apps/directory/src/pages/conditions/use-condition-detail.ts. Direct
// fetch + AbortController + retry. No React Query here — see slice 3 plan
// architecture decision 10. The plan's hook lives at the page level
// (apps/directory/src/pages/) rather than in pages/programs/ because there's
// no programs/ directory yet; the rewritten TreatmentDetailPage stays in
// pages/ alongside its peers.

export type ProgramDetailState = {
  program?: PublicProgramDetail;
  loading: boolean;
  error?: Error;
  notFound: boolean;
};

export function useProgramDetail(slug: string) {
  const [state, setState] = useState<ProgramDetailState>({ loading: true, notFound: false });
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!slug) {
      setState({ loading: false, notFound: true });
      return;
    }
    const ctrl = new AbortController();
    setState({ loading: true, notFound: false });
    publicApi
      .getProgram(slug, { signal: ctrl.signal })
      .then((program) => {
        if (ctrl.signal.aborted) return;
        setState({ program, loading: false, notFound: false });
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        if (err instanceof ApiNetworkError && err.status === 404) {
          setState({ loading: false, notFound: true });
          return;
        }
        if (err instanceof ApiNetworkError || err instanceof ApiSchemaError) {
          setState({ loading: false, notFound: false, error: err });
          return;
        }
        if (err instanceof Error) {
          if (err.name === "AbortError") return;
          setState({ loading: false, notFound: false, error: err });
          return;
        }
        // Non-Error rejection (e.g. a thrown string). Normalize so the
        // spinner doesn't hang forever — mirrors useConditionDetail.
        const normalized = new Error(typeof err === "string" ? err : "Unknown error");
        setState({ loading: false, notFound: false, error: normalized });
      });
    return () => ctrl.abort();
  }, [slug, retryToken]);

  const retry = useCallback(() => setRetryToken((n) => n + 1), []);
  return { ...state, retry };
}
