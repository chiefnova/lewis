// @vitest-environment jsdom
import type { PublicConditionDetail, PublicConditionListResponse } from "@lewis/shared/api/public";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import messages from "../../messages/en.json";

// Mock the public API so the page hooks resolve synchronously without
// hitting the network. Each test sets the mock implementation it needs.
import type * as ApiClient from "../../api/client";
type ApiClientModule = typeof ApiClient;

vi.mock("../../api/client", async () => {
  const actual = await vi.importActual<ApiClientModule>("../../api/client");
  return {
    ...actual,
    publicApi: {
      ...actual.publicApi,
      getCondition: vi.fn<(slug: string) => Promise<PublicConditionDetail>>(),
      listConditions: vi.fn<() => Promise<PublicConditionListResponse>>(),
    },
  };
});

import { publicApi } from "../../api/client";
import { ConditionDetailPage } from "./ConditionDetailPage";

const mockGetCondition = publicApi.getCondition as ReturnType<
  typeof vi.fn<(slug: string) => Promise<PublicConditionDetail>>
>;

const DIABETIC_PN: PublicConditionDetail = {
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

const PTSD: PublicConditionDetail = {
  slug: "ptsd",
  name: "Post-traumatic stress disorder (PTSD)",
  state: "coming_soon",
  summary: "A psychiatric condition that may develop after exposure to trauma.",
  icd10Codes: ["F43.10"],
  programCount: 0,
  href: "/conditions/ptsd",
  linkedPrograms: [],
};

const ALS: PublicConditionDetail = {
  slug: "als",
  name: "Amyotrophic Lateral Sclerosis (ALS)",
  state: "not_offered",
  summary: "A progressive neurodegenerative disease affecting motor neurons.",
  icd10Codes: ["G12.21"],
  programCount: 0,
  href: "/conditions/als",
  linkedPrograms: [],
};

afterEach(() => {
  cleanup();
  document.head.innerHTML = "";
  mockGetCondition.mockReset();
});

function mount(path: string) {
  return render(
    <IntlProvider locale="en" messages={messages}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/conditions/:slug" element={<ConditionDetailPage />} />
        </Routes>
      </MemoryRouter>
    </IntlProvider>,
  );
}

describe("ConditionDetailPage", () => {
  it("renders live condition with state badge, ICD chips, and links to the program", async () => {
    mockGetCondition.mockResolvedValue(DIABETIC_PN);
    mount("/conditions/diabetic-peripheral-neuropathy");

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
        "Diabetic peripheral neuropathy",
      );
    });

    // State badge + hero heading both render "Available now in Montana"
    expect(screen.getAllByText("Available now in Montana").length).toBeGreaterThanOrEqual(1);
    // Summary
    expect(screen.getByText(/Nerve damage caused by chronic high blood sugar/)).toBeTruthy();
    // ICD chips
    expect(screen.getByText("ICD-10 E11.40")).toBeTruthy();
    expect(screen.getByText("ICD-10 E11.42")).toBeTruthy();
    // Hero card links to the program detail page
    const programLink = screen
      .getAllByRole("link")
      .find((el) => el.getAttribute("href") === "/programs/wst-057");
    expect(programLink).toBeTruthy();
    // Standard of care section is rendered (appears as TOC link + section heading)
    expect(screen.getAllByText("Standard of care").length).toBeGreaterThanOrEqual(1);
    // Live state has NO email signup
    expect(screen.queryByPlaceholderText(/Get notified/)).toBeNull();
  });

  it("renders coming-soon with disabled email signup + ClinicalTrials.gov fallback", async () => {
    mockGetCondition.mockResolvedValue(PTSD);
    mount("/conditions/ptsd");

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
        "Post-traumatic stress disorder (PTSD)",
      );
    });

    expect(screen.getAllByText("Coming soon to Montana").length).toBeGreaterThanOrEqual(1);
    // Hero card body has the "Lewis is tracking" prose
    expect(screen.getByText(/Lewis is tracking this condition\./)).toBeTruthy();
    // Disabled signup form is present, with the right placeholder
    const signupInput = screen.getByPlaceholderText(/Get notified when .* is listed/);
    expect(signupInput.hasAttribute("disabled")).toBe(true);
    expect(signupInput.getAttribute("aria-disabled")).toBe("true");
    // Disabled note is visible
    expect(
      screen.getByText(/Notifications are not yet available — we'll switch this on shortly\./),
    ).toBeTruthy();
    // Coming-soon DOES have a ClinicalTrials.gov "While you wait" link per PRD § 14.2 State B
    expect(screen.getByRole("link", { name: /Search ClinicalTrials\.gov/ })).toBeTruthy();
    // No live-state copy leaks
    expect(screen.queryAllByText("Available now in Montana").length).toBe(0);
    // No off-topic program promotion
    expect(screen.queryByText(/WST-057/)).toBeNull();
  });

  it("renders not-offered with the required three-path panel, disabled signup, and no standard of care", async () => {
    mockGetCondition.mockResolvedValue(ALS);
    mount("/conditions/als");

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
        "Amyotrophic Lateral Sclerosis (ALS)",
      );
    });

    expect(screen.getByText("Not currently offered")).toBeTruthy();
    // Hero card title carries the condition name
    expect(
      screen.getByText(
        /No Montana ETC currently offers a program for Amyotrophic Lateral Sclerosis/,
      ),
    ).toBeTruthy();
    expect(screen.getByText("You may want to:")).toBeTruthy();
    expect(screen.getByText("Search ClinicalTrials.gov for active trials")).toBeTruthy();
    expect(screen.getByText("Talk to your treating physician about other options.")).toBeTruthy();
    expect(screen.getByText(/Your treating physician knows your full history/)).toBeTruthy();
    // Disabled signup form for the notify path uses the not-offered placeholder copy
    const signupInput = screen.getByPlaceholderText(/Get notified if a Montana ETC adds a program/);
    expect(signupInput.hasAttribute("disabled")).toBe(true);
    // Standard of care section is OMITTED per directoryprd.md § 14.2 State C
    expect(screen.queryAllByText("Standard of care").length).toBe(0);
    // ClinicalTrials.gov fallback IS present (graceful path per PRD § 14.2 State C)
    expect(screen.getByRole("link", { name: /Open ClinicalTrials\.gov/ })).toBeTruthy();
    // No off-topic program promotion (ALS has no Montana program; WST-057 is for PN)
    expect(screen.queryByText(/WST-057/)).toBeNull();
  });

  it("renders not-found state with back-to-conditions link when API returns 404", async () => {
    const { ApiNetworkError } = await vi.importActual<ApiClientModule>("../../api/client");
    mockGetCondition.mockRejectedValue(new ApiNetworkError(404, "Not Found"));
    mount("/conditions/nonexistent");

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
        "Condition not found",
      );
    });
    // Back-to-conditions link is rendered
    const backLinks = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("href") === "/conditions");
    expect(backLinks.length).toBeGreaterThan(0);
  });
});
