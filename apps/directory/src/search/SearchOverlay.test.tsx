// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PublicSearchResponse } from "@lewis/shared/api/search";
import messages from "../messages/en.json";
import { SearchOverlay } from "./SearchOverlay";

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
  vi.useRealTimers();
});

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname + location.search}</span>;
}

function searchResponse(): PublicSearchResponse {
  return {
    query: "neuro",
    sections: {
      conditions: [
        {
          type: "condition" as const,
          slug: "diabetic-peripheral-neuropathy",
          name: "Diabetic peripheral neuropathy",
          state: "live" as const,
          programCount: 1,
          href: "/conditions/diabetic-peripheral-neuropathy",
        },
      ],
      treatments: [
        {
          type: "treatment" as const,
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
          type: "etc" as const,
          slug: "big-sky",
          name: "Big Sky Experimental Treatment Center",
          city: "Bozeman, MT",
          href: "/etcs/big-sky",
        },
      ],
    },
    totals: { conditions: 1, treatments: 1, etcs: 1 },
  };
}

function alsResponse(): PublicSearchResponse {
  return {
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
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function mount(onClose = vi.fn()) {
  const rendered = render(
    <IntlProvider locale="en" messages={messages}>
      <MemoryRouter>
        <SearchOverlay open onClose={onClose} />
        <LocationProbe />
      </MemoryRouter>
    </IntlProvider>,
  );
  return { ...rendered, onClose };
}

async function settleDebouncedSearch() {
  await act(async () => {
    vi.advanceTimersByTime(80);
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
}

describe("SearchOverlay", () => {
  it("debounces live suggest and renders sectioned results", async () => {
    vi.useFakeTimers();
    apiMock.searchPublic.mockResolvedValue(searchResponse());

    mount();
    fireEvent.change(screen.getByRole("combobox", { name: "Search by your condition" }), {
      target: { value: "neuro" },
    });

    await act(async () => {
      vi.advanceTimersByTime(79);
    });
    expect(apiMock.searchPublic).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(apiMock.searchPublic).toHaveBeenCalledWith(
      "neuro",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Diabetic peripheral neuropathy")).toBeTruthy();
    expect(screen.getAllByText("WST-057").length).toBeGreaterThan(0);
    expect(screen.getByText("Big Sky Experimental Treatment Center")).toBeTruthy();
  });

  it("submits free text to the search page and closes", () => {
    const { onClose } = mount();

    fireEvent.change(screen.getByRole("combobox", { name: "Search by your condition" }), {
      target: { value: "ALS" },
    });
    fireEvent.submit(screen.getByRole("search"));

    expect(screen.getByTestId("location").textContent).toBe("/search?q=ALS");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("arrow navigation activates suggestions in section order", async () => {
    vi.useFakeTimers();
    const { onClose } = mount();
    apiMock.searchPublic.mockResolvedValue(searchResponse());
    const input = screen.getByRole("combobox", { name: "Search by your condition" });

    fireEvent.change(input, { target: { value: "neuro" } });
    await settleDebouncedSearch();

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.submit(screen.getByRole("search"));

    expect(screen.getByTestId("location").textContent).toBe("/programs/wst-057");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clears results immediately and ignores a late response from the previous query", async () => {
    vi.useFakeTimers();
    const neuropathy = deferred<PublicSearchResponse>();
    const als = deferred<PublicSearchResponse>();
    apiMock.searchPublic.mockReturnValueOnce(neuropathy.promise).mockReturnValueOnce(als.promise);

    mount();
    const input = screen.getByRole("combobox", { name: "Search by your condition" });
    fireEvent.change(input, { target: { value: "neuropathy" } });
    await settleDebouncedSearch();
    expect(apiMock.searchPublic).toHaveBeenCalledWith(
      "neuropathy",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    fireEvent.change(input, { target: { value: "ALS" } });
    expect(screen.queryByText("WST-057")).toBeNull();

    neuropathy.resolve(searchResponse());
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByText("WST-057")).toBeNull();

    await settleDebouncedSearch();
    expect(apiMock.searchPublic).toHaveBeenCalledWith(
      "ALS",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    als.resolve(alsResponse());
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Amyotrophic Lateral Sclerosis (ALS)")).toBeTruthy();
    expect(screen.queryByText("WST-057")).toBeNull();
  });
});
