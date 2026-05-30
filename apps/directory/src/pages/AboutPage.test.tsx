// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it } from "vitest";

import { AboutPage } from "./AboutPage";

afterEach(() => {
  cleanup();
});

function mount() {
  return render(
    <IntlProvider locale="en" messages={{}}>
      <MemoryRouter initialEntries={["/about"]}>
        <Routes>
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </MemoryRouter>
    </IntlProvider>,
  );
}

describe("AboutPage — § 24 (slice 5, /design-shotgun Round 7 winner: C)", () => {
  it("renders the H1 'About Lewis.'", () => {
    mount();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toMatch(/About\s+Lewis\./i);
  });

  it("renders the § 24.2 founding paragraph — expedition setup with Clark, Corps of Discovery, Jefferson, 1804–1806", () => {
    const { container } = mount();
    const text = container.textContent ?? "";
    // Expedition paragraph names Clark + Corps of Discovery + Jefferson
    expect(text).toMatch(/Lewis is named for Meriwether Lewis/);
    expect(text).toMatch(/William Clark/);
    expect(text).toMatch(/Corps of Discovery/);
    expect(text).toMatch(/Thomas Jefferson's 1804.1806 expedition/);
    expect(text).toMatch(/St\. Louis to the Pacific and back/);
  });

  it("renders the bitterroot stanza with the Lewisia rediviva taproot-revival etymology", () => {
    const { container } = mount();
    const text = container.textContent ?? "";
    expect(text).toMatch(/Lewis catalogued the bitterroot/);
    expect(text).toMatch(/Lewisia rediviva/);
    expect(text).toMatch(/brought back to life/);
    // The etymology line is what closes the metaphor loop — must be present
    expect(text).toMatch(/taproot, which revives after being pressed and dried/i);
  });

  it("renders the metaphor turn that justifies the platform's name", () => {
    const { container } = mount();
    const text = container.textContent ?? "";
    expect(text).toMatch(/the same kind of careful record for a new frontier/i);
    expect(text).toMatch(/Montana's experimental treatment program/i);
    expect(text).toMatch(/the first of its kind in the country/i);
  });

  it("renders the 5 italic-Fraunces markers in order (Our mission · Why this exists · Who we work with · What Lewis is — and isn't · What's next)", () => {
    const { container } = mount();
    const markers = Array.from(container.querySelectorAll(".about__marker")).map(
      (el) => el.textContent?.trim() ?? "",
    );
    expect(markers).toEqual([
      "Our mission.",
      "Why this exists.",
      "Who we work with.",
      "What Lewis is — and isn't.",
      "What's next.",
    ]);
  });

  it("renders the Mission paragraph as a patient-first statement (treatments within reach, findable/verifiable/reachable)", () => {
    const { container } = mount();
    const text = container.textContent ?? "";
    expect(text).toMatch(/bring experimental treatments within reach/i);
    expect(text).toMatch(/cannot find them anywhere else/i);
    expect(text).toMatch(/findable, verifiable, and reachable/i);
    expect(text).toMatch(/lewis\.health/);
  });

  it("renders the 'Why this exists' regime context — May 2025 / April 2026 / no fit-for-purpose software", () => {
    const { container } = mount();
    const text = container.textContent ?? "";
    expect(text).toMatch(/signed in May 2025/);
    expect(text).toMatch(/operationalized through MAR 2026-427\.1 in April 2026/);
    expect(text).toMatch(/No fit-for-purpose software existed/);
  });

  it("renders 'Who we work with' as institutional-partner prose (WinSanTor + Big Sky ETC) with NO individual team members named", () => {
    const { container } = mount();
    const text = container.textContent ?? "";
    expect(text).toMatch(/WST-057/);
    expect(text).toMatch(/WinSanTor/);
    expect(text).toMatch(/Big Sky ETC/);
    // Collective-voice guarantee: no individual team members named
    expect(text).not.toMatch(/Gabriel/);
    expect(text).not.toMatch(/Viggers/);
    expect(text).not.toMatch(/Stanley/);
    expect(text).not.toMatch(/Kim/);
  });

  it("renders the independence paragraph with 'That independence is the entire point' accent", () => {
    const { container } = mount();
    const text = container.textContent ?? "";
    expect(text).toMatch(/Lewis is independent\./);
    expect(text).toMatch(/We are not a manufacturer\./);
    expect(text).toMatch(/We are not a clinic\./);
    expect(text).toMatch(/That independence is the entire point/i);
  });

  it("renders the team signoff with 'The Lewis team' (NOT an individual founder name)", () => {
    const { container } = mount();
    const signoff = container.querySelector(".about__team-signoff");
    expect(signoff).toBeTruthy();
    if (!signoff) return;
    const text = signoff.textContent ?? "";
    expect(text).toMatch(/Sincerely,/);
    expect(text).toMatch(/The Lewis team/);
    expect(text).toMatch(/lewis\.health/);
    // Guarantees the personal-letter version is dead
    expect(text).not.toMatch(/Gabriel/);
    expect(text).not.toMatch(/Founding product/i);
  });

  it("renders the in-letter contacts strip with three labeled emails (press@, investors@, hello@)", () => {
    const { container } = mount();
    const strip = container.querySelector(".about__contacts-strip");
    expect(strip).toBeTruthy();
    if (!strip) return;
    const links = strip.querySelectorAll("a");
    expect(links.length).toBe(3);
    const hrefs = Array.from(links).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([
      "mailto:press@lewis.health",
      "mailto:investors@lewis.health",
      "mailto:hello@lewis.health",
    ]);
  });

  it("renders the sticky rail with primary CTA + Reach us card mirroring the 3 emails", () => {
    mount();
    const rail = screen.getByLabelText("Reference");
    const primary = within(rail).getByRole("link", { name: /Talk to the team/i });
    expect(primary.getAttribute("href")).toBe("mailto:hello@lewis.health");
    // Reach us card labels
    expect(within(rail).getByText(/Reach us/i)).toBeTruthy();
    // The rail's 3 emails — same set as the in-letter strip
    const railEmails = Array.from(rail.querySelectorAll(".about__reach-email")).map((a) =>
      a.getAttribute("href"),
    );
    expect(railEmails).toEqual([
      "mailto:press@lewis.health",
      "mailto:investors@lewis.health",
      "mailto:hello@lewis.health",
    ]);
  });

  it("renders the independence footer verbatim (same wording as /for-clinicians, /for-manufacturers, /for-etcs, /platform)", () => {
    const { container } = mount();
    const indep = container.querySelector(".about__independence");
    expect(indep).toBeTruthy();
    if (!indep) return;
    expect(indep.textContent ?? "").toMatch(
      /Lewis is an independent directory and operating platform\. We are not a manufacturer, manufacturer, or clinic\. Information sourced from Montana DPHHS public records and licensed program operators\./,
    );
  });
});
