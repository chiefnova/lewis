// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";

import { ForCliniciansPage } from "./ForCliniciansPage";

afterEach(() => {
  cleanup();
});

const AXE_OPTIONS: axe.RunOptions = {
  rules: {
    region: { enabled: false },
    "color-contrast": { enabled: false },
  },
};

describe("ForCliniciansPage a11y", () => {
  it("loaded page renders without axe violations", async () => {
    const { container } = render(
      <IntlProvider locale="en" messages={{}}>
        <MemoryRouter initialEntries={["/for-clinicians"]}>
          <Routes>
            <Route path="/for-clinicians" element={<ForCliniciansPage />} />
          </Routes>
        </MemoryRouter>
      </IntlProvider>,
    );
    // Sanity check that the page actually rendered the letter (not a skeleton)
    // before running axe — the page is fully static so this is immediate.
    await screen.findByRole("heading", { level: 1 });
    const results = await axe.run(container, AXE_OPTIONS);
    expect(results.violations).toEqual([]);
  });
});
