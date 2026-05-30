// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IntlProvider } from "react-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as ApiClientModule from "../api/client";

// Mock the public API client BEFORE importing the page so the page picks
// up the mock. publicApi.* is the single boundary between this page and
// the network.
const submitConnectRequest = vi.fn();
const getProgram = vi.fn();
const listEtcs = vi.fn();
const getEtc = vi.fn();

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

const WST057 = {
  slug: "wst-057",
  name: "WST-057",
  indication: "Diabetic peripheral neuropathy",
  manufacturer: null,
  form: "Topical" as const,
  phase: "Phase 2" as const,
  etcCount: 1,
  available: true,
  about: "A small-molecule topical for DPN.",
  whoThisIsFor: "Adult DPN patients in Montana.",
  enrollment: ["Confirmed DPN diagnosis"],
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
  state: "MT" as const,
  licenseNumber: "ETC-2025-001",
  acceptingPatients: true,
  lat: 45.677,
  lng: -111.0429,
  programCount: 1,
};

const BIG_SKY_DETAIL = {
  ...BIG_SKY_SUMMARY,
  about: "Montana's first licensed ETC.",
  directoryAddressLines: ["1240 N Rouse Avenue", "Bozeman, MT 59715"],
  directoryPhone: null,
  directoryHours: null,
  medicalDirector: null,
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

function mount() {
  return render(
    <IntlProvider locale="en" messages={{}}>
      <MemoryRouter initialEntries={["/connect/wst-057"]}>
        <Routes>
          <Route path="/connect/:programSlug" element={<ConnectPage />} />
        </Routes>
      </MemoryRouter>
    </IntlProvider>,
  );
}

beforeEach(() => {
  getProgram.mockResolvedValue(WST057);
  listEtcs.mockResolvedValue({ etcs: [BIG_SKY_SUMMARY] });
  getEtc.mockResolvedValue(BIG_SKY_DETAIL);
  submitConnectRequest.mockResolvedValue({
    connectRequestId: "11111111-1111-4111-8111-111111111111",
    signupUrl: null,
    needsAccount: false,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("ConnectPage — § 18.1 hybrid form", () => {
  it("renders the H1 naming the offering ETC", async () => {
    mount();
    const h1 = await screen.findByRole("heading", { level: 1 });
    expect(h1.textContent).toMatch(/A note to/i);
    expect(h1.textContent).toMatch(/Big Sky/i);
  });

  it("renders the § 18.1 privacy framing block above the form", async () => {
    mount();
    expect(await screen.findByText(/Your information goes only to/i)).toBeTruthy();
    expect(screen.getByText(/Lewis does not sell or share contact information/i)).toBeTruthy();
    expect(screen.getByText(/Lewis is not a marketing company/i)).toBeTruthy();
  });

  it("situation textarea is OPTIONAL (§ 18.1 revision)", async () => {
    mount();
    const ta = (await screen.findByLabelText(/brief situation/i)) as HTMLTextAreaElement;
    expect(ta.required).toBe(false);
  });

  it("textarea warning text uses the § 18.1 refined copy", async () => {
    mount();
    await screen.findByLabelText(/brief situation/i);
    expect(screen.getByText(/Please don't share specific medical details here/i)).toBeTruthy();
    expect(screen.getByText(/your ETC clinical team will collect those securely/i)).toBeTruthy();
  });

  it("renders 4 'What happens next' steps in order on the right rail", async () => {
    mount();
    const headings = await screen.findAllByRole("heading", { level: 2 });
    const titles = headings.map((h) => h.textContent ?? "");
    expect(titles).toContain("You submit this note");
    expect(titles).toContain("They reach out within two business days");
    expect(titles).toContain("Clinical review");
    expect(titles).toContain("Account, if you want one");
    const i1 = titles.indexOf("You submit this note");
    const i4 = titles.indexOf("Account, if you want one");
    expect(i1).toBeLessThan(i4);
  });

  it("submit calls publicApi.submitConnectRequest with the right shape (anonymous-first)", async () => {
    mount();
    await screen.findByLabelText(/your name/i);
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "Sam Sample" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "sam@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send to/i }));

    await waitFor(() => expect(submitConnectRequest).toHaveBeenCalledTimes(1));
    const [payload] = submitConnectRequest.mock.calls[0]!;
    expect(payload.programSlug).toBe("wst-057");
    expect(payload.name).toBe("Sam Sample");
    expect(payload.email).toBe("sam@example.com");
    // Phone and situation optional → null when blank. bestTimeToContact
    // was removed from the form per user override; payload always null.
    expect(payload.phone).toBeNull();
    expect(payload.bestTimeToContact).toBeNull();
    expect(payload.situation).toBeNull();
    // No eligibility session token in localStorage by default.
    expect(payload.eligibilitySessionToken).toBeNull();
  });

  it("renders the success state with the ETC name + prep checklist after submit", async () => {
    mount();
    await screen.findByLabelText(/your name/i);
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "Sam Sample" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "sam@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send to/i }));

    const successH1 = await screen.findByRole("heading", {
      level: 1,
      name: /we've connected you with/i,
    });
    expect(successH1.textContent).toMatch(/Big Sky/i);
    // § 18.3 prep checklist
    expect(screen.getByText(/treating clinician's written recommendation/i)).toBeTruthy();
    expect(screen.getByText(/History & Physical/i)).toBeTruthy();
  });

  it("submit button is disabled until name + email are filled", async () => {
    mount();
    const submitBtn = await screen.findByRole("button", { name: /send to/i });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "Sam" } });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "sam@example.com" } });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it("trims phone + situation and sends null when empty after trim", async () => {
    mount();
    await screen.findByLabelText(/your name/i);
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "Sam" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "sam@example.com" } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "   " } });
    fireEvent.change(screen.getByLabelText(/brief situation/i), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: /send to/i }));

    await waitFor(() => expect(submitConnectRequest).toHaveBeenCalledTimes(1));
    const [payload] = submitConnectRequest.mock.calls[0]!;
    expect(payload.phone).toBeNull();
    expect(payload.situation).toBeNull();
  });

  it("does NOT render a 'Best time to contact' field", async () => {
    mount();
    await screen.findByLabelText(/your name/i);
    expect(screen.queryByLabelText(/best time to contact/i)).toBeNull();
  });

  it("renders an error alert (and no success state) when submit fails", async () => {
    submitConnectRequest.mockRejectedValueOnce(new Error("network boom"));
    mount();
    await screen.findByLabelText(/your name/i);
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "Sam Sample" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "sam@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send to/i }));

    // The friendly fallback error surfaces in the role=alert block.
    expect(await screen.findByText(/We couldn't submit your request/i)).toBeTruthy();
    // The success state must NOT render on a failed submit.
    expect(
      screen.queryByRole("heading", { level: 1, name: /we've connected you with/i }),
    ).toBeNull();
  });

  it("attaches a stored eligibility token (UUID) to the submit payload (§ 18.2 join)", async () => {
    const token = "22222222-2222-4222-8222-222222222222";
    window.localStorage.setItem("lewis:eligibility:wst-057", token);
    mount();
    await screen.findByLabelText(/your name/i);
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "Sam Sample" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "sam@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send to/i }));

    await waitFor(() => expect(submitConnectRequest).toHaveBeenCalledTimes(1));
    const [payload] = submitConnectRequest.mock.calls[0]!;
    expect(payload.eligibilitySessionToken).toBe(token);
  });

  it("shows not-found state when no ETC offers the program", async () => {
    listEtcs.mockResolvedValueOnce({ etcs: [] });
    mount();
    expect(
      await screen.findByText(/We couldn't find a Montana ETC offering this program/i),
    ).toBeTruthy();
    // Back-to-browse link present.
    expect(screen.getByRole("link", { name: /browse treatments/i }).getAttribute("href")).toBe(
      "/browse",
    );
  });
});
