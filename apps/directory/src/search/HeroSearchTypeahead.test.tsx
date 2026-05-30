// @vitest-environment jsdom
import type { PublicSearchResponse } from "@lewis/shared/api/search";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../messages/en.json";
import { HeroSearchTypeahead } from "./HeroSearchTypeahead";
import { SearchOverlayProvider } from "./SearchContext";

// Stub the public API so the hook fetches resolve synchronously.
const apiMock = vi.hoisted(() => ({
  searchPublic: vi.fn<(...args: unknown[]) => Promise<PublicSearchResponse>>(),
}));

vi.mock("../api/client", () => ({
  ApiNetworkError: class ApiNetworkError extends Error {},
  ApiSchemaError: class ApiSchemaError extends Error {},
  publicApi: { searchPublic: apiMock.searchPublic },
}));

function searchResponse(overrides: Partial<PublicSearchResponse> = {}): PublicSearchResponse {
  return {
    query: "neuro",
    sections: {
      conditions: [
        {
          type: "condition",
          slug: "diabetic-peripheral-neuropathy",
          name: "Diabetic peripheral neuropathy",
          state: "live",
          programCount: 1,
          href: "/conditions/diabetic-peripheral-neuropathy",
        },
      ],
      treatments: [
        {
          type: "treatment",
          slug: "wst-057",
          name: "WST-057",
          drug: "WST-057",
          manufacturer: null,
          available: true,
          href: "/programs/wst-057",
        },
      ],
      etcs: [
        {
          type: "etc",
          slug: "big-sky",
          name: "Big Sky Experimental Treatment Center",
          city: "Bozeman, MT",
          href: "/etcs/big-sky",
        },
      ],
    },
    totals: { conditions: 1, treatments: 1, etcs: 1 },
    ...overrides,
  };
}

function setMatchMedia(matchesMobile: boolean) {
  // Override matchMedia for the (max-width: 768px) query the component reads.
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("max-width: 768px") ? matchesMobile : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

function mount() {
  return render(
    <IntlProvider locale="en" messages={messages}>
      <MemoryRouter>
        <SearchOverlayProvider>
          <HeroSearchTypeahead />
        </SearchOverlayProvider>
      </MemoryRouter>
    </IntlProvider>,
  );
}

afterEach(() => {
  cleanup();
  apiMock.searchPublic.mockReset();
  vi.useRealTimers();
});

describe("HeroSearchTypeahead — desktop", () => {
  beforeEach(() => setMatchMedia(false));

  async function settleDebouncedSearch() {
    await act(async () => {
      vi.advanceTimersByTime(80);
      await Promise.resolve();
    });
    await act(async () => {
      await Promise.resolve();
    });
  }

  it("fires a search after the first letter and renders sectioned suggestions", async () => {
    vi.useFakeTimers();
    apiMock.searchPublic.mockResolvedValue(searchResponse());

    mount();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "n" } });

    // The 80ms debounce is the only delay between keystroke and request.
    await act(async () => {
      vi.advanceTimersByTime(79);
    });
    expect(apiMock.searchPublic).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(apiMock.searchPublic).toHaveBeenCalledWith(
      "n",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Diabetic peripheral neuropathy")).toBeTruthy();
    // WST-057 renders twice (label + drug meta), which is fine — both are
    // legitimate matches. Just confirm at least one exists.
    expect(screen.getAllByText("WST-057").length).toBeGreaterThan(0);
    expect(screen.getByText("Big Sky Experimental Treatment Center")).toBeTruthy();
  });

  it("ArrowDown sets aria-activedescendant to the first option's id", async () => {
    vi.useFakeTimers();
    apiMock.searchPublic.mockResolvedValue(searchResponse());

    mount();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "neu" } });
    await settleDebouncedSearch();
    expect(screen.getByText("Diabetic peripheral neuropathy")).toBeTruthy();

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.getAttribute("aria-activedescendant")).toBe(
      "lewis-search-option-condition-diabetic-peripheral-neuropathy",
    );
  });

  it("clearing the input closes the popover", async () => {
    vi.useFakeTimers();
    apiMock.searchPublic.mockResolvedValue(searchResponse());

    mount();
    const input = screen.getByRole("combobox");

    // No keystroke yet — popover not open.
    expect(screen.queryByRole("listbox")).toBeNull();

    fireEvent.change(input, { target: { value: "x" } });
    await settleDebouncedSearch();

    // After clearing back to empty, the popover closes.
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("aria-expanded reflects the current state", async () => {
    vi.useFakeTimers();
    apiMock.searchPublic.mockResolvedValue(searchResponse());

    mount();
    const input = screen.getByRole("combobox");
    expect(input.getAttribute("aria-expanded")).toBe("false");

    fireEvent.change(input, { target: { value: "neu" } });
    await settleDebouncedSearch();

    expect(input.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("HeroSearchTypeahead — mobile", () => {
  beforeEach(() => setMatchMedia(true));

  it("on mobile the input is read-only so the soft keyboard doesn't pop up before the overlay opens", () => {
    apiMock.searchPublic.mockResolvedValue(searchResponse());
    mount();

    const input = screen.getByRole("combobox");
    // readOnly attribute renders lower-case; check for either casing.
    expect(input.hasAttribute("readonly") || input.hasAttribute("readOnly")).toBe(true);
    // No inline popover surface on mobile — the overlay (lazy-loaded) is
    // what takes over instead.
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
