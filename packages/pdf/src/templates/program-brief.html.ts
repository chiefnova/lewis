// Brief PDF template per directoryprd.md § 15.6.
//
// Single-page 8.5x11 letter, restrained serif aesthetic, fax-friendly.
// Renders to a self-contained HTML document that Puppeteer prints to PDF.
// No external assets except a Google Fonts import for Fraunces + Inter
// (Chromium fetches at render time; the static template never receives
// user input that would compose external URLs).
//
// Composition follows /design-shotgun Round 4 winner (Variant A — Editorial
// single-column, approved 2026-04-30 — see ~/.gstack/projects/chiefnova-
// lewis/designs/program-brief-pdf-20260430/approved.json).
//
// Sections, in render order:
//   1. Brief mast       — Lewis wordmark + "Clinician brief · {date}"
//   2. Header block     — H1 + indication + phase tag (italic accent)
//   3. Trial registration field-line (NCT, IND, Phase) — inline
//   4. Mechanism prose  — peer-level (from mechanismSummary)
//   5. Citation         — pulled-quote with accent border-left + DOI
//   6. Eligibility      — patient-facing prose
//   7. Key safety findings
//   8. ETRB approval    — board name + approval date (RULE 16(6)(a))
//   9. Where to access  — ETC name + license + accepting status
//  10. Program cost     — kicker + serif accent price + italic disclaimer
//  11. Footer           — independence trust signal + URL
//
// All optional sections gate on null and self-hide. The template is the
// counsel-reviewable surface; the renderer is plumbing. Section margins
// are tightened (8pt vs 12pt earlier draft) so the page stays within
// 8.5x11 letter bounds with the cost section fitting comfortably.

import type { PublicProgramDetail } from "@lewis/shared";

export interface RenderProgramBriefHtmlOptions {
  /** Public site URL for the footer link (defaults to https://lewis.health). */
  siteUrl?: string;
  /** ISO date used in the brief mast "Clinician brief · {date}" line. Lets tests pin a deterministic date. */
  renderedAtIso?: string;
}

export function renderProgramBriefHtml(
  detail: PublicProgramDetail,
  options: RenderProgramBriefHtmlOptions = {},
): string {
  const siteUrl = stripTrailingSlashes(options.siteUrl ?? "https://lewis.health");
  const renderedAtIso = options.renderedAtIso ?? new Date().toISOString().slice(0, 10);

  const trialUrl = detail.clinicalTrialsGovId
    ? `https://clinicaltrials.gov/study/${escapeHtml(detail.clinicalTrialsGovId)}`
    : null;
  const doiUrl = detail.publishedPaper
    ? `https://doi.org/${escapeHtml(detail.publishedPaper.doi)}`
    : null;

  const mechanismHtml = detail.mechanismSummary
    ? renderProseParagraphs(detail.mechanismSummary)
    : null;

  const costRangeUsd = detail.costRange
    ? `${formatUsdCents(detail.costRange.low)}&ndash;${formatUsdCents(detail.costRange.high)} per course`
    : null;

  const briefDate = formatLongDate(renderedAtIso);

  // Strip the protocol from the site URL for footer display (cleaner
  // print output than the bare https://).
  const siteHost = siteUrl.replace(/^https?:\/\//, "");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Lewis clinician brief — ${escapeHtml(detail.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&family=Inter:wght@400;500&display=swap" rel="stylesheet" />
<style>
  @page {
    size: letter;
    margin: 0.5in;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Inter", system-ui, sans-serif;
    color: #1b1814;
    font-size: 10.5pt;
    line-height: 1.45;
    background: #fbf7f0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* --- Brief mast --------------------------------------------------- */
  .brief-mast {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 1px solid #c2bfae;
    padding-bottom: 10pt;
    margin-bottom: 14pt;
  }
  .brief-wordmark {
    font-family: "Fraunces", Georgia, serif;
    font-size: 14pt;
    letter-spacing: -0.01em;
    color: #1b1814;
  }
  .brief-wordmark .ital { font-style: italic; color: #5a5448; font-weight: 300; }
  .brief-mast .meta {
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #8a8576;
  }

  /* --- Header block ------------------------------------------------- */
  h1 {
    font-family: "Fraunces", Georgia, serif;
    font-size: 22pt;
    font-weight: 400;
    letter-spacing: -0.01em;
    margin: 0 0 4pt 0;
    line-height: 1.05;
  }
  .indication {
    font-size: 11pt;
    color: #5a5448;
    margin: 0 0 4pt 0;
  }
  .phase-tag {
    font-family: "Fraunces", Georgia, serif;
    font-style: italic;
    color: #2c4a6b;
    font-size: 11pt;
    margin: 0 0 16pt 0;
  }

  /* --- Section rhythm ----------------------------------------------- */
  section { margin-bottom: 8pt; }
  section .label-kicker { display: block; margin-bottom: 3pt; }
  .label-kicker {
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #8a8576;
    font-weight: 500;
  }
  p { margin: 0 0 5pt 0; font-size: 10pt; line-height: 1.5; }

  /* --- Inline field-line (Trial / IND / Phase) ---------------------- */
  .field-line { display: flex; gap: 16pt; flex-wrap: wrap; font-size: 10pt; }
  .field-line .field { display: flex; gap: 6pt; align-items: baseline; }
  .field-line .field .lbl {
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #8a8576;
    font-weight: 500;
  }
  .field-line .field .val { color: #1b1814; }
  .field-line .field .val a { color: #2c4a6b; text-decoration: underline; text-decoration-thickness: 0.5pt; text-underline-offset: 1.5pt; }

  /* --- Citation pulled-quote ---------------------------------------- */
  .citation {
    border-left: 2px solid #2c4a6b;
    padding: 4pt 0 4pt 12pt;
    margin: 4pt 0 16pt 0;
    font-size: 10pt;
    font-style: italic;
  }
  .citation .doi {
    font-style: normal;
    display: block;
    font-size: 9pt;
    color: #2c4a6b;
    margin-top: 2pt;
  }
  .citation .doi a { color: #2c4a6b; text-decoration: underline; text-decoration-thickness: 0.5pt; text-underline-offset: 1.5pt; }

  /* --- Program cost band -------------------------------------------- */
  .cost-line p { font-size: 10pt; line-height: 1.5; }
  .cost-amount {
    font-family: "Fraunces", Georgia, serif;
    font-size: 13pt;
    color: #2c4a6b;
    letter-spacing: -0.01em;
    margin-right: 8pt;
  }
  .cost-disclaimer {
    color: #5a5448;
    font-size: 9pt;
    font-style: italic;
    font-family: "Fraunces", Georgia, serif;
  }

  /* --- Footer trust signal ------------------------------------------ */
  .brief-footer {
    margin-top: 18pt;
    padding-top: 10pt;
    border-top: 1px solid #c2bfae;
    font-size: 8.5pt;
    color: #5a5448;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .brief-footer .independence {
    font-family: "Fraunces", Georgia, serif;
    font-style: italic;
  }
</style>
</head>
<body>
<div class="brief-mast">
  <span class="brief-wordmark">lewis<span class="ital">.health</span></span>
  <span class="meta">Clinician brief &middot; ${escapeHtml(briefDate)}</span>
</div>

<h1>${escapeHtml(detail.name)}</h1>
<p class="indication">${escapeHtml(detail.indication)}.</p>
${detail.phase ? `<div class="phase-tag">${escapeHtml(detail.phase)} &middot; Available now in Montana</div>` : ""}

${
  trialUrl || detail.indNumber || detail.phase
    ? `<section>
        <div class="field-line">
          ${trialUrl ? `<div class="field"><span class="lbl">Trial</span><span class="val"><a href="${trialUrl}">${escapeHtml(detail.clinicalTrialsGovId ?? "")}</a></span></div>` : ""}
          ${detail.indNumber ? `<div class="field"><span class="lbl">IND</span><span class="val">${escapeHtml(detail.indNumber)}</span></div>` : ""}
          ${detail.phase ? `<div class="field"><span class="lbl">Phase</span><span class="val">${escapeHtml(detail.phase)}</span></div>` : ""}
        </div>
      </section>`
    : ""
}

${
  mechanismHtml
    ? `<section>
        <span class="label-kicker">Mechanism</span>
        ${mechanismHtml}
      </section>`
    : ""
}

${
  detail.publishedPaper && doiUrl
    ? `<div class="citation">
        ${escapeHtml(detail.publishedPaper.citation)}
        <span class="doi"><a href="${doiUrl}">doi.org/${escapeHtml(detail.publishedPaper.doi)}</a></span>
      </div>`
    : ""
}

${
  detail.whoThisIsFor
    ? `<section>
        <span class="label-kicker">Eligibility</span>
        <p>${escapeHtml(detail.whoThisIsFor)}</p>
      </section>`
    : ""
}

${
  detail.keySafetyFindings
    ? `<section>
        <span class="label-kicker">Key safety findings</span>
        <p>${escapeHtml(detail.keySafetyFindings)}</p>
      </section>`
    : ""
}

${
  detail.etrb
    ? `<section>
        <span class="label-kicker">ETRB approval</span>
        <p>${escapeHtml(detail.etrb.boardName)} approved the protocol on ${escapeHtml(formatLongDate(detail.etrb.approvalDate))}, per RULE 16(6)(a).</p>
      </section>`
    : ""
}

<section>
  <span class="label-kicker">Where to access</span>
  <p>Available at a licensed Montana Experimental Treatment Center under SB 535. See <a href="${escapeHtml(siteUrl)}/programs/${escapeHtml(detail.slug)}">${escapeHtml(siteHost)}/programs/${escapeHtml(detail.slug)}</a> for the current ETC list, medical-director contact, and enrollment pathway.</p>
</section>

${
  costRangeUsd
    ? `<section class="cost-line">
        <span class="label-kicker">Program cost</span>
        <p>
          <span class="cost-amount">${costRangeUsd}</span>
          ${detail.costRange?.disclaimer ? `<span class="cost-disclaimer">${escapeHtml(detail.costRange.disclaimer)}</span>` : ""}
        </p>
      </section>`
    : ""
}

<div class="brief-footer">
  <span class="independence">Lewis is independent of any manufacturer or ETC.</span>
  <span>${escapeHtml(siteHost)}/programs/${escapeHtml(detail.slug)}</span>
</div>
</body>
</html>`;
}

// Mechanism prose in the DB is stored with double-newline paragraph
// breaks (see migration 0019 backfill). Split on blank lines and trim
// so the panel renders one <p> per paragraph.
function renderProseParagraphs(prose: string): string {
  return prose
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

function formatUsdCents(cents: number): string {
  const whole = Math.floor(cents / 100);
  return `$${whole.toLocaleString("en-US")}`;
}

// Converts ISO YYYY-MM-DD to "Month D, YYYY". Pure (no Date timezone risk).
function formatLongDate(iso: string): string {
  const [yearStr, monthStr, dayStr] = iso.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return iso;
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[month - 1]} ${day}, ${year}`;
}
