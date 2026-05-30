// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";

import { ForEtcsPage } from "./ForEtcsPage";

afterEach(() => {
  cleanup();
});

function mount() {
  return render(
    <IntlProvider locale="en" messages={{}}>
      <MemoryRouter initialEntries={["/for-etcs"]}>
        <Routes>
          <Route path="/for-etcs" element={<ForEtcsPage />} />
        </Routes>
      </MemoryRouter>
    </IntlProvider>,
  );
}

describe("ForEtcsPage — § 22 (slice 5)", () => {
  it("renders the H1 'For Montana clinics operating under SB 535.'", () => {
    mount();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toMatch(/For Montana clinics operating/i);
    expect(h1.textContent).toMatch(/under SB 535/i);
  });

  it("opens with the RULE 16 framing in the intro", () => {
    mount();
    expect(
      screen.getByText(/If one rule defines whether an ETC can operate, it is RULE 16/i),
    ).toBeTruthy();
  });

  it("includes the ETRB callout block as the first H2 section, with composition + independence cites", () => {
    mount();
    expect(
      screen.getByRole("heading", { level: 2, name: /The ETRB workflow specifically/i }),
    ).toBeTruthy();
    // The accent callout label
    expect(screen.getByText(/RULE 16 — the operational keymaster/i)).toBeTruthy();
    // Composition under RULE 16(5) — at least 4 members
    expect(screen.getByText(/at least four members/i)).toBeTruthy();
    // Verbatim required composition (MT physician + outcomes researcher + ethicist)
    expect(
      screen.getByText(
        /at least one Montana-licensed physician, at least one researcher with expertise in clinical-outcome data, and at least one ethicist/i,
      ),
    ).toBeTruthy();
    // Independence requirement under RULE 16(3)
    expect(
      screen.getByText(/Members must be independent of the ETC under RULE 16\(3\)/i),
    ).toBeTruthy();
  });

  it("states the per-center fee structure with explicit SB 535 § 1(3) citation", () => {
    mount();
    expect(
      screen.getByRole("heading", { level: 2, name: /What the ETC license actually requires/i }),
    ).toBeTruthy();
    // Explicit per-center scoping — the misreading-prevention fix
    expect(
      screen.getByText(
        /Each additional program your ETC offers does not trigger a separate DPHHS fee/i,
      ),
    ).toBeTruthy();
    // The two fee amounts
    expect(screen.getByText(/\$10,000 one-time application fee/i)).toBeTruthy();
    expect(screen.getByText(/\$5,000 annual renewal/i)).toBeTruthy();
  });

  it("renders the 19-row RULE-by-RULE compliance table with RULE 16 row highlighted", () => {
    const { container } = mount();
    const compliance = container.querySelector(".for-etcs__compliance") as HTMLTableElement | null;
    expect(compliance).toBeTruthy();
    if (!compliance) return;
    // 19 data rows (excluding header row)
    const bodyRows = compliance.querySelectorAll("tbody tr");
    expect(bodyRows.length).toBe(19);
    // RULE 16 row is highlighted with the modifier class
    const highlighted = compliance.querySelector(".for-etcs__compliance-row--highlight");
    expect(highlighted).toBeTruthy();
    expect(highlighted?.textContent).toMatch(/ETRB workflow/i);
    expect(highlighted?.textContent).toMatch(/RULE 16/i);
    // Spot-check a few representative rows. "Licensure wizard" appears
    // twice in the module column (RULE 5 + RULE 23) so use getAllByText.
    expect(within(compliance).getByText(/License application/i)).toBeTruthy();
    expect(within(compliance).getAllByText(/Licensure wizard/i).length).toBeGreaterThanOrEqual(1);
    expect(within(compliance).getByText(/Adverse event reporting \(5-day clock\)/i)).toBeTruthy();
    expect(within(compliance).getByText(/HFAR \(Health Freedom and Access\)/i)).toBeTruthy();
  });

  it("renders the table coda with explicit '19 of 25 in MVP' framing", () => {
    mount();
    expect(screen.getByText(/19 of 25 rules covered in MVP/i)).toBeTruthy();
    expect(
      screen.getByText(/RULES 20 \(anesthesia\), 21 \(devices\), 24 \(inpatient\), 25/i),
    ).toBeTruthy();
  });

  it("renders the 13-row recurring deadlines table with both load-bearing annual dates", () => {
    const { container } = mount();
    expect(
      screen.getByRole("heading", { level: 2, name: /Recurring deadlines, accounted for/i }),
    ).toBeTruthy();
    const deadlines = container.querySelector(".for-etcs__deadlines") as HTMLTableElement | null;
    expect(deadlines).toBeTruthy();
    if (!deadlines) return;
    const bodyRows = deadlines.querySelectorAll("tbody tr");
    expect(bodyRows.length).toBe(13);
    // Load-bearing cadences must be present
    expect(within(deadlines).getByText(/5-day clock/i)).toBeTruthy();
    expect(within(deadlines).getByText(/Jan 31 · annual/i)).toBeTruthy();
    expect(within(deadlines).getByText(/Feb 1 · annual/i)).toBeTruthy();
    expect(within(deadlines).getByText(/Biennial/i)).toBeTruthy();
  });

  it("renders the HFAR Path B section with the 20-minute workflow line", () => {
    mount();
    expect(
      screen.getByRole("heading", { level: 2, name: /HFAR Path B in practice/i }),
    ).toBeTruthy();
    expect(screen.getByText(/2% of net annual profits/i)).toBeTruthy();
    expect(screen.getByText(/Insurance Premium Support Account/i)).toBeTruthy();
    expect(screen.getByText(/The full workflow takes 20 minutes/i)).toBeTruthy();
  });

  it("renders the pricing posture (flat monthly, no % of revenue, no patient charge)", () => {
    mount();
    expect(screen.getByRole("heading", { level: 2, name: /^Pricing\.$/i })).toBeTruthy();
    expect(
      screen.getByText(/flat monthly platform fee that scales with the number of programs/i),
    ).toBeTruthy();
    expect(
      screen.getByText(
        /We do not take a percentage of patient revenue\. We do not charge patients/i,
      ),
    ).toBeTruthy();
  });

  it("renders the Big Sky ETC + WinSanTor design-partner reference", () => {
    mount();
    expect(
      screen.getByRole("heading", { level: 2, name: /Built with the first Montana ETC/i }),
    ).toBeTruthy();
    expect(screen.getByText(/Big Sky ETC/i)).toBeTruthy();
    expect(screen.getByText(/WinSanTor/i)).toBeTruthy();
  });

  it("exposes the primary conversion as the shared FloatingCta (no sticky rail)", () => {
    // The two-column layout + sticky reference rail were removed in favor
    // of a single-column letter with the shared FloatingCta — same
    // component /for-manufacturers and /for-clinicians use. No element carries
    // aria-label="Reference" anymore.
    const { container } = mount();
    expect(screen.queryByLabelText("Reference")).toBeNull();
    const float = container.querySelector(".directory-floating-cta");
    expect(float).not.toBeNull();
    expect(float?.closest(".fade-up")).toBeNull();
    const cta = float?.querySelector(
      "a.directory-floating-cta__action",
    ) as HTMLAnchorElement | null;
    expect(cta).not.toBeNull();
    expect(cta?.getAttribute("href")).toBe("mailto:operators@lewis.health");
    expect(cta?.textContent).toMatch(/Start a conversation/i);
    expect(float?.textContent).toMatch(/Operating a Montana ETC\?/i);
  });

  it("inlines the 'How to get started' 5-step funnel as a closing section", () => {
    // Formerly a card in the deleted rail; now a full-width inline process
    // list. All five steps remain, in order.
    const { container } = mount();
    expect(screen.getByRole("heading", { level: 2, name: /How to get started/i })).toBeTruthy();
    const funnel = container.querySelector(".for-etcs__start-list") as HTMLElement;
    expect(funnel).toBeTruthy();
    expect(within(funnel).getByText(/Email us/i)).toBeTruthy();
    expect(within(funnel).getByText(/Initial call · 30 min/i)).toBeTruthy();
    expect(within(funnel).getByText(/Licensure wizard/i)).toBeTruthy();
    expect(within(funnel).getByText(/ETRB setup/i)).toBeTruthy();
    expect(within(funnel).getByText(/Platform onboarding/i)).toBeTruthy();
  });

  it("keeps both conversion paths reachable: email mailto + inline /platform link", () => {
    // The rail's two CTAs collapsed into (1) the FloatingCta email and
    // (2) an inline "operating platform" text link in the closing line.
    mount();
    const emailLinks = screen.getAllByRole("link", { name: /operators@lewis\.health/i });
    expect(emailLinks.length).toBeGreaterThanOrEqual(1);
    expect(emailLinks[0]?.getAttribute("href")).toBe("mailto:operators@lewis.health");
    const platform = screen.getByRole("link", { name: /operating platform/i });
    expect(platform.getAttribute("href")).toBe("/platform");
  });

  it("renders the signoff + independence footnote", () => {
    mount();
    expect(screen.getByText(/Direct ETC inquiries to operators@lewis\.health/i)).toBeTruthy();
    expect(screen.getByText(/— The Lewis team/i)).toBeTruthy();
    expect(
      screen.getByText(/Lewis is an independent directory and operating platform/i),
    ).toBeTruthy();
  });
});
