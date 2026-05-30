// E2E spec for the /connect/:slug hybrid form (§ 18.1 / 18.2). API calls are
// fulfilled in-browser so this suite only needs the directory dev server;
// the DB/RLS + handler behavior is covered by the API integration tests in
// apps/api/src/domains/public-connect/routes.test.ts and the RLS suite
// packages/db/test/rls/0021_connect_requests_anonymous_insert.sql.

import { expect, test, type Page } from "@playwright/test";

const WST_057 = {
  slug: "wst-057",
  name: "WST-057®",
  indication: "for diabetic peripheral neuropathy",
  manufacturer: "WinSanTor",
  form: "Topical",
  phase: "Phase 2",
  etcCount: 1,
  available: true,
  about: "Investigational topical for painful diabetic peripheral neuropathy.",
  whoThisIsFor: "Adults with confirmed diabetic peripheral neuropathy.",
  enrollment: [],
  costRange: null,
  publishedEvidenceUrl: null,
  clinicalTrialsGovId: null,
  indNumber: null,
  publishedPaper: null,
  etrb: null,
  mechanismSummary: null,
  keySafetyFindings: null,
};

const BIG_SKY_SUMMARY = {
  slug: "big-sky",
  name: "Big Sky Experimental Treatment Center",
  city: "Bozeman",
  state: "MT",
  licenseNumber: "ETC-2025-001",
  acceptingPatients: true,
  lat: 45.677,
  lng: -111.0429,
  programCount: 1,
};

// Matches the PublicEtcDetail zod schema (address/phone/hours, required
// medicalDirector) — the directory client parses the raw response, so the
// mock must satisfy the schema (unlike the unit test, which mocks publicApi).
const BIG_SKY_DETAIL = {
  ...BIG_SKY_SUMMARY,
  about: "Montana's first licensed ETC.",
  address: ["1240 N Rouse Avenue", "Bozeman, MT 59715"],
  phone: null,
  hours: null,
  medicalDirector: {
    name: "Helena Marsh, MD",
    credentials: "MD, FACP",
    clinicalEmail: "medical.director@bigskyetc.com",
    clinicalPhone: null,
  },
  programs: [
    {
      slug: "wst-057",
      name: "WST-057",
      drug: "WST-057",
      indication: "Diabetic peripheral neuropathy",
      form: "topical",
      phase: "phase_2",
    },
  ],
  publicDocuments: [],
};

async function mockConnectApi(
  page: Page,
  options: { etcsEmpty?: boolean; submitStatus?: number } = {},
): Promise<void> {
  const { etcsEmpty = false, submitStatus = 200 } = options;

  // POST /v1/public/connect-requests — most specific first.
  await page.route("**/v1/public/connect-requests**", async (route) => {
    if (submitStatus !== 200) {
      await route.fulfill({
        status: submitStatus,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "internal_error", message: "Connect request failed." },
          requestId: "e2e",
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        connectRequestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        signupUrl: null,
        needsAccount: false,
      }),
    });
  });

  // One handler for both list + detail — branch on the URL so the greedy
  // `**/etcs**` glob can't serve the list payload to a detail request.
  await page.route("**/v1/public/etcs**", async (route) => {
    const isDetail = /\/v1\/public\/etcs\/big-sky(\b|\/|\?|$)/.test(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        isDetail ? BIG_SKY_DETAIL : { etcs: etcsEmpty ? [] : [BIG_SKY_SUMMARY] },
      ),
    });
  });

  await page.route("**/v1/public/programs/wst-057**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(WST_057),
    });
  });
}

test.describe("Connect-request flow (slice 5 § 18)", () => {
  test("submits the hybrid form and shows the success state", async ({ page }) => {
    await mockConnectApi(page);
    await page.goto("/connect/wst-057");

    // H1 names the offering ETC once the offering resolves.
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Big Sky");

    await page.getByLabel(/your name/i).fill("Sam Sample");
    await page.getByLabel(/email/i).fill("sam@example.com");
    await page.getByRole("button", { name: /send to/i }).click();

    // Success state: § 18.3 confirmation naming the ETC + prep checklist.
    await expect(
      page.getByRole("heading", { level: 1, name: /we've connected you with/i }),
    ).toContainText("Big Sky");
    await expect(page.getByText(/History & Physical/i)).toBeVisible();
  });

  test("shows an error alert (no success) when the submit fails", async ({ page }) => {
    await mockConnectApi(page, { submitStatus: 500 });
    await page.goto("/connect/wst-057");

    await page.getByLabel(/your name/i).fill("Sam Sample");
    await page.getByLabel(/email/i).fill("sam@example.com");
    await page.getByRole("button", { name: /send to/i }).click();

    await expect(page.getByRole("alert")).toContainText(/couldn't submit your request/i);
    await expect(
      page.getByRole("heading", { level: 1, name: /we've connected you with/i }),
    ).toHaveCount(0);
  });

  test("shows the calm not-found state when no ETC offers the program", async ({ page }) => {
    await mockConnectApi(page, { etcsEmpty: true });
    await page.goto("/connect/wst-057");

    await expect(
      page.getByText(/We couldn't find a Montana ETC offering this program/i),
    ).toBeVisible();
    // Scope to the not-found state CTA — "Browse treatments" also appears in
    // the topnav + footer chrome.
    await expect(page.locator(".connect-form__state-cta")).toHaveAttribute("href", "/browse");
  });
});
