// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IntlProvider } from "react-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as ApiClientModule from "../api/client";

const startEligibility = vi.fn();
const submitEligibilityAnswer = vi.fn();
const completeEligibility = vi.fn();
const resumeEligibility = vi.fn();

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<typeof ApiClientModule>("../api/client");
  return {
    ...actual,
    publicApi: {
      startEligibility: (...args: Parameters<typeof startEligibility>) => startEligibility(...args),
      submitEligibilityAnswer: (...args: Parameters<typeof submitEligibilityAnswer>) =>
        submitEligibilityAnswer(...args),
      completeEligibility: (...args: Parameters<typeof completeEligibility>) =>
        completeEligibility(...args),
      resumeEligibility: (...args: Parameters<typeof resumeEligibility>) =>
        resumeEligibility(...args),
    },
  };
});

import { EligibilityPage } from "./EligibilityPage";

beforeEach(() => {
  startEligibility.mockResolvedValue({
    sessionToken: "11111111-1111-4111-8111-111111111111",
    programSlug: "wst-057",
    expiresAt: "2099-01-01T00:00:00.000Z",
  });
  submitEligibilityAnswer.mockResolvedValue({ accepted: true });
  completeEligibility.mockImplementation(
    async (_token: string, body: { passed: boolean; failedCriterion: string | null }) => ({
      result: body.passed ? "passed" : "failed",
      failedCriterion: body.failedCriterion,
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
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
    // Wait for the question UI to render — axe-scanning the loading
    // skeleton instead of the live form is a false-positive trap.
    await screen.findByText(/Question 1 of 4/i);
    const results = await axe.run(container, AXE_OPTIONS);
    expect(results.violations).toEqual([]);
  });

  it("§ 17.4 fail-branch result has no axe violations", async () => {
    const { container } = mount();
    await screen.findByText(/Question 1 of 4/i);
    const next = () => fireEvent.click(screen.getByRole("button", { name: /next|see result/i }));
    // Walk q1 = No (fails) → q2..q4 = Yes.
    fireEvent.click(screen.getByRole("radio", { name: "No" }));
    next();
    fireEvent.click(screen.getByRole("radio", { name: "Yes" }));
    next();
    fireEvent.click(screen.getByRole("radio", { name: "Yes" }));
    next();
    fireEvent.click(screen.getByRole("radio", { name: "Yes" }));
    next();
    // Wait for fail-branch H1 (after completing → completed transition).
    expect(await screen.findByRole("heading", { level: 1 })).toBeTruthy();
    const results = await axe.run(container, AXE_OPTIONS);
    expect(results.violations).toEqual([]);
  });
});
