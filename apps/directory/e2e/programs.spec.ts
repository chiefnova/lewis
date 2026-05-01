// E2E spec for the /programs/:slug detail flow + brief.pdf download +
// loading/error/not-found states. API calls are fulfilled in-browser so
// this suite only needs the directory dev server; API/Postgres behavior
// is covered by the API integration tests in apps/api/src/domains/
// public-programs/routes.test.ts.

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
  whoThisIsFor:
    "Adults with confirmed diabetic peripheral neuropathy who have evaluated standard-of-care options.",
  enrollment: [],
  costRange: {
    low: 240000,
    high: 380000,
    currency: "USD",
    disclaimer: "Treatment cost is set by the ETC, not by Lewis.",
  },
  publishedEvidenceUrl: null,
  clinicalTrialsGovId: "NCT04742205",
  indNumber: "152367",
  publishedPaper: {
    citation: "Lancet eBioMedicine 2023;90:104525.",
    doi: "10.1016/j.ebiom.2023.104525",
  },
  etrb: { approvalDate: "2025-09-15", boardName: "Big Sky ETC ETRB" },
  mechanismSummary: "WST-057 is a NaV1.7 inhibitor.\n\nIENFD increased 29% vs 4% placebo.",
  keySafetyFindings: "Application-site erythema 18% vs 14% placebo. No serious AEs.",
};

async function mockProgramsApi(
  page: Page,
  options: {
    detailStatus?: number;
    pdfStatus?: number;
    detailDelayMs?: number;
  } = {},
) {
  const { detailStatus = 200, pdfStatus = 200, detailDelayMs = 0 } = options;

  await page.route("**/v1/public/programs/wst-057/brief.pdf**", async (route) => {
    if (pdfStatus !== 200) {
      await route.fulfill({
        status: pdfStatus,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "not_found", message: "Program not found." },
          requestId: "e2e",
        }),
      });
      return;
    }
    // Fake a real PDF body — starts with %PDF- magic bytes + padding so
    // the browser recognizes it as a downloadable file.
    const padding = Buffer.alloc(8 * 1024, 0x20);
    const pdfBody = Buffer.concat([
      Buffer.from("%PDF-1.7\n", "utf8"),
      padding,
      Buffer.from("\n%%EOF\n", "utf8"),
    ]);
    await route.fulfill({
      status: 200,
      contentType: "application/pdf",
      headers: {
        "content-disposition": `attachment; filename="lewis-brief-wst-057-20260430.pdf"`,
        "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
      },
      body: pdfBody,
    });
  });

  await page.route("**/v1/public/programs/**", async (route) => {
    if (detailDelayMs > 0) await new Promise((r) => setTimeout(r, detailDelayMs));
    if (detailStatus !== 200) {
      await route.fulfill({
        status: detailStatus,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "not_found", message: "Program not found." },
          requestId: "e2e",
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(WST_057),
    });
  });
}

// ===========================================================================
// Per directoryprd.md § 14.0 + § 15: /conditions is the door, /programs/:slug
// is the conversion. Slice 3 ships the conversion surface — these tests walk
// the clinician + patient personas through it.
// ===========================================================================

test.describe("Programs detail flow (slice 3)", () => {
  test("renders the live state with all clinical evidence + CTAs + Drug JSON-LD", async ({
    page,
  }) => {
    await mockProgramsApi(page);
    await page.goto("/programs/wst-057");

    // Header
    await expect(page.getByRole("heading", { level: 1 })).toContainText("WST-057®");
    await expect(page.getByText(/in Montana/).first()).toBeVisible();
    await expect(page.getByText(/WinSanTor/).first()).toBeVisible();

    // Clinical evidence panel + sub-sections
    await expect(page.getByText("Clinical evidence.")).toBeVisible();
    await expect(page.getByText("Trial registration").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "NCT04742205" })).toHaveAttribute(
      "href",
      "https://clinicaltrials.gov/study/NCT04742205",
    );
    await expect(page.getByText("IND number").first()).toBeVisible();
    await expect(page.getByText("152367").first()).toBeVisible();
    await expect(page.getByText("ETRB approval").first()).toBeVisible();
    await expect(page.getByText("Big Sky ETC ETRB", { exact: false })).toBeVisible();
    await expect(page.getByText("Mechanism").first()).toBeVisible();
    await expect(page.getByText(/NaV1.7 inhibitor/)).toBeVisible();
    await expect(page.getByText("Key safety findings").first()).toBeVisible();
    await expect(page.getByText(/Application-site erythema/)).toBeVisible();

    // Right-rail patient + physician CTAs
    await expect(page.getByRole("link", { name: /Check my eligibility/i }).first()).toHaveAttribute(
      "href",
      "/eligibility/wst-057",
    );
    await expect(page.getByRole("link", { name: /Refer this patient/i })).toHaveAttribute(
      "href",
      "/connect/wst-057?referrer=clinician",
    );
    await expect(page.getByRole("link", { name: /Download brief/i })).toHaveAttribute(
      "download",
      "",
    );

    // Cost panel — no [COUNSEL REVIEW] markers
    await expect(page.getByText(/\$2,400/)).toBeVisible();
    await expect(page.getByText(/\$3,800/)).toBeVisible();
    await expect(page.getByText(/Treatment cost is set by the ETC/)).toBeVisible();
    await expect(page.locator('text="[COUNSEL REVIEW]"')).toHaveCount(0);

    // Used Lewis feedback CTA wired with the program-ref query param.
    // Two "Share feedback" links exist on the page (page-level + footer);
    // we only care about the page-level one which carries the program ref.
    // Match by the page-ref href directly so the assertion stays stable
    // even if a future Footer "Share feedback" link is added or renamed.
    await expect(page.locator('a[href="/feedback?ref=program:wst-057"]')).toBeVisible();

    // Drug JSON-LD with augmentations
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(jsonLd).toBeTruthy();
    const parsed = JSON.parse(jsonLd ?? "{}") as Record<string, unknown>;
    expect(parsed["@type"]).toBe("Drug");
    expect(parsed.medicineSystem).toBe("WesternConventional");
    expect(parsed.prescribingInfo).toBe("https://clinicaltrials.gov/study/NCT04742205");
    expect(parsed.clinicalPharmacology).toContain("NaV1.7");
  });

  test("Refer this patient routes to /connect with clinician referrer", async ({ page }) => {
    await mockProgramsApi(page);
    await page.goto("/programs/wst-057");

    await page.getByRole("link", { name: /Refer this patient/i }).click();
    await expect(page).toHaveURL(/\/connect\/wst-057\?referrer=clinician$/);
  });

  test("Download brief is a native anchor pointing at the API brief.pdf endpoint", async ({
    page,
  }) => {
    await mockProgramsApi(page);
    await page.goto("/programs/wst-057");

    // The brief link is a plain <a download href="...api.../brief.pdf">.
    // We can't assert the actual download event because Chromium ignores
    // the `download` attribute on cross-origin URLs (the directory runs
    // on 127.0.0.1:13013 here, the link points at localhost:13001/v1/...);
    // the headers + body are exercised by the API integration test
    // (apps/api/src/domains/public-programs/routes.test.ts). We just
    // verify the anchor is wired correctly.
    const briefLink = page.getByRole("link", { name: /Download brief/i });
    await expect(briefLink).toHaveAttribute("href", /\/v1\/public\/programs\/wst-057\/brief\.pdf$/);
    await expect(briefLink).toHaveAttribute("download", "");
  });

  test("Check my eligibility routes to the eligibility self-screen", async ({ page }) => {
    await mockProgramsApi(page);
    await page.goto("/programs/wst-057");

    await page
      .getByRole("link", { name: /Check my eligibility/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/eligibility\/wst-057$/);
  });
});

// ===========================================================================
// Loading / error / not-found states — /design-shotgun Round 5 Variant A
// (page-shaped shimmer + serif inline state messages).
// ===========================================================================

test.describe("Programs detail — loading + error + not-found states", () => {
  test("loading state shows the page-shaped shimmer skeleton", async ({ page }) => {
    // Stall the API response so the skeleton stays mounted long enough to
    // assert against. 800ms is long enough to probe but short enough to
    // keep the test fast.
    await mockProgramsApi(page, { detailDelayMs: 800 });
    await page.goto("/programs/wst-057");

    // The skeleton article carries aria-busy=true while the API call is
    // in flight. Once data arrives, aria-busy disappears.
    const busyArticle = page.locator('article[aria-busy="true"]');
    await expect(busyArticle).toBeVisible();
  });

  test("error state shows the serif inline error + retry link + support email", async ({
    page,
  }) => {
    await mockProgramsApi(page, { detailStatus: 503 });
    await page.goto("/programs/wst-057");

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText(/couldn't load this treatment/i)).toBeVisible();
    await expect(page.getByText(/network hiccup/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Try again/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "support@lewis.health" })).toHaveAttribute(
      "href",
      "mailto:support@lewis.health",
    );
  });

  test("not-found state shows the serif inline message + back-to-browse pill", async ({ page }) => {
    await mockProgramsApi(page, { detailStatus: 404 });
    await page.goto("/programs/missing-slug");

    await expect(page.getByText(/couldn't find a treatment/i)).toBeVisible();
    await expect(page.getByText(/link may have changed/i)).toBeVisible();
    // Two back-to-browse links render (small text link above heading + pill below)
    const backLinks = page.getByRole("link", { name: /Back to browse/i });
    await expect(backLinks.first()).toHaveAttribute("href", "/browse");
  });
});
