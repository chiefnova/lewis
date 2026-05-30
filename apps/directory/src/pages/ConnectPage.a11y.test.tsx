// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IntlProvider } from "react-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as ApiClientModule from "../api/client";

const getProgram = vi.fn();
const listEtcs = vi.fn();
const getEtc = vi.fn();
const submitConnectRequest = vi.fn();

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<typeof ApiClientModule>("../api/client");
  return {
    ...actual,
    publicApi: {
      getProgram: (...args: Parameters<typeof getProgram>) => getProgram(...args),
      listEtcs: (...args: Parameters<typeof listEtcs>) => listEtcs(...args),
      getEtc: (...args: Parameters<typeof getEtc>) => getEtc(...args),
      submitConnectRequest: (...args: Parameters<typeof submitConnectRequest>) =>
        submitConnectRequest(...args),
    },
  };
});

import { ConnectPage } from "./ConnectPage";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const AXE_OPTIONS: axe.RunOptions = {
  rules: {
    region: { enabled: false },
    "color-contrast": { enabled: false },
  },
};

beforeEach(() => {
  getProgram.mockResolvedValue({
    slug: "wst-057",
    name: "WST-057",
    indication: "DPN",
    manufacturer: null,
    form: "Topical",
    phase: "Phase 2",
    etcCount: 1,
    available: true,
    about: "About.",
    whoThisIsFor: "DPN patients.",
    enrollment: ["DPN"],
    costRange: null,
    publishedEvidenceUrl: null,
    clinicalTrialsGovId: null,
    indNumber: null,
    publishedPaper: null,
    etrb: null,
    mechanismSummary: null,
    keySafetyFindings: null,
  });
  listEtcs.mockResolvedValue({
    etcs: [
      {
        slug: "big-sky",
        name: "Big Sky ETC",
        city: "Bozeman",
        state: "MT",
        licenseNumber: "ETC-2025-001",
        acceptingPatients: true,
        lat: 45.677,
        lng: -111.0429,
        programCount: 1,
      },
    ],
  });
  getEtc.mockResolvedValue({
    slug: "big-sky",
    name: "Big Sky ETC",
    city: "Bozeman",
    state: "MT",
    licenseNumber: "ETC-2025-001",
    acceptingPatients: true,
    lat: 45.677,
    lng: -111.0429,
    programCount: 1,
    about: "MT's first licensed ETC.",
    directoryAddressLines: ["1240 N Rouse Avenue"],
    directoryPhone: null,
    directoryHours: null,
    medicalDirector: null,
    programs: [
      {
        slug: "wst-057",
        name: "WST-057",
        drug: "WST-057",
        indication: "DPN",
        form: "topical",
        phase: "phase_2",
      },
    ],
    publicDocuments: [],
  });
});

describe("ConnectPage a11y", () => {
  it("loaded form renders without axe violations", async () => {
    const { container } = render(
      <IntlProvider locale="en" messages={{}}>
        <MemoryRouter initialEntries={["/connect/wst-057"]}>
          <Routes>
            <Route path="/connect/:programSlug" element={<ConnectPage />} />
          </Routes>
        </MemoryRouter>
      </IntlProvider>,
    );
    // Wait for the loaded state — H1 lives in elig… er, connect-form__h1
    // and renders "A note to <em>Big Sky ETC</em>." once the offering ETC
    // resolves.
    await screen.findByRole("heading", { level: 1, name: /A note to/i });
    const results = await axe.run(container, AXE_OPTIONS);
    expect(results.violations).toEqual([]);
  });
});
