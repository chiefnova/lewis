import type { PublicConditionDetail } from "@lewis/shared/api/public";
import { useCallback, useEffect, useState } from "react";

import { ApiNetworkError, ApiSchemaError, publicApi } from "../../api/client";

export type ConditionDetailState = {
  condition?: PublicConditionDetail;
  loading: boolean;
  error?: Error;
  notFound: boolean;
};

export function useConditionDetail(slug: string) {
  const [state, setState] = useState<ConditionDetailState>({ loading: true, notFound: false });
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!slug) {
      setState({ loading: false, notFound: true });
      return;
    }
    const ctrl = new AbortController();
    setState({ loading: true, notFound: false });
    publicApi
      .getCondition(slug, { signal: ctrl.signal })
      .then((condition) => {
        if (ctrl.signal.aborted) return;
        setState({ condition, loading: false, notFound: false });
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
        // spinner doesn't hang forever.
        const normalized = new Error(typeof err === "string" ? err : "Unknown error");
        setState({ loading: false, notFound: false, error: normalized });
      });
    return () => ctrl.abort();
  }, [slug, retryToken]);

  const retry = useCallback(() => setRetryToken((n) => n + 1), []);
  return { ...state, retry };
}
