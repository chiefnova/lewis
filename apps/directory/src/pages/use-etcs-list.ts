import type { PublicEtcListResponse } from "@lewis/shared/api/public";
import { useCallback, useEffect, useState } from "react";

import { ApiNetworkError, ApiSchemaError, publicApi } from "../api/client";

// Mirrors apps/directory/src/pages/conditions/use-conditions-list.ts.
// Used by EtcsIndexPage (slice 4 § 16.1) — drives both the list view and
// the Mapbox map (lat/lng come back on the summary).

export type EtcsListState = {
  data?: PublicEtcListResponse;
  loading: boolean;
  error?: Error;
};

export function useEtcsList() {
  const [state, setState] = useState<EtcsListState>({ loading: true });
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ loading: true });
    publicApi
      .listEtcs({ signal: ctrl.signal })
      .then((data) => {
        if (ctrl.signal.aborted) return;
        setState({ data, loading: false });
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        if (err instanceof ApiNetworkError || err instanceof ApiSchemaError) {
          setState({ loading: false, error: err });
          return;
        }
        if (err instanceof Error) {
          if (err.name === "AbortError") return;
          setState({ loading: false, error: err });
          return;
        }
        const normalized = new Error(typeof err === "string" ? err : "Unknown error");
        setState({ loading: false, error: normalized });
      });
    return () => ctrl.abort();
  }, [retryToken]);

  const retry = useCallback(() => setRetryToken((n) => n + 1), []);
  return { ...state, retry };
}
