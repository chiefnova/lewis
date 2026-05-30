// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import messages from "../messages/en.json";
import { SearchPage } from "./SearchPage";

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

const AXE_OPTIONS: axe.RunOptions = {
  rules: {
    region: { enabled: false },
    "color-contrast": { enabled: false },
  },
};

describe("SearchPage a11y", () => {
  it("empty search state has no axe violations", async () => {
    const { container } = render(
      <IntlProvider locale="en" messages={messages}>
        <MemoryRouter initialEntries={["/search"]}>
          <Routes>
            <Route path="/search" element={<SearchPage />} />
          </Routes>
        </MemoryRouter>
      </IntlProvider>,
    );

    const results = await axe.run(container, AXE_OPTIONS);
    expect(results.violations).toEqual([]);
  });

  it("query results state has no axe violations", async () => {
    apiMock.searchPublic.mockResolvedValue({
      query: "neuropathy",
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
    });

    const { container } = render(
      <IntlProvider locale="en" messages={messages}>
        <MemoryRouter initialEntries={["/search?q=neuropathy"]}>
          <Routes>
            <Route path="/search" element={<SearchPage />} />
          </Routes>
        </MemoryRouter>
      </IntlProvider>,
    );

    await screen.findByText("Diabetic peripheral neuropathy");
    const results = await axe.run(container, AXE_OPTIONS);
    expect(results.violations).toEqual([]);
  });
});
