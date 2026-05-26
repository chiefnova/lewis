import type { PublicEtcDetail } from "@lewis/shared/api/public";
import { useCallback, useEffect, useState } from "react";

import { ApiNetworkError, ApiSchemaError, publicApi } from "../api/client";

// Mirrors apps/directory/src/pages/use-program-detail.ts. Direct fetch +
// AbortController + retry. No React Query — see slice 3 plan architecture
// decision 10. Used by EtcProfilePage post-rewrite.

export type EtcDetailState = {
  etc?: PublicEtcDetail;
  loading: boolean;
  error?: Error;
  notFound: boolean;
};

export function useEtcDetail(slug: string) {
  const [state, setState] = useState<EtcDetailState>({ loading: true, notFound: false });
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!slug) {
      setState({ loading: false, notFound: true });
      return;
    }
    const ctrl = new AbortController();
    setState({ loading: true, notFound: false });
    publicApi
      .getEtc(slug, { signal: ctrl.signal })
      .then((etc) => {
        if (ctrl.signal.aborted) return;
        setState({ etc, loading: false, notFound: false });
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
        const normalized = new Error(typeof err === "string" ? err : "Unknown error");
        setState({ loading: false, notFound: false, error: normalized });
      });
    return () => ctrl.abort();
  }, [slug, retryToken]);

  const retry = useCallback(() => setRetryToken((n) => n + 1), []);
  return { ...state, retry };
}
