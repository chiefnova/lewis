import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useIntl } from "react-intl";

import type { PublicSearchResponse } from "@lewis/shared/api/search";
import { ApiNetworkError, ApiSchemaError, publicApi } from "../api/client";
import { useDebouncedValue } from "./use-debounced-value";

// Shared search-fetching machinery for both Surface 1 (SearchOverlay) and the
// homepage hero typeahead. Owns: query state, debounce, AbortController-based
// stale-response protection, sectioned results, error state, flat-suggestion
// list for keyboard nav, ARIA-live announcement string.
//
// Default debounce is 80ms — tight enough that the first letter triggers a
// request that lands within ~120ms total (debounce + RTT), which reads as
// "instant" to a user. Tighter than 60ms causes unnecessary thrash on rapid
// typing; 150ms+ feels visibly laggy on the first character. Callers can
// override per surface (the legacy overlay used 150ms; both surfaces share
// 80ms now).

export type SearchSections = PublicSearchResponse["sections"];

export interface FlatSuggestion {
  key: string;
  href: string;
}

export interface UseTypeaheadSearchOptions {
  /** Whether the surface is mounted/active. When false, no fetches fire. */
  enabled: boolean;
  /** Debounce window in ms. Defaults to 80. */
  debounceMs?: number;
}

export interface UseTypeaheadSearchResult {
  q: string;
  setQ: (next: string) => void;
  /** The trimmed, debounced query that drove the last fetch. */
  debouncedQ: string;
  sections: SearchSections | null;
  loading: boolean;
  error: string | null;
  activeIndex: number;
  setActiveIndex: Dispatch<SetStateAction<number>>;
  flatSuggestions: ReadonlyArray<FlatSuggestion>;
  totalCount: number;
  /** Live-region string announcing the result count. Empty before first fetch. */
  announcement: string;
  /** Resets internal state. Call when the surface closes. */
  reset: () => void;
}

const DEFAULT_DEBOUNCE_MS = 80;

export function useTypeaheadSearch({
  enabled,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseTypeaheadSearchOptions): UseTypeaheadSearchResult {
  const intl = useIntl();
  const latestQueryRef = useRef("");

  const [q, setQInternal] = useState("");
  const [sections, setSections] = useState<SearchSections | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQ = useDebouncedValue(q.trim(), debounceMs);

  const setQ = useCallback((next: string) => {
    latestQueryRef.current = next.trim();
    setQInternal(next);
    // Optimistic loading flip — the debounced fetch effect will replace this
    // with real loading state on the next tick. The result: even before the
    // first response lands, the user sees a "thinking" affordance from the
    // very first keystroke.
    setSections(null);
    setActiveIndex(-1);
    setError(null);
    setLoading(next.trim().length > 0);
  }, []);

  const reset = useCallback(() => {
    setQInternal("");
    setSections(null);
    setActiveIndex(-1);
    setError(null);
    setLoading(false);
    latestQueryRef.current = "";
  }, []);

  // When the surface deactivates, drop all state. Callers that need to keep
  // state across activations should not toggle `enabled`.
  useEffect(() => {
    if (!enabled) reset();
  }, [enabled, reset]);

  // Fire the fetch on every debounced query change. AbortController + latest-
  // query-ref combine for two-layer stale-response protection: the controller
  // cancels in-flight transport, and the ref check prevents an already-resolved
  // older response from clobbering newer state if it sneaks through.
  useEffect(() => {
    if (!enabled) return;
    if (debouncedQ.length === 0) {
      setSections(null);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    const query = debouncedQ;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    publicApi
      .searchPublic(query, { signal: controller.signal })
      .then((response) => {
        if (!active || latestQueryRef.current !== query) return;
        setSections(response.sections);
        setLoading(false);
        setActiveIndex(-1);
      })
      .catch((err: unknown) => {
        if (!active || (err instanceof DOMException && err.name === "AbortError")) return;
        if (err instanceof ApiNetworkError || err instanceof ApiSchemaError) {
          setError(intl.formatMessage({ id: "directory.search.error" }));
        } else {
          setError(intl.formatMessage({ id: "directory.search.error" }));
        }
        setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [debouncedQ, enabled, intl]);

  // Flatten the section arrays into one merged list to drive arrow-key
  // navigation. Order matches the visual rendering: conditions → treatments
  // → etcs (server-enforced; we don't re-sort here).
  const flatSuggestions = useMemo<ReadonlyArray<FlatSuggestion>>(() => {
    if (!sections) return [];
    return [
      ...sections.conditions.map((c) => ({ key: `condition:${c.slug}`, href: c.href })),
      ...sections.treatments.map((t) => ({ key: `treatment:${t.slug}`, href: t.href })),
      ...sections.etcs.map((e) => ({ key: `etc:${e.slug}`, href: e.href })),
    ];
  }, [sections]);

  const totalCount = flatSuggestions.length;

  const announcement = useMemo(() => {
    if (sections === null) return "";
    return intl.formatMessage(
      { id: "directory.search.aria.results-announcement" },
      { count: totalCount },
    );
  }, [sections, totalCount, intl]);

  return {
    q,
    setQ,
    debouncedQ,
    sections,
    loading,
    error,
    activeIndex,
    setActiveIndex,
    flatSuggestions,
    totalCount,
    announcement,
    reset,
  };
}
