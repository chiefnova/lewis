// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";
import { EligibilityPage } from "./EligibilityPage";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const AXE_OPTIONS: axe.RunOptions = {
  rules: {
    region: { enabled: false },
    "color-contrast": { enabled: false },
  },
};

function mount() {
  return render(
    <IntlProvider locale="en" messages={{}}>
      <MemoryRouter initialEntries={["/eligibility/wst-057"]}>
        <Routes>
          <Route path="/eligibility/:programSlug" element={<EligibilityPage />} />
        </Routes>
      </MemoryRouter>
    </IntlProvider>,
  );
}

describe("EligibilityPage a11y", () => {
  it("first-question state has no axe violations", async () => {
    const { container } = mount();
    const results = await axe.run(container, AXE_OPTIONS);
    expect(results.violations).toEqual([]);
  });
});
