// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";

import { ForPlatformPage } from "./ForPlatformPage";

afterEach(() => {
  cleanup();
});

function mount() {
  return render(
    <IntlProvider locale="en" messages={{}}>
      <MemoryRouter initialEntries={["/platform"]}>
        <Routes>
          <Route path="/platform" element={<ForPlatformPage />} />
        </Routes>
      </MemoryRouter>
    </IntlProvider>,
  );
}

describe("ForPlatformPage — § 23 (slice 5, /design-shotgun Round 6)", () => {
  it("renders the H1 'The operating platform behind every Montana ETC.'", () => {
    mount();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toMatch(/The operating platform behind every/i);
    expect(h1.textContent).toMatch(/Montana ETC/i);
  });

  it("renders the substrate paragraph verbatim per PRD § 23.2", () => {
    const { container } = mount();
    // textContent traverses the strong/em elements interrupting the prose
    expect(container.textContent ?? "").toMatch(
      /The operating platform Lewis runs at app\.lewis\.health is the system of record for Montana's Experimental Treatment Center regime/i,
    );
    expect(container.textContent ?? "").toMatch(
      /Lewis is the substrate\. The clinic operates; the platform records\./i,
    );
  });

  it("renders the 'Why this platform exists' section with three numbered editorial beats", () => {
    mount();
    expect(
      screen.getByRole("heading", { level: 2, name: /Why this platform exists/i }),
    ).toBeTruthy();
    // Three H3 sub-sections with statutory anchors
    expect(
      screen.getByRole("heading", { level: 3, name: /The regime is brand new/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: /The compliance surface is wide and the deadlines are real/i,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: /Right to Try only works if the four sides connect/i,
      }),
    ).toBeTruthy();
    // SB 535 May 2025 / MAR April 2026 enactment dates
    expect(screen.getByText(/May 2025/)).toBeTruthy();
    expect(screen.getByText(/April 2026/)).toBeTruthy();
    expect(screen.getByText(/No fit-for-purpose software existed/i)).toBeTruthy();
  });

  it("renders the corrected chain of dependencies in paragraph iii (ETRB reviews protocol, NOT patient letters)", () => {
    const { container } = mount();
    const text = container.textContent ?? "";
    // Critical line — ETRB reviews program/drug, not patient enrollment
    expect(text).toMatch(/the board reviews the program and the drug, not the individual patient/i);
    // Three patient-side prerequisites land together
    expect(text).toMatch(
      /recommendation from a treating health care provider \(§ 50-12-104\(2\)\)/i,
    );
    expect(text).toMatch(/written informed consent \(§ 50-12-105\)/i);
    // "The regime is a market of handoffs." also appears as the H2 below;
    // assert the text exists in the document at least once.
    expect(text).toMatch(/The regime is a market of handoffs/i);
  });

  it("renders the 12-row handoffs table — the load-bearing element", () => {
    const { container } = mount();
    expect(
      screen.getByRole("heading", { level: 2, name: /The regime is a market of handoffs/i }),
    ).toBeTruthy();
    const handoffs = container.querySelector(".for-plat__handoffs") as HTMLTableElement | null;
    expect(handoffs).toBeTruthy();
    if (!handoffs) return;
    const bodyRows = handoffs.querySelectorAll("tbody tr");
    expect(bodyRows.length).toBe(12);
    // Statutory citations — all verified line-by-line against the legislation
    expect(within(handoffs).getByText(/§ 50-12-103\(1\)/)).toBeTruthy();
    expect(within(handoffs).getByText(/§ 50-12-104\(2\)/)).toBeTruthy();
    expect(within(handoffs).getByText(/RULE 12\(2\)\(b\)\(ii\)/)).toBeTruthy();
    expect(within(handoffs).getByText(/§ 50-12-105/)).toBeTruthy();
    expect(within(handoffs).getByText(/^RULE 11$/)).toBeTruthy();
    expect(within(handoffs).getByText(/RULE 16\(6\)\(c\)/)).toBeTruthy();
    // Statutory clocks called out inline
    expect(within(handoffs).getByText(/5-day clock/i)).toBeTruthy();
    expect(within(handoffs).getByText(/due Jan 31/i)).toBeTruthy();
    expect(within(handoffs).getByText(/due Feb 1/i)).toBeTruthy();
  });

  it("renders the handoffs coda with 12-row count + 3-clock callout", () => {
    mount();
    expect(
      screen.getByText(/Twelve handoffs, four actor classes, statutory clocks on three of them/i),
    ).toBeTruthy();
  });

  it("renders the 4-row persona before/after grid (patients, clinicians, manufacturers, ETC operators)", () => {
    const { container } = mount();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /What changes when the handoff goes through Lewis/i,
      }),
    ).toBeTruthy();
    const changes = container.querySelector(".for-plat__changes");
    expect(changes).toBeTruthy();
    if (!changes) return;
    const rows = changes.querySelectorAll(".for-plat__change-row");
    expect(rows.length).toBe(4);
    // Each persona named in the "who" column
    expect(within(changes as HTMLElement).getByText(/^Patients$/i)).toBeTruthy();
    expect(within(changes as HTMLElement).getByText(/^Clinicians$/i)).toBeTruthy();
    expect(within(changes as HTMLElement).getByText(/^Manufacturers$/i)).toBeTruthy();
    expect(within(changes as HTMLElement).getByText(/^ETC operators$/i)).toBeTruthy();
    // The clinician row uses the corrected § 50-12-104(2) citation, not
    // the wrong "SB 535 § 1(4)(b)" that the earlier draft carried.
    expect(
      within(changes as HTMLElement).getByText(
        /§ 50-12-104\(2\) treating-clinician recommendation/i,
      ),
    ).toBeTruthy();
  });

  it("renders the 10-row modules list with corrected § 50-12-105(3)(b) recorded-consent citation", () => {
    const { container } = mount();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /The modules, in service of the handoffs/i,
      }),
    ).toBeTruthy();
    const modules = container.querySelector(".for-plat__modules");
    expect(modules).toBeTruthy();
    if (!modules) return;
    const items = modules.querySelectorAll("li");
    expect(items.length).toBe(10);
    // Recorded informed consent now correctly cites § 50-12-105(3)(b)
    expect(
      within(modules as HTMLElement).getByText(
        /recorded informed consent \(§ 50-12-105\(3\)\(b\)\)/i,
      ),
    ).toBeTruthy();
    // ETRB workflow row clarifies ≥4-member is BOARD composition, not voting threshold
    expect(
      within(modules as HTMLElement).getByText(/voting by a ≥4-member board \(RULE 16\(5\)\)/i),
    ).toBeTruthy();
  });

  it("renders the 19-row compliance mapping table with audit-evidence column + RULE 16 highlighted", () => {
    const { container } = mount();
    expect(screen.getByRole("heading", { level: 2, name: /^Compliance mapping\.$/i })).toBeTruthy();
    const compliance = container.querySelector(".for-plat__compliance") as HTMLTableElement | null;
    expect(compliance).toBeTruthy();
    if (!compliance) return;
    const bodyRows = compliance.querySelectorAll("tbody tr");
    expect(bodyRows.length).toBe(19);
    const highlighted = compliance.querySelector(".for-plat__compliance-row--highlight");
    expect(highlighted).toBeTruthy();
    expect(highlighted?.textContent).toMatch(/RULE 16/i);
    expect(highlighted?.textContent).toMatch(/ETRB/i);
  });

  it("renders the table coda with explicit '19 of 25 in MVP' framing", () => {
    mount();
    expect(screen.getByText(/19 of 25 rules covered in MVP/i)).toBeTruthy();
    expect(screen.getByText(/RULES 20, 21, 24, 25/i)).toBeTruthy();
  });

  it("renders the 6-card security posture grid with vendor-genericized copy", () => {
    const { container } = mount();
    expect(
      screen.getByRole("heading", { level: 2, name: /Security & compliance posture/i }),
    ).toBeTruthy();
    const grid = container.querySelector(".for-plat__security-grid");
    expect(grid).toBeTruthy();
    if (!grid) return;
    const cards = grid.querySelectorAll(".for-plat__security-card");
    expect(cards.length).toBe(6);
    // Spot-check the six card eyebrows (vendor names absent — generic posture
    // only). Scope to the eyebrow class because the card body prose also
    // mentions some of these terms ("JWT-based authentication" etc.).
    const eyebrows = Array.from(grid.querySelectorAll(".for-plat__security-card__t")).map(
      (el) => el.textContent?.trim() ?? "",
    );
    expect(eyebrows).toEqual([
      "Tenant isolation",
      "Authentication",
      "Audit log",
      "PHI in logs",
      "SOC 2 readiness",
      "HIPAA posture",
    ]);
    // Vendor names should NOT appear anywhere in the grid (genericized
    // per user direction).
    const gridText = (grid as HTMLElement).textContent ?? "";
    expect(gridText).not.toMatch(/Supabase/i);
    expect(gridText).not.toMatch(/Clerk\b/i);
    expect(gridText).not.toMatch(/Vanta/i);
  });

  it("renders the demo copy and exposes the shared floating Talk to our team CTA", () => {
    const { container } = mount();
    expect(container.textContent ?? "").toMatch(
      /Email hello@lewis\.health to schedule a 30-minute walkthrough/i,
    );
    const floatingCta = container.querySelector(".directory-floating-cta");
    expect(floatingCta).toBeTruthy();
    if (!floatingCta) return;
    expect(floatingCta.textContent).toMatch(/Operating platform/i);
    const email = within(floatingCta as HTMLElement).getByRole("link", {
      name: /Talk to our team/i,
    });
    expect(email.getAttribute("href")).toBe("mailto:hello@lewis.health");
  });

  it("does not render the retired sticky rail, persona cross-links, or trust snapshot", () => {
    mount();
    expect(screen.queryByLabelText("Reference")).toBeNull();
    expect(screen.queryByRole("link", { name: /For manufacturers/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /For ETCs/i })).toBeNull();
    expect(screen.queryByText(/Trust posture snapshot/i)).toBeNull();
  });

  it("renders the signoff + independence footnote", () => {
    mount();
    expect(screen.getByText(/Direct platform inquiries to hello@lewis\.health/i)).toBeTruthy();
    expect(screen.getByText(/— The Lewis team/i)).toBeTruthy();
    expect(
      screen.getByText(/Lewis is an independent directory and operating platform/i),
    ).toBeTruthy();
  });
});
