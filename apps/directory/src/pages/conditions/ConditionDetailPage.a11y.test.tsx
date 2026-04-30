// @vitest-environment jsdom
import type { PublicConditionDetail } from "@lewis/shared/api/public";
import axe from "axe-core";
import { cleanup, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import messages from "../../messages/en.json";
import { ConditionDetailPage } from "./ConditionDetailPage";

// One axe scan per state so any state-specific violation surfaces with the
// state in the test name. Disabled rules match the existing pattern: region
// (no <main> wrapper), color-contrast (jsdom can't compute), and
// scrollable-region-focusable (the TOC's sticky aside trips this in jsdom
// where layout is degenerate).

const apiMock = vi.hoisted(() => ({
  getCondition: vi.fn<(slug: string) => Promise<PublicConditionDetail>>(),
}));

import type * as ApiClient from "../../api/client";
type ApiClientModule = typeof ApiClient;

vi.mock("../../api/client", async () => {
  const actual = await vi.importActual<ApiClientModule>("../../api/client");
  return {
    ...actual,
    publicApi: {
      ...actual.publicApi,
      getCondition: apiMock.getCondition,
    },
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.head.innerHTML = "";
});

const AXE_OPTIONS: axe.RunOptions = {
  rules: {
    region: { enabled: false },
    "color-contrast": { enabled: false },
    "scrollable-region-focusable": { enabled: false },
    // The TOC + callout asides are inside <main> in production via the
    // app layout. Tests render the page in isolation, so axe sees them
    // as top-level <aside>s and flags landmark-nesting best-practices.
    "landmark-complementary-is-top-level": { enabled: false },
  },
};

const LIVE: PublicConditionDetail = {
  slug: "diabetic-peripheral-neuropathy",
  name: "Diabetic peripheral neuropathy",
  state: "live",
  summary: "Nerve damage caused by chronic high blood sugar.",
  icd10Codes: ["E11.40", "E11.42"],
  programCount: 1,
  href: "/conditions/diabetic-peripheral-neuropathy",
  linkedPrograms: [
    {
      slug: "wst-057",
      name: "WST-057®",
      drug: "WST-057",
      phase: "Phase 2",
      form: "Topical",
      manufacturer: "WinSanTor",
    },
  ],
};

const COMING_SOON: PublicConditionDetail = {
  slug: "ptsd",
  name: "Post-traumatic stress disorder (PTSD)",
  state: "coming_soon",
  summary: "A psychiatric condition that may develop after trauma exposure.",
  icd10Codes: ["F43.10"],
  programCount: 0,
  href: "/conditions/ptsd",
  linkedPrograms: [],
};

const NOT_OFFERED: PublicConditionDetail = {
  slug: "als",
  name: "Amyotrophic Lateral Sclerosis (ALS)",
  state: "not_offered",
  summary: "A progressive neurodegenerative disease.",
  icd10Codes: ["G12.21"],
  programCount: 0,
  href: "/conditions/als",
  linkedPrograms: [],
};

function mount(slug: string) {
  return render(
    <IntlProvider locale="en" messages={messages}>
      <MemoryRouter initialEntries={[`/conditions/${slug}`]}>
        <Routes>
          <Route path="/conditions/:slug" element={<ConditionDetailPage />} />
        </Routes>
      </MemoryRouter>
    </IntlProvider>,
  );
}

describe("ConditionDetailPage a11y", () => {
  it("live state has no axe violations", async () => {
    apiMock.getCondition.mockResolvedValue(LIVE);
    const { container } = mount("diabetic-peripheral-neuropathy");
    await screen.findByRole("heading", { level: 1 });
    const results = await axe.run(container, AXE_OPTIONS);
    expect(results.violations).toEqual([]);
  });

  it("coming-soon state has no axe violations and the disabled signup form is correctly marked", async () => {
    apiMock.getCondition.mockResolvedValue(COMING_SOON);
    const { container } = mount("ptsd");
    await screen.findByRole("heading", { level: 1 });

    const signupInput = screen.getByPlaceholderText(/Get notified when .* is listed/);
    expect(signupInput.hasAttribute("disabled")).toBe(true);
    expect(signupInput.getAttribute("aria-disabled")).toBe("true");

    const results = await axe.run(container, AXE_OPTIONS);
    expect(results.violations).toEqual([]);
  });

  it("not-offered state has no axe violations", async () => {
    apiMock.getCondition.mockResolvedValue(NOT_OFFERED);
    const { container } = mount("als");
    await screen.findByRole("heading", { level: 1 });
    expect(screen.getByText("Talk to your treating physician about other options.")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Open ClinicalTrials\.gov/ })).toBeTruthy();
    const results = await axe.run(container, AXE_OPTIONS);
    expect(results.violations).toEqual([]);
  });
});
