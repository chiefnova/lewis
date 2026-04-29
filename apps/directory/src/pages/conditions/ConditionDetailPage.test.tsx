// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import messages from "../../messages/en.json";
import { ConditionDetailPage } from "./ConditionDetailPage";

afterEach(() => {
  cleanup();
  document.head.innerHTML = "";
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
  it("renders seeded live condition metadata and links WST-057", () => {
    mount("/conditions/diabetic-peripheral-neuropathy");

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "Diabetic peripheral neuropathy",
    );
    expect(screen.getByText("Available now in Montana.")).toBeTruthy();
    expect(screen.getByText(/Nerve damage caused by chronic high blood sugar/)).toBeTruthy();
    expect(screen.getByText("ICD-10 E11.40")).toBeTruthy();
    expect(screen.getByText("ICD-10 E11.42")).toBeTruthy();
    expect(screen.getByRole("link", { name: /WST-057/ }).getAttribute("href")).toBe(
      "/programs/wst-057",
    );
  });

  it("renders not-offered conditions without promoting WST-057", () => {
    mount("/conditions/als");

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "Amyotrophic Lateral Sclerosis (ALS)",
    );
    expect(
      screen.getByText("No Montana ETC currently offers a program for this condition."),
    ).toBeTruthy();
    expect(screen.queryByText(/WST-057/)).toBeNull();
    expect(screen.getByRole("link", { name: "Search ClinicalTrials.gov" })).toBeTruthy();
  });

  it("renders coming-soon conditions with the wait copy and no off-topic fallback", () => {
    mount("/conditions/ptsd");

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "Post-traumatic stress disorder (PTSD)",
    );
    expect(screen.getByText("Coming soon to Montana.")).toBeTruthy();
    // coming_soon copy is differentiated from not_offered (PRD § 14.2): no
    // ClinicalTrials.gov fallback that would steer the user to a competitor
    // sponsor's trial registry while Lewis is actively pursuing this listing.
    expect(
      screen.getByText(/Lewis is tracking this condition\. New programs are added/),
    ).toBeTruthy();
    expect(screen.queryByText("Available now in Montana.")).toBeNull();
    expect(screen.queryByRole("link", { name: "Search ClinicalTrials.gov" })).toBeNull();
    expect(screen.queryByText(/WST-057/)).toBeNull();
  });
});
