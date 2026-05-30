// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";

import { ForManufacturersPage } from "./ForManufacturersPage";

afterEach(() => {
  cleanup();
});

const AXE_OPTIONS: axe.RunOptions = {
  rules: {
    region: { enabled: false },
    "color-contrast": { enabled: false },
  },
};

describe("ForManufacturersPage a11y", () => {
  it("loaded page renders without axe violations", async () => {
    const { container } = render(
      <IntlProvider locale="en" messages={{}}>
        <MemoryRouter initialEntries={["/for-manufacturers"]}>
          <Routes>
            <Route path="/for-manufacturers" element={<ForManufacturersPage />} />
          </Routes>
        </MemoryRouter>
      </IntlProvider>,
    );
    await screen.findByRole("heading", { level: 1 });
    const results = await axe.run(container, AXE_OPTIONS);
    expect(results.violations).toEqual([]);
  });
});
