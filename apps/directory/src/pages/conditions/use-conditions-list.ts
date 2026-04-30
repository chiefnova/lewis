import type { PublicConditionListResponse } from "@lewis/shared/api/public";
import { useCallback, useEffect, useState } from "react";

import { ApiNetworkError, ApiSchemaError, publicApi } from "../../api/client";

export type ConditionsListState = {
  data?: PublicConditionListResponse;
  loading: boolean;
  error?: Error;
};

export function useConditionsList() {
  const [state, setState] = useState<ConditionsListState>({ loading: true });
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ loading: true });
    publicApi
      .listConditions({ signal: ctrl.signal })
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
        // Non-Error rejection (e.g. a thrown string). Normalize so the
        // spinner doesn't hang forever.
        const normalized = new Error(typeof err === "string" ? err : "Unknown error");
        setState({ loading: false, error: normalized });
      });
    return () => ctrl.abort();
  }, [retryToken]);

  const retry = useCallback(() => setRetryToken((n) => n + 1), []);
  return { ...state, retry };
}
