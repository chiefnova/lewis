// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomePage } from "./HomePage";
import { SearchOverlayProvider } from "../search/SearchContext";

// Stub the search API — the new HeroSearchTypeahead uses it on mount.
vi.mock("../api/client", () => ({
  ApiNetworkError: class ApiNetworkError extends Error {},
  ApiSchemaError: class ApiSchemaError extends Error {},
  publicApi: {
    searchPublic: vi.fn().mockResolvedValue({
      sections: { conditions: [], treatments: [], etcs: [] },
      totals: { conditions: 0, treatments: 0, etcs: 0 },
      query: "",
    }),
  },
}));

afterEach(cleanup);

// Color-contrast and image-alt rely on canvas/image APIs jsdom doesn't
// implement; we disable them in unit tests and rely on a live a11y review for
// color verification. Region rule fires because we render the page without
// the layout's <main> wrapper — disabled here, asserted at the layout level.
const AXE_OPTIONS: axe.RunOptions = {
  rules: {
    region: { enabled: false },
    "color-contrast": { enabled: false },
  },
};

describe("HomePage a11y", () => {
  it("renders without axe violations", async () => {
    const { container } = render(
      <IntlProvider locale="en" messages={{}}>
        <MemoryRouter>
          <SearchOverlayProvider>
            <HomePage />
          </SearchOverlayProvider>
        </MemoryRouter>
      </IntlProvider>,
    );
    const results = await axe.run(container, AXE_OPTIONS);
    expect(results.violations).toEqual([]);
  });
});
