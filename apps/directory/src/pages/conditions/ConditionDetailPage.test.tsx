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
});
