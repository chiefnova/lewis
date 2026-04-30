// @vitest-environment jsdom
import type { PublicSearchResponse } from "@lewis/shared/api/search";
import axe from "axe-core";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../messages/en.json";
import { HeroSearchTypeahead } from "./HeroSearchTypeahead";
import { SearchOverlayProvider } from "./SearchContext";

const apiMock = vi.hoisted(() => ({
  searchPublic: vi.fn<(...args: unknown[]) => Promise<PublicSearchResponse>>(),
}));

vi.mock("../api/client", () => ({
  ApiNetworkError: class ApiNetworkError extends Error {},
  ApiSchemaError: class ApiSchemaError extends Error {},
  publicApi: { searchPublic: apiMock.searchPublic },
}));

const AXE_OPTIONS: axe.RunOptions = {
  rules: {
    region: { enabled: false },
    "color-contrast": { enabled: false },
  },
};

function setMatchMedia(matchesMobile: boolean) {
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

function searchResponse(): PublicSearchResponse {
  return {
    query: "neu",
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
      etcs: [],
    },
    totals: { conditions: 1, treatments: 1, etcs: 0 },
  };
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

describe("HeroSearchTypeahead a11y", () => {
  beforeEach(() => setMatchMedia(false));

  it("closed (empty input) state has no axe violations", async () => {
    const { container } = mount();
    const results = await axe.run(container, AXE_OPTIONS);
    expect(results.violations).toEqual([]);
  });

  it("open popover with sectioned suggestions has no axe violations", async () => {
    vi.useFakeTimers();
    apiMock.searchPublic.mockResolvedValue(searchResponse());
    const { container } = mount();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "neu" } });
    await act(async () => {
      vi.advanceTimersByTime(80);
      await Promise.resolve();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Diabetic peripheral neuropathy")).toBeTruthy();

    // Switch back to real timers before axe runs — axe schedules work via
    // microtasks/MutationObserver and locks up under fake timers.
    vi.useRealTimers();
    const results = await axe.run(container, AXE_OPTIONS);
    expect(results.violations).toEqual([]);
  });
});
