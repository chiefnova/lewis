import * as Dialog from "@radix-ui/react-dialog";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";

import { Magnifier } from "../components/icons";
import {
  LISTBOX_ID,
  NoResults,
  RecentOnLewis,
  SectionedResults,
  SkeletonRow,
  optionIdFor,
} from "./SearchSuggestions";
import { useTypeaheadSearch } from "./use-typeahead-search";

/**
 * In-place search overlay (Surface 1 per directoryprd.md § 13.1).
 *
 * Behaviors:
 *  - Radix Dialog provides focus trap, scroll lock, ARIA roles, and Esc-to-
 *    close. Lazy-loaded by SearchContext so it doesn't ship in the
 *    above-the-fold bundle.
 *  - Search-fetching machinery is shared with HeroSearchTypeahead via
 *    useTypeaheadSearch (debounce, AbortController, latest-query-wins).
 *  - Section order: Conditions → Treatments → ETCs (server-enforced; the
 *    SectionedResults helper renders the array in shipped order).
 *  - Keyboard nav: ArrowDown/Up moves a virtual focus through the merged
 *    suggestion list, Enter activates, Esc closes (delegated to Dialog).
 *  - Submitting an unselected query routes to /search?q=… (Surface 2).
 *  - aria-live polite region announces result-count changes for screen
 *    readers (§ 29.3).
 *
 * Initial query: callers can pass `initialQuery` to seed the input — used by
 * the homepage hero typeahead's mobile branch which forwards the typed value
 * into the overlay so the patient doesn't lose their first character.
 */

interface SearchOverlayProps {
  open: boolean;
  onClose(): void;
  /** Optional seed value for the input. Applied on next open. */
  initialQuery?: string;
}

export function SearchOverlay({ open, onClose, initialQuery }: SearchOverlayProps) {
  const intl = useIntl();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const {
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
  } = useTypeaheadSearch({ enabled: open });

  // Seed the input from `initialQuery` on every transition into the open state.
  // Only writes once per open; subsequent edits go through setQ.
  const seededRef = useRef(false);
  useEffect(() => {
    if (open) {
      if (!seededRef.current) {
        if (initialQuery && initialQuery.length > 0) setQ(initialQuery);
        seededRef.current = true;
      }
    } else {
      seededRef.current = false;
    }
  }, [open, initialQuery, setQ]);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = q.trim();
      if (activeIndex >= 0 && activeIndex < flatSuggestions.length) {
        const target = flatSuggestions[activeIndex];
        if (target) {
          navigate(target.href);
          onClose();
          return;
        }
      }
      if (trimmed.length > 0) {
        navigate(`/search?q=${encodeURIComponent(trimmed)}`);
        onClose();
      }
    },
    [q, activeIndex, flatSuggestions, navigate, onClose],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (totalCount === 0 ? -1 : (i + 1) % totalCount));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => {
          if (totalCount === 0) return -1;
          return i <= 0 ? totalCount - 1 : i - 1;
        });
      }
    },
    [totalCount, setActiveIndex],
  );

  const handleResultClick = useCallback(
    (href: string) => {
      navigate(href);
      onClose();
    },
    [navigate, onClose],
  );

  const activeOptionId = useMemo(() => {
    if (activeIndex < 0 || activeIndex >= flatSuggestions.length) return undefined;
    const target = flatSuggestions[activeIndex];
    return target ? optionIdFor(target.key) : undefined;
  }, [activeIndex, flatSuggestions]);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(27,24,20,0.4)",
            zIndex: 100,
          }}
        />
        <Dialog.Content
          aria-label={intl.formatMessage({ id: "directory.search.overlay.title" })}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
          style={
            {
              // Anchored auto-height palette at optical center. The empty
              // modal (~260px tall) lands so its visual center sits ~60px
              // above viewport mid — humans perceive "centered" as slightly
              // above geometric center (long-standing design heuristic; see
              // Apple, Material Design vertical-rhythm specs). Growth
              // happens downward only — the input never moves between
              // renders, so no "jump" between keystrokes. The clamp
              // `max(8vh, ...)` protects very short viewports where
              // calc(50vh - 200px) would overlap the top edge. The
              // max-height cap respects the viewport bottom (32px breathing
              // room) so the modal can never overflow off-screen — when
              // content exceeds the cap, the inner content region scrolls
              // instead. CSS custom property keeps the top expression DRY
              // between top + max-height.
              "--lewis-search-top": "max(8vh, calc(50vh - 200px))",
              position: "fixed",
              top: "var(--lewis-search-top)",
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(640px, calc(100vw - 32px))",
              maxHeight: "min(84vh, calc(100vh - var(--lewis-search-top) - 32px))",
              display: "flex",
              flexDirection: "column",
              background: "var(--paper)",
              borderRadius: 8,
              boxShadow: "0 24px 60px rgba(27,24,20,0.18)",
              zIndex: 101,
              padding: 0,
              // Outer hidden so the inner content region (the scrollable
              // flex-1 child) is the only scrollbar surface.
              overflow: "hidden",
            } as CSSProperties
          }
        >
          <Dialog.Title className="visually-hidden">
            <FormattedMessage id="directory.search.overlay.title" />
          </Dialog.Title>
          <Dialog.Description className="visually-hidden">
            <FormattedMessage id="directory.search.overlay.description" />
          </Dialog.Description>

          <form
            onSubmit={handleSubmit}
            role="search"
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "20px 24px",
              borderBottom: "1px solid rgba(27,24,20,0.08)",
            }}
          >
            <span aria-hidden="true" style={{ color: "var(--ink-soft)", display: "inline-flex" }}>
              <Magnifier size={18} />
            </span>
            <input
              ref={inputRef}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              role="combobox"
              aria-label={intl.formatMessage({ id: "directory.search.placeholder" })}
              aria-autocomplete="list"
              aria-expanded={sections !== null && totalCount > 0}
              aria-controls={LISTBOX_ID}
              {...(activeOptionId ? { "aria-activedescendant": activeOptionId } : {})}
              placeholder={intl.formatMessage({ id: "directory.search.placeholder" })}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontFamily: "var(--sans)",
                fontSize: 17,
                background: "transparent",
                color: "var(--ink)",
              }}
            />
            <button
              type="button"
              onClick={onClose}
              className="pill pill-outline pill-sm"
              aria-label={intl.formatMessage({ id: "directory.search.close" })}
            >
              <FormattedMessage id="directory.search.close" />
            </button>
          </form>

          <div aria-live="polite" className="visually-hidden">
            {announcement}
          </div>

          {/* Scrollable content region. flex: 1 fills remaining vertical
              space inside the fixed-height dialog; min-height: 0 is the
              standard fix that lets a flex child with overflow shrink below
              its content's natural height (without it, overflow:auto never
              engages because the child grows to accommodate content). */}
          <div
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              overflowY: "auto",
              padding: "20px 24px 24px",
            }}
          >
            {/* Keyed on the rendered BUCKET (recent / pending / results /
                no-results / error), not on the query string. Without this,
                every keystroke during the pending state remounts the
                wrapper and re-fires the 120ms fade — visibly janky on
                rapid typers. Bucket-only keying means the fade triggers
                on real content transitions (loading → results, results
                → no-results) and content within a bucket updates in place
                without re-animating. */}
            <div
              key={
                error
                  ? "error"
                  : sections === null
                    ? q.trim().length === 0
                      ? "recent"
                      : "pending"
                    : totalCount === 0
                      ? "no-results"
                      : "results"
              }
              className="search-overlay-results"
            >
              {error ? (
                <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>{error}</p>
              ) : q.trim().length === 0 && sections === null ? (
                <RecentOnLewis onClick={handleResultClick} />
              ) : sections === null ? null : totalCount === 0 ? (
                <NoResults q={debouncedQ} onClick={handleResultClick} />
              ) : (
                <SectionedResults
                  sections={sections}
                  activeIndex={activeIndex}
                  onSelect={handleResultClick}
                />
              )}
              {loading && sections === null ? <SkeletonRow /> : null}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
