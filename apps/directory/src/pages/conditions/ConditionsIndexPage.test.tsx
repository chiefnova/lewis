// @vitest-environment jsdom
import type { PublicConditionListResponse } from "@lewis/shared/api/public";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import messages from "../../messages/en.json";
import { ConditionsIndexPage } from "./ConditionsIndexPage";

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
  document.head.innerHTML = "";
});

const FIXTURE: PublicConditionListResponse = {
  conditions: [
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
      slug: "diabetic-peripheral-neuropathy",
      name: "Diabetic peripheral neuropathy",
      state: "live",
      summary: "Nerve damage caused by chronic high blood sugar.",
      icd10Codes: ["E11.40", "E11.42"],
      programCount: 1,
      href: "/conditions/diabetic-peripheral-neuropathy",
    },
    {
      slug: "chemotherapy-induced-peripheral-neuropathy",
      name: "Chemotherapy-induced peripheral neuropathy",
      state: "live",
      summary: "Nerve pain caused by some chemotherapy medicines.",
      icd10Codes: ["G62.0"],
      programCount: 1,
      href: "/conditions/chemotherapy-induced-peripheral-neuropathy",
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

function mount() {
  return render(
    <IntlProvider locale="en" messages={messages}>
      <MemoryRouter initialEntries={["/conditions"]}>
        <Routes>
          <Route path="/conditions" element={<ConditionsIndexPage />} />
        </Routes>
      </MemoryRouter>
    </IntlProvider>,
  );
}

describe("ConditionsIndexPage", () => {
  it("renders state sections in order, sorts rows by name, and emits ItemList JSON-LD", async () => {
    apiMock.listConditions.mockResolvedValue(FIXTURE);
    mount();

    await screen.findByText("Diabetic peripheral neuropathy");

    const tables = screen.getAllByRole("table");
    expect(tables).toHaveLength(3);
    expect(within(tables[0]!).getByText("Available now")).toBeTruthy();
    expect(within(tables[1]!).getByText("Coming soon")).toBeTruthy();
    expect(within(tables[2]!).getByText("Not currently offered")).toBeTruthy();

    expect(
      within(tables[0]!)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Chemotherapy-induced peripheral neuropathy", "Diabetic peripheral neuropathy"]);
    expect(
      screen.getByRole("link", { name: "Diabetic peripheral neuropathy" }).getAttribute("href"),
    ).toBe("/conditions/diabetic-peripheral-neuropathy");
    expect(screen.getByText("E11.40")).toBeTruthy();
    expect(screen.getByText("E11.42")).toBeTruthy();

    await waitFor(() => {
      const jsonLd = document.head.querySelector<HTMLScriptElement>(
        'script[type="application/ld+json"]',
      );
      const parsed = JSON.parse(jsonLd?.textContent ?? "{}") as {
        "@type"?: string;
        itemListElement?: Array<{ name?: string; url?: string }>;
      };
      expect(parsed["@type"]).toBe("ItemList");
      expect(parsed.itemListElement?.[0]).toMatchObject({
        name: "Chemotherapy-induced peripheral neuropathy",
        url: "https://lewis.health/conditions/chemotherapy-induced-peripheral-neuropathy",
      });
    });
  });

  it("shows an error state and retries the list request", async () => {
    apiMock.listConditions.mockRejectedValueOnce(new Error("temporarily down"));
    apiMock.listConditions.mockResolvedValueOnce(FIXTURE);
    mount();

    await screen.findByRole("alert");
    expect(screen.getByText("Conditions are temporarily unavailable.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await screen.findByText("Diabetic peripheral neuropathy");
    expect(apiMock.listConditions).toHaveBeenCalledTimes(2);
  });
});
