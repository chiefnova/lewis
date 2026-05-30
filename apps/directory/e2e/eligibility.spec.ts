// E2E spec for the /eligibility/:slug server-backed self-screen (§ 17.2 /
// 17.3 / 17.4). API calls are fulfilled in-browser so this suite only needs
// the directory dev server; the SECURITY DEFINER session helpers + RLS are
// covered by packages/db/test/rls/0021_eligibility_sessions.sql and the
// API behavior by apps/api/src/domains/public-eligibility/routes.test.ts.

import { expect, test, type Page } from "@playwright/test";

const SESSION_TOKEN = "11111111-1111-4111-8111-111111111111";

async function mockEligibilityApi(page: Page): Promise<void> {
  // POST /start — mint a session.
  await page.route("**/v1/public/eligibility/start**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sessionToken: SESSION_TOKEN,
        programSlug: "wst-057",
        expiresAt: "2099-01-01T00:00:00.000Z",
      }),
    });
  });

  // POST .../sessions/:token/complete — echo the locally-evaluated outcome.
  await page.route("**/v1/public/eligibility/sessions/*/complete**", async (route) => {
    const body = route.request().postDataJSON() as {
      passed: boolean;
      failedCriterion: string | null;
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sessionToken: SESSION_TOKEN,
        result: body.passed ? "passed" : "failed",
        failedCriterion: body.failedCriterion,
      }),
    });
  });

  // POST .../sessions/:token/answers — accept each appended answer.
  await page.route("**/v1/public/eligibility/sessions/*/answers**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ accepted: true }),
    });
  });

  // GET .../sessions/:token — resume. A fresh browser context has no stored
  // token so this is not hit on first load; mock it to 404 defensively so a
  // stray call falls back to /start rather than hanging.
  await page.route("**/v1/public/eligibility/sessions/*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "not_found", message: "Eligibility session expired or not found." },
        requestId: "e2e",
      }),
    });
  });
}

async function answer(page: Page, choice: "Yes" | "No"): Promise<void> {
  await page.getByRole("radio", { name: choice, exact: true }).click();
  await page.getByRole("button", { name: /next|see result/i }).click();
}

test.describe("Eligibility self-screen (slice 5 § 17)", () => {
  test("§ 17.4 fail branch — q1 'No' surfaces the specific failed criterion", async ({ page }) => {
    await mockEligibilityApi(page);
    await page.goto("/eligibility/wst-057");

    await expect(page.getByText(/Question 1 of 4/i)).toBeVisible();
    await answer(page, "No"); // q1: no confirmed DPN diagnosis → fail
    await answer(page, "Yes"); // q2
    await answer(page, "Yes"); // q3
    await answer(page, "Yes"); // q4 → See result

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/may not be a fit/i);
    await expect(
      page.getByText(/confirmed diabetic peripheral neuropathy diagnosis/i),
    ).toBeVisible();
    // The § 17.4 alternate paths are reachable.
    await expect(page.getByRole("link", { name: /reach out anyway/i })).toHaveAttribute(
      "href",
      "/connect/wst-057",
    );
  });

  test("§ 17.3 pass branch — all 'Yes' surfaces the 'may be a fit' outcome + connect CTA", async ({
    page,
  }) => {
    await mockEligibilityApi(page);
    await page.goto("/eligibility/wst-057");

    await expect(page.getByText(/Question 1 of 4/i)).toBeVisible();
    await answer(page, "Yes");
    await answer(page, "Yes");
    await answer(page, "Yes");
    await answer(page, "Yes");

    await expect(page.getByText(/you may be a fit/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /connect with the etc/i })).toBeVisible();
  });
});
