// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";

import { ForManufacturersPage } from "./ForManufacturersPage";

afterEach(() => {
  cleanup();
});

function mount() {
  return render(
    <IntlProvider locale="en" messages={{}}>
      <MemoryRouter initialEntries={["/for-manufacturers"]}>
        <Routes>
          <Route path="/for-manufacturers" element={<ForManufacturersPage />} />
        </Routes>
      </MemoryRouter>
    </IntlProvider>,
  );
}

describe("ForManufacturersPage — § 21 (slice 5)", () => {
  it("renders the H1 'List a program with Lewis.'", () => {
    mount();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toMatch(/List a program/i);
    expect(h1.textContent).toMatch(/with Lewis/i);
  });

  it("surfaces the SB 535 50-12-102(1) eligibility framing + 'two paths' accent", () => {
    mount();
    expect(screen.getByText(/SB 535 \(50-12-102\(1\)\)/i)).toBeTruthy();
    expect(screen.getByText(/Two paths are open to you, and we support both/i)).toBeTruthy();
  });

  it("includes the regulatory framework section with § 50-12-105 + RULE 16(6)(a) cites", () => {
    mount();
    expect(
      screen.getByRole("heading", { level: 2, name: /The regulatory framework/i }),
    ).toBeTruthy();
    // 50-12-105 cited in the informed-consent paragraph
    expect(screen.getByText(/informed consent under/i).textContent).toMatch(/50-12-105/);
    // RULE 16(6)(a) cited as the ETRB protocol-review hook
    expect(screen.getByText(/Experimental Treatment Review Board under/i).textContent).toMatch(
      /RULE 16\(6\)\(a\)/,
    );
  });

  it("renders the two-paths section with both Path 1 + Path 2 description paragraphs", () => {
    mount();
    expect(screen.getByRole("heading", { level: 2, name: /^The two paths\.$/i })).toBeTruthy();
    // "Path 1 — Partner with a Montana ETC." is unique to the prose lead
    // (the table's column header reads "Partner with an ETC" — different
    // wording). "Operate your own ETC" appears in BOTH the Path 2 prose
    // and the table column header; both are intentional, hence
    // getAllByText with length ≥ 2.
    expect(screen.getByText(/Partner with a Montana ETC/i)).toBeTruthy();
    expect(screen.getAllByText(/Operate your own ETC/i).length).toBeGreaterThanOrEqual(2);
    // Unique substring inside the Path 2 description paragraph.
    expect(screen.getByText(/You license a Montana ETC subsidiary under SB 535/i)).toBeTruthy();
    // SB 535 § 7 statute quote anchoring why both paths are valid.
    expect(
      screen.getByText(/manufacturer, health care provider, or health care facility/i),
    ).toBeTruthy();
  });

  it("renders the 8-row analytical comparison table with all rows", () => {
    mount();
    const table = screen.getByRole("table");
    // Column headers
    expect(within(table).getByText(/Partner with an ETC/i)).toBeTruthy();
    expect(within(table).getByText(/Operate your own ETC/i)).toBeTruthy();
    // 8 row headers
    const rowHeaders = [
      /Statutory basis/i,
      /Drug sale path/i,
      /Margin capture/i,
      /Clinic regulatory burden/i,
      /HFAR payer/i,
      /Operational lift on manufacturer/i,
      /Time to first patient/i,
      /Best for/i,
    ];
    for (const re of rowHeaders) {
      expect(within(table).getByRole("rowheader", { name: re })).toBeTruthy();
    }
    // Path 2 margin capture cell should call out "Full margin to manufacturer's subsidiary"
    expect(within(table).getByText(/Full margin to manufacturer's subsidiary/i)).toBeTruthy();
  });

  it("renders the 'What the operating platform does' section with the 9 RULE-mapped modules", () => {
    const { container } = mount();
    expect(
      screen.getByRole("heading", { level: 2, name: /What the operating platform does/i }),
    ).toBeTruthy();
    // Scope to the modules list. testing-library's default text matcher
    // matches both the <strong> label AND its parent <li>, so we use
    // within() against the list to narrow + getAllByText to allow that.
    const modulesList = container.querySelector(".for-spons__modules") as HTMLElement;
    expect(modulesList).toBeTruthy();
    // Spot-check the load-bearing module labels (each appears as the
    // <strong> inside its row; the <li> wraps it, so 2 matches each).
    expect(within(modulesList).getAllByText(/Licensure assistance/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(within(modulesList).getAllByText(/ETRB workflow/i).length).toBeGreaterThanOrEqual(1);
    expect(
      within(modulesList).getAllByText(/Adverse-event reporting/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(within(modulesList).getAllByText(/DPHHS annual report/i).length).toBeGreaterThanOrEqual(
      1,
    );
    // RULE-mapped descriptions live in <span> inside each li.
    expect(within(modulesList).getAllByText(/RULE 5 application/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      within(modulesList).getAllByText(/RULE 17 with the 5-day clock to DPHHS/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      within(modulesList).getAllByText(/RULE 22, due January 31/i).length,
    ).toBeGreaterThanOrEqual(1);
    // BAA + RLS + SOC 2 posture (in the coda paragraph below the list)
    expect(
      screen.getByText(/Postgres Row-Level Security with Clerk JWT-based authentication/i),
    ).toBeTruthy();
    expect(screen.getByText(/SOC 2 Type II auditable/i)).toBeTruthy();
  });

  it("renders the 3-step listing process with the 60-90 day timing line", () => {
    const { container } = mount();
    expect(
      screen.getByRole("heading", { level: 2, name: /How a program gets listed/i }),
    ).toBeTruthy();
    // Step labels live as <strong> inside <li>, so they match twice each
    // (strong + parent li). Scope to the process list + use getAllByText.
    const processList = container.querySelector(".for-spons__process") as HTMLElement;
    expect(processList).toBeTruthy();
    expect(within(processList).getAllByText(/Initial conversation/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      within(processList).getAllByText(/Program participation agreement/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      within(processList).getAllByText(/ETRB protocol approval/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/60 to 90 days/i)).toBeTruthy();
  });

  it("renders the 'How Lewis is paid' section with the no-percentage / no-patient-charge stance", () => {
    mount();
    expect(screen.getByRole("heading", { level: 2, name: /How Lewis is paid/i })).toBeTruthy();
    expect(
      screen.getByText(
        /We do not take a percentage of revenue\. We do not charge patients\. We do not take referral fees from ETCs/i,
      ),
    ).toBeTruthy();
  });

  it("renders the 'Sources cited.' bibliography with SB 535 + MAR PDF download links", () => {
    mount();
    expect(screen.getByRole("heading", { level: 2, name: /^Sources cited\.$/i })).toBeTruthy();

    const sb = screen.getByRole("link", { name: /Senate Bill 535/i });
    expect(sb.getAttribute("href")).toBe("/legislation/sb535.pdf");
    expect(sb.getAttribute("download")).not.toBeNull();
    expect(sb.getAttribute("target")).toBe("_blank");
    expect(sb.getAttribute("rel") ?? "").toMatch(/noopener/);

    const mar = screen.getByRole("link", { name: /MAR Notice 2026-427\.1/i });
    expect(mar.getAttribute("href")).toBe("/legislation/mar-2026-427-1.pdf");
    expect(mar.getAttribute("download")).not.toBeNull();
    expect(mar.getAttribute("target")).toBe("_blank");
    expect(mar.getAttribute("rel") ?? "").toMatch(/noopener/);

    // Both rows surface an explicit "Download PDF" affordance.
    expect(screen.getAllByText(/Download PDF/i).length).toBe(2);
  });

  it("exposes the primary conversion as the shared floating Talk to our team CTA", () => {
    const { container } = mount();
    const float = container.querySelector(".directory-floating-cta");
    expect(float).not.toBeNull();
    expect(float?.closest(".fade-up")).toBeNull();
    expect(float?.textContent).toMatch(/For manufacturers & biotech manufacturers/i);
    const cta = float?.querySelector(
      "a.directory-floating-cta__action",
    ) as HTMLAnchorElement | null;
    expect(cta).not.toBeNull();
    expect(cta?.getAttribute("href")).toBe("mailto:manufacturers@lewis.health");
    expect(cta?.textContent).toMatch(/Talk to our team/i);
  });

  it("has no right-rail aside and no 'At a glance' summary box", () => {
    // The "At a glance" key-value box was removed: every row duplicated
    // content the page carries in richer form (two-paths/HFAR/time-to-
    // first-patient are the comparison table, eligibility is in the
    // opening framing, the ETRB gate is in the regulatory section, and
    // the Lewis fee has its own "How Lewis is paid." section). The boxed
    // list also broke the editorial letter voice.
    const { container } = mount();
    expect(screen.queryByLabelText("Reference")).toBeNull();
    expect(container.querySelector(".for-spons__glance")).toBeNull();
    expect(screen.queryByRole("heading", { level: 2, name: /At a glance/i })).toBeNull();
  });

  it("still surfaces the key facts in their canonical homes (not the deleted glance box)", () => {
    mount();
    // Eligibility — opening framing paragraph.
    expect(
      screen.getByText(/completed Phase 1 of an FDA-approved clinical trial and remains/i),
    ).toBeTruthy();
    // HFAR + time-to-first-patient — comparison table rows.
    expect(screen.getByRole("rowheader", { name: /HFAR payer/i })).toBeTruthy();
    expect(screen.getByRole("rowheader", { name: /Time to first patient/i })).toBeTruthy();
    // Lewis fee — its own "How Lewis is paid." section.
    expect(screen.getByRole("heading", { level: 2, name: /How Lewis is paid/i })).toBeTruthy();
    expect(
      screen.getByText(/per-patient enrollment fee plus a flat platform subscription/i),
    ).toBeTruthy();
  });

  it("renders the signoff + independence footnote", () => {
    mount();
    expect(
      screen.getByText(/Direct manufacturer inquiries to manufacturers@lewis\.health/i),
    ).toBeTruthy();
    expect(screen.getByText(/— The Lewis team/i)).toBeTruthy();
    expect(
      screen.getByText(/Lewis is an independent directory and operating platform/i),
    ).toBeTruthy();
  });
});
