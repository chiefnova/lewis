// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";
import { TreatmentDetailPage } from "./TreatmentDetailPage";

afterEach(cleanup);

const AXE_OPTIONS: axe.RunOptions = {
  rules: {
    region: { enabled: false },
    "color-contrast": { enabled: false },
  },
};

describe("TreatmentDetailPage a11y", () => {
  it("WST-057 detail renders without axe violations", async () => {
    const { container } = render(
      <IntlProvider locale="en" messages={{}}>
        <MemoryRouter initialEntries={["/programs/wst-057"]}>
          <Routes>
            <Route path="/programs/:slug" element={<TreatmentDetailPage />} />
          </Routes>
        </MemoryRouter>
      </IntlProvider>,
    );
    const results = await axe.run(container, AXE_OPTIONS);
    expect(results.violations).toEqual([]);
  });
});
