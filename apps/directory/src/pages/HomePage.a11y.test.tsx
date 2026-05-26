// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomePage } from "./HomePage";
import messages from "../messages/en.json";
import { SearchOverlayProvider } from "../search/SearchContext";

// Stub the search API — HeroSearchTypeahead, FeaturedConditions, and the
// slice-4 demoted FeaturedTreatments all hit the public API on mount.
vi.mock("../api/client", () => ({
  ApiNetworkError: class ApiNetworkError extends Error {},
  ApiSchemaError: class ApiSchemaError extends Error {},
  publicApi: {
    searchPublic: vi.fn().mockResolvedValue({
      sections: { conditions: [], treatments: [], etcs: [] },
      totals: { conditions: 0, treatments: 0, etcs: 0 },
      query: "",
    }),
    getCondition: vi.fn().mockResolvedValue({
      slug: "diabetic-peripheral-neuropathy",
      name: "Diabetic peripheral neuropathy",
      state: "live",
      summary: null,
      icd10Codes: ["E11.40"],
      programCount: 1,
      href: "/conditions/diabetic-peripheral-neuropathy",
      linkedPrograms: [
        {
          slug: "wst-057",
          name: "WST-057",
          drug: "WST-057",
          phase: "Phase 2",
          form: "Topical",
          manufacturer: null,
        },
      ],
    }),
    listPrograms: vi.fn().mockResolvedValue({
      programs: [
        {
          slug: "wst-057",
          name: "WST-057",
          indication: "for peripheral neuropathy",
          manufacturer: null,
          form: "Topical",
          phase: "Phase 2",
          etcCount: 1,
          available: true,
        },
      ],
      total: 1,
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
      <IntlProvider locale="en" messages={messages}>
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
