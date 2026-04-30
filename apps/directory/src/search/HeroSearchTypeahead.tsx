import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";

import { Magnifier } from "../components/icons";
import { useMediaQuery } from "../hooks/use-media-query";
import {
  NoResults,
  RecentOnLewis,
  SectionedResults,
  SkeletonRow,
  optionIdFor,
} from "./SearchSuggestions";
import { useSearchOverlay } from "./SearchContext";
import { useTypeaheadSearch } from "./use-typeahead-search";

/**
 * Homepage hero typeahead — Surface 1.5 per directoryprd.md § 13. Inline
 * popover anchored to the hero search input on desktop; on viewports below
 * 768px the input acts as a "decoy" that opens the existing SearchOverlay
 * (Surface 1) full-screen, forwarding the typed value so the patient never
 * loses their first character.
 *
 * Why a popover and not a dialog:
 *  - The hero is calm/editorial. Dimming the page on first keystroke fights
 *    that.
 *  - Patients hovering on the hero typing their condition want to see
 *    suggestions in-context, not be ripped out into a modal.
 *  - On mobile, a popover anchored above a soft keyboard gets cramped
 *    (~200px of vertical room). The dialog uses the whole screen and breathes.
 *
 * A11y: WAI-ARIA combobox + listbox pattern. Focus stays on the input;
 * arrow keys move a virtual focus tracked by aria-activedescendant; Enter
 * activates the highlighted option (or, with no selection, navigates to the
 * /search?q=… results page); Escape closes the popover. Click outside the
 * container closes it. Suggestion buttons fire on pointerDown so they win
 * the race against input blur.
 *
 * Renders identical sections to SearchOverlay (Conditions → Treatments →
 * ETCs) using the same shared rendering primitives, so screen-reader output
 * and visual hierarchy are consistent across surfaces.
 */

interface HeroSearchTypeaheadProps {
  /** Submitted to /search?q=… when the user hits Enter without selecting an option. */
  onSearch?(query: string): void;
}

const MOBILE_QUERY = "(max-width: 768px)";

export function HeroSearchTypeahead({ onSearch }: HeroSearchTypeaheadProps = {}) {
  const intl = useIntl();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const { open: openOverlay } = useSearchOverlay();

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Per-instance listbox id keeps a11y wiring clean if the hero typeahead and
  // the overlay are both in the DOM (the overlay also has a listbox; distinct
  // ids prevent aria-controls collision).
  const reactId = useId();
  const listboxId = `lewis-hero-search-listbox-${reactId}`;

  // Active = the popover is showing suggestions/loading/empty/error. We do
  // NOT open on focus alone because that surprises returning users who
  // tabbed into the input. Open on first keystroke instead.
  const [open, setOpen] = useState(false);

  // The popover renders via React Portal into document.body so it escapes
  // the hero <section>'s overflow:hidden boundary (the hero clips its own
  // decorative pill graphics; that clip would otherwise crop the dropdown).
  // Position is computed at runtime from the container's bounding rect so
  // the popover stays glued to the input across scroll + resize.
  const [popoverRect, setPopoverRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const enabled = !isMobile && open;
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
  } = useTypeaheadSearch({ enabled });

  // ---- Mobile decoy path ----------------------------------------------------
  // The input is read-only on mobile to avoid the keyboard popping up before
  // we open the overlay. Tapping (focus) hands off to the overlay, forwarding
  // any value the input may already hold (rare on mobile due to readOnly, but
  // covers desktop→mobile resize-while-typing and external-keyboard input).
  const handleMobileFocus = useCallback(() => {
    if (!isMobile) return;
    const seed = inputRef.current?.value ?? "";
    inputRef.current?.blur();
    openOverlay(seed);
  }, [isMobile, openOverlay]);

  // ---- Desktop popover behavior --------------------------------------------
  // Open on first non-empty keystroke; close when emptied.
  const handleQueryChange = useCallback(
    (next: string) => {
      setQ(next);
      if (next.trim().length === 0) {
        setOpen(false);
      } else if (!open) {
        setOpen(true);
      }
    },
    [setQ, open, setOpen],
  );

  // Click outside the container OR the popover closes the dropdown. We listen
  // on pointerdown (capture) so the close fires before any click handlers
  // inside the suggestion list resolve — but we explicitly skip events
  // inside the container ref OR the portaled popover to keep suggestion-
  // clicks alive. The popover is identified via a data attribute since it's
  // outside the container's DOM subtree (rendered into document.body).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (containerRef.current && target && containerRef.current.contains(target)) return;
      if (target && target.closest('[data-hero-typeahead-popover="true"]')) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, setOpen]);

  // Compute the popover's anchor point (document-relative top-left + width)
  // from the search container's bounding rect. Re-runs on open + on every
  // resize/scroll while open so the popover tracks the input. useLayoutEffect
  // (not useEffect) so the position lands before paint and the popover
  // doesn't flash at (0,0) on first frame.
  useLayoutEffect(() => {
    if (!open || isMobile) {
      setPopoverRect(null);
      return;
    }
    const compute = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setPopoverRect({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [open, isMobile]);

  const handleResultClick = useCallback(
    (href: string) => {
      navigate(href);
      setOpen(false);
    },
    [navigate, setOpen],
  );

  const submitFreeText = useCallback(
    (trimmed: string) => {
      if (trimmed.length === 0) return;
      if (onSearch) {
        onSearch(trimmed);
      } else {
        navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      }
      setOpen(false);
    },
    [onSearch, navigate, setOpen],
  );

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = q.trim();

      // Mobile path — submit always goes to /search?q=… because the popover
      // never opens here.
      if (isMobile) {
        submitFreeText(trimmed);
        return;
      }

      // Highlighted suggestion wins.
      if (activeIndex >= 0 && activeIndex < flatSuggestions.length) {
        const target = flatSuggestions[activeIndex];
        if (target) {
          handleResultClick(target.href);
          return;
        }
      }
      submitFreeText(trimmed);
    },
    [q, isMobile, activeIndex, flatSuggestions, submitFreeText, handleResultClick],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (isMobile) return;
      if (e.key === "Escape") {
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!open && q.trim().length > 0) setOpen(true);
        setActiveIndex((i) => (totalCount === 0 ? -1 : (i + 1) % totalCount));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => {
          if (totalCount === 0) return -1;
          return i <= 0 ? totalCount - 1 : i - 1;
        });
      }
    },
    [isMobile, open, q, totalCount, setActiveIndex, setOpen],
  );

  const activeOptionId = useMemo(() => {
    if (activeIndex < 0 || activeIndex >= flatSuggestions.length) return undefined;
    const target = flatSuggestions[activeIndex];
    return target ? optionIdFor(target.key) : undefined;
  }, [activeIndex, flatSuggestions]);

  const showPopover = !isMobile && open;
  const expanded = showPopover && sections !== null && totalCount > 0;

  return (
    <div ref={containerRef} className="hero-typeahead">
      <form className="search-pill" onSubmit={handleSubmit} role="search">
        <span className="icon" aria-hidden="true">
          <Magnifier size={18} />
        </span>
        <div className="search-pill__input">
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={handleMobileFocus}
            onKeyDown={handleKeyDown}
            // Re-open on click if the popover was closed via outside-click but
            // the input still has a query in it.
            onClick={() => {
              if (!isMobile && q.trim().length > 0 && !open) setOpen(true);
            }}
            // readOnly on mobile prevents the soft keyboard from popping up
            // before we open the overlay. focus → blur → overlay open.
            readOnly={isMobile}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            role="combobox"
            aria-label={intl.formatMessage({ id: "directory.home.search.aria" })}
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={listboxId}
            {...(activeOptionId ? { "aria-activedescendant": activeOptionId } : {})}
            placeholder={intl.formatMessage({ id: "directory.home.search.placeholder" })}
          />
        </div>
        <button type="submit" className="pill pill-primary">
          <FormattedMessage id="directory.home.search.submit" defaultMessage="Browse" />
        </button>
      </form>

      {/* aria-live polite region — separate from the popover so the count is
          announced even when the popover is mid-fade-in. */}
      <div aria-live="polite" className="visually-hidden">
        {announcement}
      </div>

      {showPopover && popoverRect && typeof document !== "undefined"
        ? createPortal(
            <div
              data-hero-typeahead-popover="true"
              className="hero-typeahead-popover"
              role="presentation"
              style={{
                top: popoverRect.top,
                left: popoverRect.left,
                width: popoverRect.width,
              }}
            >
              {error ? (
                <p style={{ color: "var(--ink-soft)", fontSize: 14, padding: "16px 20px" }}>
                  {error}
                </p>
              ) : q.trim().length === 0 && sections === null ? (
                <div style={{ padding: "16px 20px 20px" }}>
                  <RecentOnLewis onClick={handleResultClick} />
                </div>
              ) : sections === null ? null : totalCount === 0 ? (
                <div style={{ padding: "16px 20px 20px" }}>
                  <NoResults q={debouncedQ} onClick={handleResultClick} />
                </div>
              ) : (
                <div style={{ padding: "16px 20px 20px" }}>
                  <SectionedResults
                    sections={sections}
                    activeIndex={activeIndex}
                    onSelect={handleResultClick}
                    listboxId={listboxId}
                  />
                </div>
              )}
              {loading && sections === null ? (
                <div style={{ padding: "0 20px 16px" }}>
                  <SkeletonRow />
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
