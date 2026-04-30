// @vitest-environment jsdom
import type { PublicConditionListResponse } from "@lewis/shared/api/public";
import axe from "axe-core";
import { cleanup, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import messages from "../../messages/en.json";
import { ConditionsIndexPage } from "./ConditionsIndexPage";

// Mirrors the SearchPage.a11y.test.tsx pattern: hoist a vi.fn-based mock so
// the page hook resolves synchronously without hitting the network. Region
// + color-contrast rules are disabled because (a) the page renders without
// the layout <main> wrapper here, and (b) jsdom can't compute color
// contrast — both are asserted in live a11y review and Playwright E2E.

const apiMock = vi.hoisted(() => ({
  listConditions:
    vi.fn<(opts?: { signal?: AbortSignal }) => Promise<PublicConditionListResponse>>(),
}));

vi.mock("../../api/client", () => ({
  ApiNetworkError: class ApiNetworkError extends Error {},
  ApiSchemaError: class ApiSchemaError extends Error {},
  publicApi: {
    listConditions: apiMock.listConditions,
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

const FIXTURE: PublicConditionListResponse = {
  conditions: [
    {
      slug: "diabetic-peripheral-neuropathy",
      name: "Diabetic peripheral neuropathy",
      state: "live",
      summary: "Nerve damage caused by chronic high blood sugar.",
      icd10Codes: ["E11.40", "E11.42"],
      programCount: 1,
      href: "/conditions/diabetic-peripheral-neuropathy",
    },
    {
      slug: "ptsd",
      name: "Post-traumatic stress disorder (PTSD)",
      state: "coming_soon",
      summary: "A psychiatric condition that may develop after trauma exposure.",
      icd10Codes: ["F43.10"],
      programCount: 0,
      href: "/conditions/ptsd",
    },
    {
      slug: "als",
      name: "Amyotrophic Lateral Sclerosis (ALS)",
      state: "not_offered",
      summary: "A progressive neurodegenerative disease.",
      icd10Codes: ["G12.21"],
      programCount: 0,
      href: "/conditions/als",
    },
  ],
};

describe("ConditionsIndexPage a11y", () => {
  it("renders without axe violations across all three state sections", async () => {
    apiMock.listConditions.mockResolvedValue(FIXTURE);

    const { container } = render(
      <IntlProvider locale="en" messages={messages}>
        <MemoryRouter initialEntries={["/conditions"]}>
          <Routes>
            <Route path="/conditions" element={<ConditionsIndexPage />} />
          </Routes>
        </MemoryRouter>
      </IntlProvider>,
    );

    await screen.findByText("Diabetic peripheral neuropathy");

    const results = await axe.run(container, AXE_OPTIONS);
    expect(results.violations).toEqual([]);
  });
});
