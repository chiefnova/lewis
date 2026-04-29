// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import messages from "../messages/en.json";
import { SearchPage } from "./SearchPage";
import type { PublicSearchResponse } from "@lewis/shared/api/search";

const apiMock = vi.hoisted(() => ({
  searchPublic: vi.fn(),
}));

vi.mock("../api/client", () => ({
  ApiNetworkError: class ApiNetworkError extends Error {},
  ApiSchemaError: class ApiSchemaError extends Error {},
  publicApi: {
    searchPublic: apiMock.searchPublic,
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.head.innerHTML = "";
});

function mount(path: string) {
  return render(
    <IntlProvider locale="en" messages={messages}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/search" element={<SearchPage />} />
        </Routes>
      </MemoryRouter>
    </IntlProvider>,
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function NavigateToAlsButton() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate("/search?q=ALS")}>
      Go ALS
    </button>
  );
}

function mountWithNavigation(path: string) {
  return render(
    <IntlProvider locale="en" messages={messages}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/search"
            element={
              <>
                <NavigateToAlsButton />
                <SearchPage />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </IntlProvider>,
  );
}

describe("SearchPage", () => {
  it("renders the recent list without calling the API for an empty query", () => {
    mount("/search");

    expect(screen.getByText("Recent on Lewis")).toBeTruthy();
    expect(screen.getByText("Diabetic peripheral neuropathy")).toBeTruthy();
    expect(apiMock.searchPublic).not.toHaveBeenCalled();
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it("renders ALS without promoting WST-057 and noindexes query results", async () => {
    apiMock.searchPublic.mockResolvedValue({
      query: "ALS",
      sections: {
        conditions: [
          {
            type: "condition",
            slug: "als",
            name: "Amyotrophic Lateral Sclerosis (ALS)",
            state: "not_offered",
            programCount: 0,
            href: "/conditions/als",
          },
        ],
        treatments: [],
        etcs: [],
      },
      totals: { conditions: 1, treatments: 0, etcs: 0 },
    });

    mount("/search?q=ALS");

    await screen.findByText("Amyotrophic Lateral Sclerosis (ALS)");
    expect(screen.queryByText("WST-057")).toBeNull();
    expect(screen.getByText("Treatments · 0")).toBeTruthy();
    await waitFor(() =>
      expect(document.head.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe(
        "noindex, follow",
      ),
    );
  });

  it("clears previous results and ignores late responses when the query changes", async () => {
    const neuropathy = deferred<PublicSearchResponse>();
    const als = deferred<PublicSearchResponse>();
    apiMock.searchPublic.mockReturnValueOnce(neuropathy.promise).mockReturnValueOnce(als.promise);

    mountWithNavigation("/search?q=neuropathy");
    expect(apiMock.searchPublic).toHaveBeenCalledWith(
      "neuropathy",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Go ALS" }));
    expect(screen.queryByText("WST-057")).toBeNull();

    // Enforce the AbortController contract: the navigation away from the
    // first query must have aborted the first signal, and the second query
    // must have received its own distinct signal.
    const firstSignal = apiMock.searchPublic.mock.calls[0]?.[1]?.signal as AbortSignal;
    const secondSignal = apiMock.searchPublic.mock.calls[1]?.[1]?.signal as AbortSignal;
    expect(firstSignal).toBeInstanceOf(AbortSignal);
    expect(secondSignal).toBeInstanceOf(AbortSignal);
    expect(firstSignal.aborted).toBe(true);
    expect(secondSignal.aborted).toBe(false);
    expect(firstSignal).not.toBe(secondSignal);

    neuropathy.resolve({
      query: "neuropathy",
      sections: {
        conditions: [],
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
      totals: { conditions: 0, treatments: 1, etcs: 0 },
    });
    // Stale-response sentinel must STAY null even after React has had every
    // chance to flush effects. waitFor polls until the assertion holds for
    // a stable window — robust against React 18's async effect timing.
    await waitFor(() => expect(screen.queryByText("WST-057")).toBeNull());

    als.resolve({
      query: "ALS",
      sections: {
        conditions: [
          {
            type: "condition",
            slug: "als",
            name: "Amyotrophic Lateral Sclerosis (ALS)",
            state: "not_offered",
            programCount: 0,
            href: "/conditions/als",
          },
        ],
        treatments: [],
        etcs: [],
      },
      totals: { conditions: 1, treatments: 0, etcs: 0 },
    });

    expect(await screen.findByText("Amyotrophic Lateral Sclerosis (ALS)")).toBeTruthy();
    expect(screen.queryByText("WST-057")).toBeNull();
  });
});
