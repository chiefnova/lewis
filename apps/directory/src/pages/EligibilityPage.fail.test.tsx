// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IntlProvider } from "react-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as ApiClientModule from "../api/client";

// Mock the public API client BEFORE importing the page so it picks up the
// mock. The eligibility hook is the boundary between the page and the
// network — driving it via vi.fn() lets us assert request shape and
// dictate response shape per test.
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

// Walk the four-question flow with answers that fail on q1 (DPN diagnosis).
// The hybrid fail UI should surface the q1 failReason verbatim inside the
// italic-inline reason clause.
async function answerFailingOnQ1() {
  // Wait for the bootstrap to land — the page renders a loading skeleton
  // until /start resolves. Once "Question 1 of 4" is on screen we know
  // session phase = ready.
  await screen.findByText(/Question 1 of 4/i);
  const next = () => fireEvent.click(screen.getByRole("button", { name: /next|see result/i }));
  // q1: No diagnosis → fails
  fireEvent.click(screen.getByRole("radio", { name: "No" }));
  next();
  // q2: standard-of-care → Yes (pass)
  fireEvent.click(screen.getByRole("radio", { name: "Yes" }));
  next();
  // q3: age ≥18 → Yes
  fireEvent.click(screen.getByRole("radio", { name: "Yes" }));
  next();
  // q4: travel → Yes (pass) — but the q1 fail is already locked in
  fireEvent.click(screen.getByRole("radio", { name: "Yes" }));
  next();
  // After clicking "See result" the page transitions through completing →
  // completed; wait for the H1 to confirm we're on the fail branch.
  await screen.findByRole("heading", { level: 1 });
}

describe("EligibilityPage — § 17.4 fail-branch hybrid", () => {
  it("renders the named-program H1", async () => {
    mount();
    await answerFailingOnQ1();
    const h1 = await screen.findByRole("heading", { level: 1 });
    expect(h1.textContent).toMatch(/Based on what you shared/i);
    expect(h1.textContent).toMatch(/may not be a fit/i);
    expect(h1.querySelector("em")?.textContent).toBeTruthy();
  });

  it("renders the italic-inline failedCriterion clause from the q1 failReason", async () => {
    mount();
    await answerFailingOnQ1();
    // The q1 failReason is:
    //   "requires a confirmed diabetic peripheral neuropathy diagnosis from a treating clinician."
    expect(
      screen.getByText(
        /requires a confirmed diabetic peripheral neuropathy diagnosis from a treating clinician/i,
      ),
    ).toBeTruthy();
  });

  it("renders three CTA paths in the correct order (i, ii, iii)", async () => {
    mount();
    await answerFailingOnQ1();
    const titles = screen.getAllByRole("heading", { level: 2 });
    const titleTexts = titles.map((h) => h.textContent ?? "");
    expect(titleTexts).toContain("Reach out anyway");
    expect(titleTexts).toContain("Browse other treatments");
    expect(titleTexts).toContain("Look for clinical trials elsewhere");
    const i1 = titleTexts.indexOf("Reach out anyway");
    const i2 = titleTexts.indexOf("Browse other treatments");
    const i3 = titleTexts.indexOf("Look for clinical trials elsewhere");
    expect(i1).toBeLessThan(i2);
    expect(i2).toBeLessThan(i3);
  });

  it("Reach out anyway links to /connect/:slug", async () => {
    mount();
    await answerFailingOnQ1();
    const reach = screen.getByRole("link", { name: /reach out anyway/i });
    expect(reach.getAttribute("href")).toBe("/connect/wst-057");
  });

  it("Browse other treatments links to /browse", async () => {
    mount();
    await answerFailingOnQ1();
    const browse = screen.getByRole("link", { name: /browse other treatments/i });
    expect(browse.getAttribute("href")).toBe("/browse");
  });

  it("ClinicalTrials.gov link opens in a new tab with rel=noopener", async () => {
    mount();
    await answerFailingOnQ1();
    const ct = screen.getByRole("link", { name: /look for clinical trials elsewhere/i });
    expect(ct.getAttribute("href")).toBe("https://clinicaltrials.gov/");
    expect(ct.getAttribute("target")).toBe("_blank");
    expect(ct.getAttribute("rel") ?? "").toMatch(/noopener/);
  });

  it("renders the independence-statement footnote", async () => {
    mount();
    await answerFailingOnQ1();
    expect(
      screen.getByText(
        /Your answers are stored anonymously on this device.*Lewis is an independent directory/i,
      ),
    ).toBeTruthy();
  });

  it("uses role=status with aria-live=polite for screen-reader announcement", async () => {
    mount();
    await answerFailingOnQ1();
    const statuses = screen.getAllByRole("status");
    const failStatus = statuses.find((el) => (el.className ?? "").includes("elig-fail"));
    expect(failStatus).toBeTruthy();
    expect(failStatus?.getAttribute("aria-live")).toBe("polite");
  });

  it("persists the eligibility session token in localStorage for the connect form to read", async () => {
    mount();
    await screen.findByText(/Question 1 of 4/i);
    await waitFor(() =>
      expect(window.localStorage.getItem("lewis:eligibility:wst-057")).toBe(FRESH_TOKEN),
    );
  });

  it("calls publicApi.completeEligibility with the locally-evaluated outcome", async () => {
    mount();
    await answerFailingOnQ1();
    expect(completeEligibility).toHaveBeenCalledTimes(1);
    const [token, body] = completeEligibility.mock.calls[0]!;
    expect(token).toBe(FRESH_TOKEN);
    expect(body.passed).toBe(false);
    expect(body.failedCriterion).toMatch(/diabetic peripheral neuropathy diagnosis/i);
  });
});
