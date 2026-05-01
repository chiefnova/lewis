// @vitest-environment jsdom
import axe from "axe-core";
import type { PublicProgramDetail } from "@lewis/shared/api/public";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import messages from "../messages/en.json";

// Mock the public API so the page reaches its live state in jsdom.
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
  mechanismSummary: "WST-057 is a NaV1.7 inhibitor.\n\nIENFD increased 29% versus 4% placebo.",
  keySafetyFindings: "AEs were mild application-site erythema and pruritus.",
};

afterEach(() => {
  cleanup();
  document.head.innerHTML = "";
  mockGetProgram.mockReset();
});

const AXE_OPTIONS: axe.RunOptions = {
  rules: {
    region: { enabled: false },
    "color-contrast": { enabled: false },
  },
};

describe("TreatmentDetailPage a11y", () => {
  it("WST-057 live state renders without axe violations", async () => {
    mockGetProgram.mockResolvedValue(WST_057);
    const { container } = render(
      <IntlProvider locale="en" messages={messages}>
        <MemoryRouter initialEntries={["/programs/wst-057"]}>
          <Routes>
            <Route path="/programs/:slug" element={<TreatmentDetailPage />} />
          </Routes>
        </MemoryRouter>
      </IntlProvider>,
    );
    // Wait for the page to settle into the live state (heading appears
    // only after the API mock resolves and React commits the next render).
    await waitFor(() => expect(screen.getByText("WST-057®")).toBeDefined());
    const results = await axe.run(container, AXE_OPTIONS);
    expect(results.violations).toEqual([]);
  });
});
