// @vitest-environment jsdom
import type { PublicProgramDetail } from "@lewis/shared/api/public";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import messages from "../messages/en.json";

// Mock the public API client. Each test sets the mock implementation it
// needs. Mirrors the slice 2 pattern in
// apps/directory/src/pages/conditions/ConditionDetailPage.test.tsx.
import type * as ApiClient from "../api/client";
type ApiClientModule = typeof ApiClient;

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<ApiClientModule>("../api/client");
  return {
    ...actual,
    publicApi: {
      ...actual.publicApi,
      getProgram: vi.fn<(slug: string) => Promise<PublicProgramDetail>>(),
    },
  };
});

import { publicApi } from "../api/client";
import { TreatmentDetailPage } from "./TreatmentDetailPage";

const mockGetProgram = publicApi.getProgram as ReturnType<
  typeof vi.fn<(slug: string) => Promise<PublicProgramDetail>>
>;

const WST_057: PublicProgramDetail = {
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
  mechanismSummary:
    "WST-057 is a topically applied small-molecule inhibitor of NaV1.7 voltage-gated sodium channels.\n\nIn the Phase 2a trial, IENFD increased by a mean of 29% versus 4% in placebo at 12 weeks.",
  keySafetyFindings:
    "In Phase 2a (n=82), the most common adverse events were application-site erythema and pruritus.",
};

afterEach(() => {
  cleanup();
  document.head.innerHTML = "";
  mockGetProgram.mockReset();
});

function mount(path: string) {
  return render(
    <IntlProvider locale="en" messages={messages}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/programs/:slug" element={<TreatmentDetailPage />} />
        </Routes>
      </MemoryRouter>
    </IntlProvider>,
  );
}

describe("TreatmentDetailPage — live state (WST-057)", () => {
  it("renders header, available tag, and manufacturer line", async () => {
    mockGetProgram.mockResolvedValue(WST_057);
    mount("/programs/wst-057");
    await waitFor(() => expect(screen.getByText("WST-057®")).toBeDefined());
    // The available tag is split across spans (Available + now + in Montana)
    // so we target it via its container class. The .program-available-tag
    // element is the canonical home for the tag text.
    const availableTag = document.querySelector(".program-available-tag");
    expect(availableTag).not.toBeNull();
    expect(availableTag!.textContent ?? "").toMatch(/Available\s+now\s+in\s+Montana/);
    // Manufacturer name appears in the manufacturer line below the tag.
    expect(screen.getByText(/WinSanTor/)).toBeDefined();
  });

  it("renders the Clinical evidence panel with all evidence sub-blocks", async () => {
    mockGetProgram.mockResolvedValue(WST_057);
    mount("/programs/wst-057");
    await waitFor(() => expect(screen.getByText("Clinical evidence.")).toBeDefined());

    // 4-field grid
    expect(screen.getByText("Trial registration")).toBeDefined();
    expect(screen.getByText("NCT04742205")).toBeDefined();
    expect(screen.getByText("IND number")).toBeDefined();
    expect(screen.getByText("152367")).toBeDefined();
    expect(screen.getByText("ETRB approval")).toBeDefined();

    // Mechanism + safety prose
    expect(screen.getByText("Mechanism")).toBeDefined();
    expect(screen.getByText(/NaV1.7 voltage-gated sodium channels/)).toBeDefined();
    expect(screen.getByText("Key safety findings")).toBeDefined();
    expect(screen.getByText(/application-site erythema/)).toBeDefined();

    // DOI citation
    expect(screen.getByText(/Lancet eBioMedicine 2023/)).toBeDefined();
    expect(screen.getByText(/doi.org\/10.1016\/j.ebiom.2023.104525/)).toBeDefined();
  });

  it("links to ClinicalTrials.gov with the trial ID", async () => {
    mockGetProgram.mockResolvedValue(WST_057);
    mount("/programs/wst-057");
    const link = await screen.findByRole("link", { name: "NCT04742205" });
    expect(link.getAttribute("href")).toBe("https://clinicaltrials.gov/study/NCT04742205");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("renders the patient eligibility CTA in the right rail (primary fill)", async () => {
    mockGetProgram.mockResolvedValue(WST_057);
    mount("/programs/wst-057");
    await waitFor(() => expect(screen.getByText("Clinical evidence.")).toBeDefined());

    // Two eligibility CTAs render: the rail primary CTA + the mobile-only
    // fallback inside the body's Who-this-is-for panel. Both link to
    // /eligibility/{slug}; we just verify the rail one has primary-fill
    // styling so the visual hierarchy is intact.
    const eligibilityLinks = screen.getAllByRole("link", { name: /Check my eligibility/i });
    expect(eligibilityLinks.length).toBeGreaterThanOrEqual(1);
    for (const link of eligibilityLinks) {
      expect(link.getAttribute("href")).toBe("/eligibility/wst-057");
    }
    expect(eligibilityLinks.some((l) => l.classList.contains("pill-primary"))).toBe(true);
  });

  it("renders Refer this patient with the clinician referrer query param", async () => {
    mockGetProgram.mockResolvedValue(WST_057);
    mount("/programs/wst-057");
    const referLink = await screen.findByRole("link", { name: /Refer this patient/i });
    expect(referLink.getAttribute("href")).toBe("/connect/wst-057?referrer=clinician");
  });

  it("renders Download brief as a native anchor with download attribute hitting the API", async () => {
    mockGetProgram.mockResolvedValue(WST_057);
    mount("/programs/wst-057");
    const briefLink = await screen.findByRole("link", { name: /Download brief/i });
    expect(briefLink.getAttribute("href")).toMatch(/\/v1\/public\/programs\/wst-057\/brief\.pdf$/);
    expect(briefLink.hasAttribute("download")).toBe(true);
  });

  it("renders the cost panel without the [COUNSEL REVIEW] marker", async () => {
    mockGetProgram.mockResolvedValue(WST_057);
    mount("/programs/wst-057");
    await waitFor(() => expect(screen.getByText(/\$2,400.*\$3,800/)).toBeDefined());
    expect(screen.getByText(/Treatment cost is set by the ETC/)).toBeDefined();
    // Critical: the [COUNSEL REVIEW] markers from the old page must not
    // appear anywhere on the rendered page.
    expect(screen.queryByText(/\[COUNSEL REVIEW\]/)).toBeNull();
  });

  it("wires the Used Lewis feedback CTA to /feedback?ref=program:{slug}", async () => {
    mockGetProgram.mockResolvedValue(WST_057);
    mount("/programs/wst-057");
    const fbLink = await screen.findByRole("link", { name: /Share feedback/i });
    expect(fbLink.getAttribute("href")).toBe("/feedback?ref=program:wst-057");
  });

  it("renders the section nav with anchor links to all 6 sections", async () => {
    mockGetProgram.mockResolvedValue(WST_057);
    mount("/programs/wst-057");
    await waitFor(() => expect(screen.getByText("Clinical evidence.")).toBeDefined());

    const nav = screen.getByRole("complementary", { name: /On this page/i });
    expect(nav).toBeDefined();
    for (const label of [
      "About",
      "Evidence",
      "Eligibility",
      "Where to access",
      "Enrollment",
      "Cost",
    ]) {
      expect(nav.querySelector(`a[href="#${anchorId(label)}"]`)).not.toBeNull();
    }
  });

  it("emits the augmented Drug JSON-LD with prescribingInfo + clinicalPharmacology", async () => {
    mockGetProgram.mockResolvedValue(WST_057);
    mount("/programs/wst-057");
    await waitFor(() => expect(screen.getByText("WST-057®")).toBeDefined());

    const ld = document.head.querySelector('script[type="application/ld+json"]');
    expect(ld).not.toBeNull();
    const parsed = JSON.parse(ld!.textContent ?? "{}") as Record<string, unknown>;
    expect(parsed["@type"]).toBe("Drug");
    expect(parsed.medicineSystem).toBe("WesternConventional");
    expect(parsed.prescribingInfo).toBe("https://clinicaltrials.gov/study/NCT04742205");
    expect(parsed.clinicalPharmacology).toContain("NaV1.7");
  });
});

describe("TreatmentDetailPage — graceful degradation", () => {
  it("hides clinical-evidence sub-blocks when their data is null", async () => {
    mockGetProgram.mockResolvedValue({
      ...WST_057,
      clinicalTrialsGovId: null,
      indNumber: null,
      publishedPaper: null,
      etrb: null,
      mechanismSummary: null,
      keySafetyFindings: null,
    });
    mount("/programs/wst-057");
    await waitFor(() => expect(screen.getByText("WST-057®")).toBeDefined());

    expect(screen.queryByText("Trial registration")).toBeNull();
    expect(screen.queryByText("IND number")).toBeNull();
    expect(screen.queryByText("ETRB approval")).toBeNull();
    expect(screen.queryByText("Mechanism")).toBeNull();
    expect(screen.queryByText("Key safety findings")).toBeNull();
  });

  it("hides cost panel content when costRange is null", async () => {
    mockGetProgram.mockResolvedValue({ ...WST_057, costRange: null });
    mount("/programs/wst-057");
    await waitFor(() => expect(screen.getByText("WST-057®")).toBeDefined());
    // The h2 "What this typically costs." still renders (it's outside
    // the ProgramCostPanel component) but the price + disclaimer shouldn't.
    expect(screen.queryByText(/\$2,400/)).toBeNull();
    expect(screen.queryByText(/Treatment cost is set by the ETC/)).toBeNull();
  });
});

describe("TreatmentDetailPage — error + not-found", () => {
  it("renders the not-found block + back-to-browse link on 404", async () => {
    const { ApiNetworkError } = await vi.importActual<ApiClientModule>("../api/client");
    mockGetProgram.mockRejectedValue(new ApiNetworkError(404, "Not Found"));
    mount("/programs/missing");
    await waitFor(() => {
      expect(screen.getByText(/couldn't find a treatment/i)).toBeDefined();
    });
    // Two back-to-browse links render: one above the heading (small text
    // back-link) + one below as a pill action. Both point at /browse.
    const backLinks = screen.getAllByRole("link", { name: /Back to browse/i });
    expect(backLinks.length).toBeGreaterThanOrEqual(1);
    for (const l of backLinks) {
      expect(l.getAttribute("href")).toBe("/browse");
    }
  });

  it("renders the error block + retry on a non-404 network error", async () => {
    const { ApiNetworkError } = await vi.importActual<ApiClientModule>("../api/client");
    mockGetProgram.mockRejectedValue(new ApiNetworkError(503, "Service Unavailable"));
    mount("/programs/wst-057");
    await waitFor(() => expect(screen.getByRole("alert")).toBeDefined());
    expect(screen.getByText(/couldn't load this treatment/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Try again/i })).toBeDefined();
  });
});

// Mirrors SECTIONS array in TreatmentDetailPage for the section-nav test.
function anchorId(label: string): string {
  switch (label) {
    case "About":
      return "about";
    case "Evidence":
      return "evidence";
    case "Eligibility":
      return "eligibility";
    case "Where to access":
      return "etc-where";
    case "Enrollment":
      return "enrollment";
    case "Cost":
      return "cost";
    default:
      return label.toLowerCase().replace(/\s+/g, "-");
  }
}
