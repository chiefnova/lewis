import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const SearchOverlay = lazy(() =>
  import("./SearchOverlay").then((m) => ({ default: m.SearchOverlay })),
);

interface SearchOverlayContextValue {
  isOpen: boolean;
  /** Open the overlay. Optionally seed the input with `initialQuery` —
   * used by the homepage hero typeahead's mobile branch to forward
   * the typed value into the full-screen overlay so the patient
   * doesn't lose their first character. */
  open(initialQuery?: string): void;
  close(): void;
}

const SearchOverlayContext = createContext<SearchOverlayContextValue | undefined>(undefined);

/**
 * Provider that owns the open/closed state of the in-place search overlay
 * (Surface 1 per directoryprd.md § 13.1). Lives at the layout level so the
 * overlay persists across client-side navigation. The overlay code itself
 * (Radix Dialog + suggestion list + debounced fetcher) is lazy-loaded — it
 * only ships in the bundle once the user opens it for the first time. This
 * keeps the always-mounted TopNav above-the-fold weight at zero overlay
 * cost on initial page load.
 */
export function SearchOverlayProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState<string>("");

  const open = useCallback((seedQuery?: string) => {
    setInitialQuery(seedQuery ?? "");
    setIsOpen(true);
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
    // Don't clear initialQuery here — SearchOverlay's seededRef logic
    // already gates against re-applying it, and clearing on close would
    // race with the close transition. The next open() call overwrites
    // initialQuery before isOpen flips back to true.
  }, []);

  const value = useMemo<SearchOverlayContextValue>(
    () => ({ isOpen, open, close }),
    [isOpen, open, close],
  );

  return (
    <SearchOverlayContext.Provider value={value}>
      {children}
      {/* Suspense fallback intentionally empty — the chunk loads in <100ms
          on a warm cache, and the magnifier press is the user's signal of
          intent. A flash of empty state is preferable to a phantom loader. */}
      {isOpen ? (
        <Suspense fallback={null}>
          <SearchOverlay open={isOpen} onClose={close} initialQuery={initialQuery} />
        </Suspense>
      ) : null}
    </SearchOverlayContext.Provider>
  );
}

export function useSearchOverlay(): SearchOverlayContextValue {
  const ctx = useContext(SearchOverlayContext);
  if (!ctx) {
    throw new Error("useSearchOverlay must be used inside <SearchOverlayProvider>");
  }
  return ctx;
}
