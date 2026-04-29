import * as Dialog from "@radix-ui/react-dialog";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";

import type { PublicSearchResponse } from "@lewis/shared/api/search";
import { ApiNetworkError, ApiSchemaError, publicApi } from "../api/client";
import { Magnifier } from "../components/icons";
import { RECENT_ON_LEWIS } from "./recent-on-lewis";
import { useDebouncedValue } from "./use-debounced-value";

/**
 * In-place search overlay (Surface 1 per directoryprd.md § 13.1).
 *
 * Behaviors:
 *  - Radix Dialog provides focus trap, scroll lock, ARIA roles, and Esc-to-
 *    close. Lazy-loaded by SearchContext so it doesn't ship in the
 *    above-the-fold bundle.
 *  - Debounced live-suggest (150ms). Each query goes through an
 *    AbortController; .abort() fires on the next keystroke so a slow
 *    response doesn't clobber a faster newer one.
 *  - Section order: Conditions → Treatments → ETCs (server-enforced; this
 *    component renders the array in shipped order without re-sorting).
 *  - Keyboard nav: ArrowDown/Up moves a virtual focus through the merged
 *    suggestion list, Enter activates, Esc closes (delegated to Dialog).
 *  - Submitting an unselected query routes to /search?q=… (Surface 2).
 *  - aria-live polite region announces result-count changes for screen
 *    readers (§ 29.3).
 */

type SearchSections = PublicSearchResponse["sections"];

const DEBOUNCE_MS = 150;

interface SearchOverlayProps {
  open: boolean;
  onClose(): void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const intl = useIntl();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const latestQueryRef = useRef("");

  const [q, setQ] = useState("");
  const [sections, setSections] = useState<SearchSections | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQ = useDebouncedValue(q.trim(), DEBOUNCE_MS);

  // Reset internal state every time the overlay closes so the next open
  // starts at the empty-query state.
  useEffect(() => {
    if (!open) {
      setQ("");
      setSections(null);
      setActiveIndex(-1);
      setError(null);
      setLoading(false);
      latestQueryRef.current = "";
    }
  }, [open]);

  // Issue the search whenever the debounced query changes. AbortController
  // ensures a stale response can't overwrite a newer one.
  useEffect(() => {
    if (!open) return;
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
  }, [debouncedQ, open, intl]);

  const handleQueryChange = useCallback((nextQ: string) => {
    latestQueryRef.current = nextQ.trim();
    setQ(nextQ);
    setSections(null);
    setActiveIndex(-1);
    setError(null);
    setLoading(nextQ.trim().length > 0);
  }, []);

  // Flatten the section arrays into one merged list to drive arrow-key
  // navigation. Order matches the visual rendering: conditions → treatments
  // → etcs. Each entry carries its href so Enter can navigate.
  const flatSuggestions = useMemo(() => {
    if (!sections) return [] as Array<{ key: string; href: string }>;
    return [
      ...sections.conditions.map((c) => ({ key: `condition:${c.slug}`, href: c.href })),
      ...sections.treatments.map((t) => ({ key: `treatment:${t.slug}`, href: t.href })),
      ...sections.etcs.map((e) => ({ key: `etc:${e.slug}`, href: e.href })),
    ];
  }, [sections]);

  const totalCount = flatSuggestions.length;

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
    [totalCount],
  );

  const handleResultClick = useCallback(
    (href: string) => {
      navigate(href);
      onClose();
    },
    [navigate, onClose],
  );

  // ARIA-live count message for screen readers. Updated whenever sections
  // change so a user pausing on each keystroke hears the new count.
  const announcement = useMemo(() => {
    if (sections === null) return "";
    return intl.formatMessage(
      { id: "directory.search.aria.results-announcement" },
      { count: totalCount },
    );
  }, [sections, totalCount, intl]);

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
          style={{
            position: "fixed",
            top: "8vh",
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(640px, calc(100vw - 32px))",
            maxHeight: "84vh",
            overflowY: "auto",
            background: "var(--paper)",
            borderRadius: 8,
            boxShadow: "0 24px 60px rgba(27,24,20,0.18)",
            zIndex: 101,
            padding: 0,
          }}
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
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label={intl.formatMessage({ id: "directory.search.placeholder" })}
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

          <div style={{ padding: "20px 24px 24px" }}>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function RecentOnLewis({ onClick }: { onClick(href: string): void }) {
  return (
    <div>
      <SectionHeading>
        <FormattedMessage id="directory.search.empty.heading" />
      </SectionHeading>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {RECENT_ON_LEWIS.map((entry) => (
          <li key={entry.href}>
            <button type="button" onClick={() => onClick(entry.href)} style={resultButtonStyle()}>
              {entry.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NoResults({ q, onClick }: { q: string; onClick(href: string): void }) {
  return (
    <div>
      <p
        style={{
          fontSize: 15,
          color: "var(--ink-soft)",
          marginBottom: 20,
          marginTop: 0,
        }}
      >
        <FormattedMessage id="directory.search.no-results.heading" values={{ query: q }} />
      </p>
      <SectionHeading>
        <FormattedMessage id="directory.search.no-results.fallback-heading" />
      </SectionHeading>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {RECENT_ON_LEWIS.map((entry) => (
          <li key={entry.href}>
            <button type="button" onClick={() => onClick(entry.href)} style={resultButtonStyle()}>
              {entry.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionedResults({
  sections,
  activeIndex,
  onSelect,
}: {
  sections: SearchSections;
  activeIndex: number;
  onSelect(href: string): void;
}) {
  // Compute virtual-focus offsets to map activeIndex to a single highlighted
  // row across the merged Conditions → Treatments → ETCs list.
  const conditionsOffset = 0;
  const treatmentsOffset = sections.conditions.length;
  const etcsOffset = treatmentsOffset + sections.treatments.length;

  return (
    <div>
      {sections.conditions.length > 0 && (
        <Section headingId="directory.search.section.conditions" count={sections.conditions.length}>
          {sections.conditions.map((hit, i) => (
            <SuggestionButton
              key={hit.slug}
              label={hit.name}
              meta={hit.state === "live" ? "Available now" : "Status: " + hit.state}
              active={activeIndex === conditionsOffset + i}
              onClick={() => onSelect(hit.href)}
            />
          ))}
        </Section>
      )}

      {sections.treatments.length > 0 && (
        <Section headingId="directory.search.section.treatments" count={sections.treatments.length}>
          {sections.treatments.map((hit, i) => (
            <SuggestionButton
              key={hit.slug}
              label={hit.name}
              meta={hit.drug ?? null}
              active={activeIndex === treatmentsOffset + i}
              onClick={() => onSelect(hit.href)}
            />
          ))}
        </Section>
      )}

      {sections.etcs.length > 0 && (
        <Section headingId="directory.search.section.etcs" count={sections.etcs.length}>
          {sections.etcs.map((hit, i) => (
            <SuggestionButton
              key={hit.slug}
              label={hit.name}
              meta={hit.city}
              active={activeIndex === etcsOffset + i}
              onClick={() => onSelect(hit.href)}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  headingId,
  count,
  children,
}: {
  headingId: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <SectionHeading>
        <FormattedMessage id={headingId} /> · {count}
      </SectionHeading>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>{children}</ul>
    </div>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "var(--ink-soft)",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function SuggestionButton({
  label,
  meta,
  active,
  onClick,
}: {
  label: string;
  meta: string | null;
  active: boolean;
  onClick(): void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        style={resultButtonStyle(active)}
        aria-current={active ? "true" : undefined}
      >
        <span style={{ fontSize: 15, color: "var(--ink)" }}>{label}</span>
        {meta ? (
          <span style={{ fontSize: 12.5, color: "var(--ink-soft)", marginLeft: 12 }}>{meta}</span>
        ) : null}
      </button>
    </li>
  );
}

function SkeletonRow() {
  return (
    <div
      aria-hidden="true"
      style={{
        height: 14,
        width: "60%",
        background: "rgba(27,24,20,0.06)",
        borderRadius: 4,
        marginTop: 6,
      }}
    />
  );
}

function resultButtonStyle(active = false): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    width: "100%",
    padding: "10px 12px",
    border: "none",
    borderRadius: 6,
    background: active ? "var(--paper-deep)" : "transparent",
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "var(--sans)",
  };
}
