// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IntlProvider } from "react-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as ApiClientModule from "../api/client";

// Mirror of EligibilityPage.fail.test.tsx but for the § 17.3 PASS branch —
// the fail test only exercised q1=No. This walks the all-"Yes" path so the
// passing outcome (H2 + /connect CTA) and the passed=true/criterion=null
// complete call are covered.
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

const FRESH_TOKEN = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  startEligibility.mockResolvedValue({
    sessionToken: FRESH_TOKEN,
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

// All four questions pass on "Yes" (q1-q3 pass:["Yes"], q4 pass includes "Yes").
async function answerAllYes() {
  await screen.findByText(/Question 1 of 4/i);
  const next = () => fireEvent.click(screen.getByRole("button", { name: /next|see result/i }));
  for (let i = 0; i < 4; i++) {
    fireEvent.click(screen.getByRole("radio", { name: "Yes" }));
    next();
  }
}

describe("EligibilityPage — § 17.3 pass branch", () => {
  it("renders the 'may be a fit' outcome with a /connect CTA", async () => {
    mount();
    await answerAllYes();
    expect(await screen.findByText(/you may be a fit/i)).toBeTruthy();
    const connect = screen.getByRole("button", { name: /connect|reach out|talk to/i });
    expect(connect).toBeTruthy();
  });

  it("calls completeEligibility with passed=true and a null failedCriterion", async () => {
    mount();
    await answerAllYes();
    await waitFor(() => expect(completeEligibility).toHaveBeenCalledTimes(1));
    const [token, body] = completeEligibility.mock.calls[0]!;
    expect(token).toBe(FRESH_TOKEN);
    expect(body.passed).toBe(true);
    expect(body.failedCriterion).toBeNull();
  });
});
