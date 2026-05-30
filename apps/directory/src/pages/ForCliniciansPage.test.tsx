// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";

import { ForCliniciansPage } from "./ForCliniciansPage";

afterEach(() => {
  cleanup();
});

function mount() {
  return render(
    <IntlProvider locale="en" messages={{}}>
      <MemoryRouter initialEntries={["/for-clinicians"]}>
        <Routes>
          <Route path="/for-clinicians" element={<ForCliniciansPage />} />
        </Routes>
      </MemoryRouter>
    </IntlProvider>,
  );
}

describe("ForCliniciansPage — § 20 (slice 5)", () => {
  it("renders the H1 with experimental-treatment emphasis using the 'clinicians' umbrella", () => {
    mount();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toMatch(/treating clinicians/i);
    expect(h1.textContent).toMatch(/experimental treatment/i);
    // Slice-5 terminology unification: H1 must not narrow to "physicians"
    // since the page also addresses APRNs / PAs / out-of-state clinicians.
    expect(h1.textContent).not.toMatch(/physicians/i);
  });

  it("surfaces the two-audience framing in the intro paragraph using 'clinicians' + the statutory gloss", () => {
    mount();
    // The intro names both audiences with the umbrella "clinicians" and
    // immediately glosses the statute's "health care providers" term so
    // the reader can map back to § 50-12-102(4) when needed. Match the
    // statutory-gloss substring which is unique to the intro paragraph
    // (the per-audience H2 sections reuse "clinicians licensed in/outside
    // Montana" verbatim, so those phrases match multiple nodes).
    expect(
      screen.getByText(/the statute calls them "health care providers" — § 50-12-102\(4\)/i),
    ).toBeTruthy();
    // Both umbrella phrases should appear at least once across the page
    // (intro + section H2 = 2 matches each).
    expect(screen.getAllByText(/clinicians licensed in Montana/i).length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getAllByText(/clinicians licensed outside Montana/i).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("includes a 'Where treatment happens' section stating treatment is administered in Montana", () => {
    mount();
    expect(
      screen.getByRole("heading", { level: 2, name: /Where treatment happens/i }),
    ).toBeTruthy();
    expect(
      screen.getByText(/at the Montana ETC site, by Montana-licensed clinicians/i),
    ).toBeTruthy();
  });

  it("cites § 50-5-101(18) and MAR Rules 4(9), 9(1), 9(3) in the 'Where' section", () => {
    mount();
    const wherePara = screen.getByText(/An ETC is a Montana licensed health care facility/i);
    expect(wherePara.textContent).toMatch(/§ 50-5-101\(18\)/);
    expect(wherePara.textContent).toMatch(/MAR NEW RULE 4\(9\)/);
    expect(wherePara.textContent).toMatch(/MAR NEW RULE 9\(1\)/);
    expect(wherePara.textContent).toMatch(/MAR NEW RULE 9\(3\)/);
  });

  it("includes an 'Independent protocol review' section with verbatim Rule 16 language", () => {
    mount();
    expect(
      screen.getByRole("heading", { level: 2, name: /Independent protocol review/i }),
    ).toBeTruthy();
    // Verbatim Rule 16(5) — composition requirement.
    expect(
      screen.getByText(
        /at least one Montana-licensed physician, at least one researcher with expertise in clinical outcome data, and at least one ethicist/i,
      ),
    ).toBeTruthy();
    // Verbatim Rule 16(6)(a)(i) — safety-standards finding.
    expect(
      screen.getByText(
        /safety standards equivalent to or higher than those of recognized regulatory authorities/i,
      ),
    ).toBeTruthy();
  });

  it("includes a 'What you keep' section asserting the referral is not a transfer of care", () => {
    mount();
    expect(screen.getByRole("heading", { level: 2, name: /What you keep/i })).toBeTruthy();
    expect(
      screen.getByText(/You retain your broader treating relationship with the patient/i),
    ).toBeTruthy();
  });

  it("renders the 3-step refer flow", () => {
    mount();
    expect(screen.getByText(/Write a referral letter/i)).toBeTruthy();
    expect(screen.getByText(/Send it to the ETC's medical director/i)).toBeTruthy();
    expect(screen.getByText(/Consult on review, if asked/i)).toBeTruthy();
  });

  it("includes the in-Montana scope § 12 section with the gloss + PDF pointer", () => {
    mount();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /For clinicians licensed in Montana/i,
      }),
    ).toBeTruthy();
    // The body now glosses "Title 37" in plain English and points to the
    // SB 535 PDF in the rail for the full statutory text. The {accent}
    // FormattedMessage placeholder splits the paragraph across text nodes,
    // so match substrings guaranteed to live in single text nodes.
    expect(
      screen.getByText(/the Montana Code Annotated chapter for licensed health care providers/i),
    ).toBeTruthy();
    expect(
      screen.getByText(/full statutory text is in the SB 535 PDF cited at the end of this letter/i),
    ).toBeTruthy();
  });

  it("includes the out-of-Montana scope section with the home-board jurisdiction caveat", () => {
    mount();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /For clinicians licensed outside Montana/i,
      }),
    ).toBeTruthy();
    expect(screen.getByText(/it does not bind your home state's licensing board/i)).toBeTruthy();
  });

  it("exposes the primary conversion as a floating CTA pointing at the connect flow", () => {
    // The right rail and its 'Refer a patient' / 'View available programs'
    // pills were dropped in favor of a single-column editorial layout. The
    // primary conversion now lives in a floating pill anchored to viewport
    // bottom-center with a single CTA. It is visible from first paint and
    // stays fixed while the reader scrolls.
    const { container } = mount();
    const float = container.querySelector(".directory-floating-cta");
    expect(float).not.toBeNull();
    expect(float?.getAttribute("aria-hidden")).toBeNull();
    expect(float?.closest(".fade-up")).toBeNull();
    const cta = float?.querySelector(
      "a.directory-floating-cta__action",
    ) as HTMLAnchorElement | null;
    expect(cta).not.toBeNull();
    expect(cta?.getAttribute("href")).toBe("/connect/wst-057?via=clinician");
    expect(cta?.textContent).toMatch(/Start a connect request/i);
    // Italic Fraunces lead-in next to the CTA — keeps the pill in the
    // peer-letter voice instead of reading as a checkout/marketing bar.
    expect(float?.textContent).toMatch(/Have a patient to refer\?/i);
  });

  it("exposes the secondary browse path inline at the end of the Available programs section", () => {
    // The deleted rail's outline-pill 'View available programs' link
    // collapsed into a single inline editorial link inside the
    // 'Available programs.' section, immediately after the
    // 'More programs added…' line. Browse is also persistently available
    // via the TopNav 'Browse Treatments' pill on every page.
    mount();
    const browse = screen.getByRole("link", { name: /Browse the full directory/i });
    expect(browse.getAttribute("href")).toBe("/browse");
  });

  it("inlines the referral-letter checklist as the body of Step 1 (How a referral happens)", () => {
    // The 7-item checklist (formerly a rail card) now lives directly
    // inside Step 1 of the 'How a referral happens' ordered list, with a
    // small 'What to include:' lead-in. Statutory citations are preserved
    // inline. Scope assertions to the .for-clin__step-checklist element
    // because Step 1's body prose ALSO mentions MAR Rule 12(2)(b)(iii)
    // (the H&P date constraint) — without scoping, the text matches both
    // the prose and the checklist row and throws on multiple matches.
    const { container } = mount();
    expect(screen.getByText(/What to include:/i)).toBeTruthy();
    const list = container.querySelector(".for-clin__step-checklist");
    expect(list).not.toBeNull();
    const listEl = list as HTMLElement;
    expect(within(listEl).getByText(/Patient's diagnosis with ICD-10 code/i)).toBeTruthy();
    expect(
      within(listEl).getByText(/FDA-approved options the patient has evaluated/i),
    ).toBeTruthy();
    expect(within(listEl).getByText(/§ 50-12-104\(1\)/)).toBeTruthy();
    expect(
      within(listEl).getByText(/H&P by a treating practitioner, within 12 months/i),
    ).toBeTruthy();
    expect(within(listEl).getByText(/MAR Rule 12\(2\)\(b\)\(iii\)/)).toBeTruthy();
    const licenseState = listEl.querySelector(".for-clin__license-state");
    expect(licenseState?.textContent).toBe("+ state of issuance");
    expect(licenseState?.tagName).toBe("SPAN");
    expect(within(listEl).getByText(/Direct contact for follow-up/i)).toBeTruthy();
  });

  it("has no right-rail aside — single-column editorial layout", () => {
    // The 'Reference' aside (right rail) was deleted entirely. Its
    // content split across the floating CTA pill, the inline Step 1
    // checklist, and the inline 'Browse the full directory' link in
    // Available programs. No element should carry aria-label='Reference'.
    mount();
    expect(screen.queryByLabelText("Reference")).toBeNull();
  });

  it("renders a 'Sources cited.' editorial bibliography at the bottom of the letter with clickable PDF download links", () => {
    mount();
    // The "Sources cited." H2 lives in the body letter, not the rail.
    expect(screen.getByRole("heading", { level: 2, name: /Sources cited/i })).toBeTruthy();

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

    // Explicit "Download PDF" affordance is visible on each card (not just
    // accent-hover text), so clinicians read the row as actionable.
    const actions = screen.getAllByText(/Download PDF/i);
    expect(actions.length).toBe(2);
  });

  it("h1 uses the 'clinicians' umbrella (matches the route + nav label)", () => {
    const { container } = mount();
    // Slice-5 unification: no "For Montana physicians" anywhere (was wrong
    // statutory narrowing) and no "For treating physicians" (was wrong
    // medical-specialty narrowing). The umbrella is "clinicians" which
    // truthfully covers both Montana-licensed (Title-37 health care
    // providers) and out-of-state referring clinicians.
    expect(screen.queryByText(/For Montana physicians/i)).toBeNull();
    const h1 = container.querySelector(".for-clin__h1");
    expect(h1?.textContent).toMatch(/For treating clinicians considering an/);
  });

  it("renders the verbatim § 12 statute inline in the body Montana-physicians section (rail no longer carries it)", () => {
    mount();
    // The verbatim § 12 statute moved from the rail card to the body letter
    // in the cleanup pass; it lives in the "For Montana-licensed physicians"
    // H2 paragraph as the accent italic line.
    expect(
      screen.getByText(
        /A licensing board may not revoke, fail to renew, suspend, or take any action against a license issued under Title 37 to a health care provider/i,
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(/with an investigational drug, biological product, or device/i),
    ).toBeTruthy();
  });

  it("renders the available-programs section with the WST-057 card linking to /programs/wst-057", () => {
    mount();
    expect(screen.getByRole("heading", { level: 2, name: /Available programs/i })).toBeTruthy();
    const link = screen.getByRole("link", { name: /WST-057/ });
    expect(link.getAttribute("href")).toBe("/programs/wst-057");
  });

  it("renders the independence footnote", () => {
    mount();
    expect(screen.getByText(/Lewis is an independent directory\./i)).toBeTruthy();
  });

  it("includes the clinicians@lewis.health signoff", () => {
    mount();
    expect(screen.getByText(/clinicians@lewis\.health/)).toBeTruthy();
    expect(screen.getByText(/— The Lewis team/)).toBeTruthy();
  });
});
