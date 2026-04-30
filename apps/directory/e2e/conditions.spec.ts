// E2E spec for the /conditions index + /conditions/:slug detail flow.
// API calls are fulfilled in-browser so this suite only needs the directory
// dev server; API/Postgres behavior is covered by API + DB tests.

import { expect, test, type Page } from "@playwright/test";

const CONDITIONS = [
  {
    slug: "diabetic-peripheral-neuropathy",
    name: "Diabetic peripheral neuropathy",
    state: "live",
    summary: "Nerve damage caused by chronic high blood sugar.",
    icd10Codes: ["E11.40", "E11.42"],
    programCount: 1,
    href: "/conditions/diabetic-peripheral-neuropathy",
  },
  {
    slug: "ptsd",
    name: "Post-traumatic stress disorder (PTSD)",
    state: "coming_soon",
    summary: "A psychiatric condition that may develop after trauma exposure.",
    icd10Codes: ["F43.10"],
    programCount: 0,
    href: "/conditions/ptsd",
  },
  {
    slug: "als",
    name: "Amyotrophic Lateral Sclerosis (ALS)",
    state: "not_offered",
    summary: "A progressive neurodegenerative disease.",
    icd10Codes: ["G12.21"],
    programCount: 0,
    href: "/conditions/als",
  },
];

const CONDITION_DETAILS = {
  "diabetic-peripheral-neuropathy": {
    ...CONDITIONS[0],
    linkedPrograms: [
      {
        slug: "wst-057",
        name: "WST-057®",
        drug: "WST-057",
        phase: "Phase 2",
        form: "Topical",
        manufacturer: null,
      },
    ],
  },
  ptsd: {
    ...CONDITIONS[1],
    linkedPrograms: [],
  },
  als: {
    ...CONDITIONS[2],
    linkedPrograms: [],
  },
};

async function mockPublicApi(page: Page) {
  await page.route("**/v1/public/conditions**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/v1/public/conditions")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ conditions: CONDITIONS }),
      });
      return;
    }

    const slug = url.pathname.split("/").pop() ?? "";
    const detail = CONDITION_DETAILS[slug as keyof typeof CONDITION_DETAILS];
    await route.fulfill({
      status: detail ? 200 : 404,
      contentType: "application/json",
      body: JSON.stringify(
        detail ?? {
          error: { code: "not_found", message: "Condition not found." },
          requestId: "e2e",
        },
      ),
    });
  });

  await page.route("**/v1/public/search**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        query: "diabetic",
        sections: {
          conditions: [
            {
              type: "condition",
              slug: "diabetic-peripheral-neuropathy",
              name: "Diabetic peripheral neuropathy",
              state: "live",
              programCount: 1,
              href: "/conditions/diabetic-peripheral-neuropathy",
            },
          ],
          treatments: [],
          etcs: [],
        },
        totals: { conditions: 1, treatments: 0, etcs: 0 },
      }),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockPublicApi(page);
});

// Per directoryprd.md § 14, the door is /conditions and the conversion is
// /programs/:slug. These tests walk that journey end-to-end.

test.describe("Conditions browse flow", () => {
  test("home → conditions index → diabetic PN detail → WST-057 program", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Conditions" }).first().click();

    await expect(page).toHaveURL(/\/conditions$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Conditions with experimental treatments in",
    );

    // All three state sections render
    await expect(page.getByText("Available now")).toBeVisible();
    await expect(page.getByText("Coming soon")).toBeVisible();
    await expect(page.getByText("Not currently offered")).toBeVisible();

    await page.getByRole("link", { name: "Diabetic peripheral neuropathy" }).click();

    await expect(page).toHaveURL(/\/conditions\/diabetic-peripheral-neuropathy$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Diabetic peripheral neuropathy",
    );
    await expect(page.getByText("Available now in Montana").first()).toBeVisible();
    await expect(page.getByText("ICD-10 E11.40")).toBeVisible();
    await expect(page.getByText("ICD-10 E11.42")).toBeVisible();

    // Standard of care + advocacy + while-you-wait sections render
    await expect(page.getByText("Standard of care").first()).toBeVisible();

    // MedicalCondition JSON-LD is emitted with the right shape
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(jsonLd).toBeTruthy();
    const parsed = JSON.parse(jsonLd ?? "{}");
    expect(parsed["@type"]).toBe("MedicalCondition");
    expect(parsed.name).toContain("Diabetic peripheral neuropathy");
    expect(parsed.code?.codeValue).toBe("E11.40");
    expect(parsed.possibleTreatment?.[0]?.url).toMatch(/\/programs\/wst-057$/);

    // Program card → /programs/:slug
    await page
      .getByRole("link", { name: /WST-057/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/programs\/wst-057$/);
  });

  test("coming-soon: PTSD shows disabled signup + while-you-wait", async ({ page }) => {
    await page.goto("/conditions/ptsd");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Post-traumatic stress disorder (PTSD)",
    );
    await expect(page.getByText("Coming soon to Montana").first()).toBeVisible();

    // Disabled signup form (visible but disabled)
    const signupInput = page.getByPlaceholder(/Get notified when .* is listed/);
    await expect(signupInput).toBeDisabled();

    // While-you-wait section + ClinicalTrials.gov link
    await expect(page.getByRole("link", { name: /Search ClinicalTrials\.gov/ })).toBeVisible();

    // No off-topic program promotion
    await expect(page.getByText(/WST-057/)).toHaveCount(0);
  });

  test("not-offered: ALS shows the three-path panel, disabled signup, and no SOC", async ({
    page,
  }) => {
    await page.goto("/conditions/als");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Amyotrophic Lateral Sclerosis (ALS)",
    );
    await expect(page.getByText("Not currently offered").first()).toBeVisible();
    await expect(page.getByText("You may want to:")).toBeVisible();
    await expect(page.getByRole("link", { name: /Open ClinicalTrials\.gov/ })).toBeVisible();
    await expect(
      page.getByText("Talk to your treating physician about other options."),
    ).toBeVisible();

    const signupInput = page.getByPlaceholder(/Get notified if a Montana ETC adds a program/);
    await expect(signupInput).toBeDisabled();

    // No standard-of-care section per § 14.2 State C
    await expect(page.getByText("Standard of care")).toHaveCount(0);

    // Off-topic safety: WST-057 must not appear on an ALS page
    await expect(page.getByText(/WST-057/)).toHaveCount(0);
  });

  test("not-found: unknown slug renders not-found page with back-to-conditions link", async ({
    page,
  }) => {
    await page.goto("/conditions/this-slug-does-not-exist");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Condition not found");
    await expect(page.getByRole("link", { name: /All conditions/ })).toBeVisible();
  });
});

test.describe("Search overlay → condition detail integration", () => {
  test('search overlay click on "Diabetic peripheral neuropathy" lands on the detail page', async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByLabel("Search").click();
    await page.keyboard.type("diabetic");
    await page.getByRole("option", { name: /Diabetic peripheral neuropathy/ }).click();
    await expect(page).toHaveURL(/\/conditions\/diabetic-peripheral-neuropathy$/);
  });
});
