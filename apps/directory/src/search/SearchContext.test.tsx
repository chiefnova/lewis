// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TopNav } from "../components/TopNav";
import messages from "../messages/en.json";
import { SearchOverlayProvider } from "./SearchContext";

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
});

describe("SearchOverlayProvider", () => {
  it("opens the lazy search overlay from the top-nav magnifier", async () => {
    render(
      <IntlProvider locale="en" messages={messages}>
        <MemoryRouter>
          <SearchOverlayProvider>
            <TopNav />
          </SearchOverlayProvider>
        </MemoryRouter>
      </IntlProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByRole("searchbox", { name: "Search by your condition" })).toBeTruthy();
    expect(apiMock.searchPublic).not.toHaveBeenCalled();
  });
});
