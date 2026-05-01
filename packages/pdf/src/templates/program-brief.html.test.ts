import { describe, expect, test } from "vitest";

import type { PublicProgramDetail } from "@lewis/shared";

import { renderProgramBriefHtml } from "./program-brief.html.js";

// Section labels match Variant A from /design-shotgun Round 4 — kicker
// labels (uppercase letterspaced) live as "Mechanism", "Eligibility",
// "Key safety findings", "ETRB approval", "Where to access",
// "Program cost". The h1 + indication + phase tag carry the program
// identity.

const FULL_FIXTURE: PublicProgramDetail = {
  slug: "wst-057",
  name: "WST-057®",
  indication: "for diabetic peripheral neuropathy",
  manufacturer: "WinSanTor",
  form: "Topical",
  phase: "Phase 2",
  etcCount: 1,
  available: true,
  about: "About prose.",
  whoThisIsFor:
    "Adults with confirmed diabetic peripheral neuropathy who have evaluated standard-of-care options.",
  enrollment: ["step 1", "step 2"],
  costRange: {
    low: 240000,
    high: 380000,
    currency: "USD",
    disclaimer:
      "Treatment cost is set by the ETC, not by Lewis. Insurance does not currently cover experimental treatments offered under Montana's Experimental Treatment Center framework.",
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
    "Paragraph one — small-molecule inhibitor.\n\nParagraph two — IENFD endpoint result.",
  keySafetyFindings:
    "In Phase 2a, the most common adverse events were application-site erythema and pruritus.",
};

describe("renderProgramBriefHtml — Variant A composition", () => {
  const html = renderProgramBriefHtml(FULL_FIXTURE, { renderedAtIso: "2026-04-30" });

  test("renders the brief mast with deterministic date", () => {
    expect(html).toContain("Clinician brief");
    expect(html).toContain("April 30, 2026");
  });

  test("renders the H1 + indication + phase tag", () => {
    expect(html).toContain("<h1>WST-057®</h1>");
    expect(html).toContain("for diabetic peripheral neuropathy.");
    expect(html).toContain("Phase 2");
    expect(html).toContain("Available now in Montana");
  });

  test("renders all PRD § 15.6 kicker sections (Variant A labels)", () => {
    expect(html).toContain(">Mechanism<");
    expect(html).toContain(">Eligibility<");
    expect(html).toContain(">Key safety findings<");
    expect(html).toContain(">ETRB approval<");
    expect(html).toContain(">Where to access<");
    expect(html).toContain(">Program cost<");
  });

  test("trial registration field-line carries NCT, IND, Phase inline", () => {
    expect(html).toContain(">Trial<");
    expect(html).toContain(">IND<");
    // Inline field-line includes both the kicker and the NCT link
    expect(html).toContain('href="https://clinicaltrials.gov/study/NCT04742205"');
    expect(html).toContain("NCT04742205");
    expect(html).toContain("152367");
  });

  test("citation pulled-quote includes DOI link tucked under mechanism", () => {
    expect(html).toContain('href="https://doi.org/10.1016/j.ebiom.2023.104525"');
    expect(html).toContain("doi.org/10.1016/j.ebiom.2023.104525");
    expect(html).toContain("Lancet eBioMedicine 2023;90:104525.");
  });

  test("ETRB approval date renders as long date with RULE 16(6)(a)", () => {
    expect(html).toContain("September 15, 2025");
    expect(html).toContain("RULE 16(6)(a)");
  });

  test("program cost renders as accent serif amount with disclaimer", () => {
    expect(html).toContain('class="cost-amount"');
    expect(html).toContain("$2,400");
    expect(html).toContain("$3,800");
    expect(html).toContain("per course");
    expect(html).toContain('class="cost-disclaimer"');
    expect(html).toContain("Insurance does not currently cover");
  });

  test("splits mechanism prose into two paragraphs", () => {
    expect(html).toContain("Paragraph one — small-molecule inhibitor.");
    expect(html).toContain("Paragraph two — IENFD endpoint result.");
    const matches = html.match(/<p>Paragraph (one|two)/g);
    expect(matches).toHaveLength(2);
  });

  test("includes the independence trust signal in the footer", () => {
    expect(html).toContain("Lewis is independent of any sponsor or ETC.");
  });

  test("footer carries the deep-link to the program page (no protocol)", () => {
    expect(html).toContain("lewis.health/programs/wst-057");
  });

  test("normalizes and escapes configured site URL output", () => {
    const html = renderProgramBriefHtml(FULL_FIXTURE, {
      siteUrl: 'https://lewis.health/"bad"/',
    });
    expect(html).toContain('href="https://lewis.health/&quot;bad&quot;/programs/wst-057"');
    expect(html).toContain("lewis.health/&quot;bad&quot;/programs/wst-057");
  });

  test("is a single self-contained HTML document", () => {
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain("</html>");
  });

  test("escapes HTML-unsafe characters in cost disclaimer", () => {
    expect(html).toContain("Montana&#39;s Experimental Treatment Center framework");
  });
});

describe("renderProgramBriefHtml — graceful degradation", () => {
  test("hides clinical-evidence sections when fields are null", () => {
    const partial: PublicProgramDetail = {
      ...FULL_FIXTURE,
      clinicalTrialsGovId: null,
      indNumber: null,
      publishedPaper: null,
      etrb: null,
      mechanismSummary: null,
      keySafetyFindings: null,
    };
    const html = renderProgramBriefHtml(partial, { renderedAtIso: "2026-04-30" });
    // Kicker labels for missing data must NOT appear.
    expect(html).not.toContain(">Mechanism<");
    expect(html).not.toContain(">ETRB approval<");
    expect(html).not.toContain(">Key safety findings<");
    expect(html).not.toContain(">Trial<");
    expect(html).not.toContain(">IND<");
    expect(html).not.toContain('class="citation"');
    // Always-on sections still render.
    expect(html).toContain(">Eligibility<");
    expect(html).toContain(">Where to access<");
  });

  test("hides cost section when costRange is null", () => {
    const partial: PublicProgramDetail = { ...FULL_FIXTURE, costRange: null };
    const html = renderProgramBriefHtml(partial);
    expect(html).not.toContain(">Program cost<");
    expect(html).not.toContain('class="cost-amount"');
  });

  test("phase-tag hides when phase is null", () => {
    const partial: PublicProgramDetail = { ...FULL_FIXTURE, phase: null };
    const html = renderProgramBriefHtml(partial);
    expect(html).not.toContain('class="phase-tag"');
  });
});

describe("renderProgramBriefHtml — XSS posture", () => {
  test("escapes a malicious indication string", () => {
    const malicious: PublicProgramDetail = {
      ...FULL_FIXTURE,
      indication: '<script>alert("xss")</script>',
    };
    const html = renderProgramBriefHtml(malicious);
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
  });
});
