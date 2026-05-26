// Editorial prose for /etcs/:slug — slice 4 § 16.2 patient-facing About panel.
//
// Mirrors slice 3's apps/directory/src/data/programs-content.ts pattern:
// factual data lives in the DB (license number, medical director, address,
// hours, lat/lng), patient-facing intro prose lives here. Counsel reviews
// PR diffs of this file.
//
// Drift detection: every directory_published ETC slug in the DB seed must
// have a matching entry. Enforced by etcs-content.test.ts.

export interface EtcContent {
  /** 2-3 paragraphs of restrained editorial prose for the About panel. */
  aboutParagraphs: ReadonlyArray<string>;
  /** Optional override for the "Inquire about treatment" CTA copy. */
  inquireCtaCopy?: string;
}

/**
 * Directory-facing ETC name: abbreviate the spelled-out "Experimental Treatment
 * Center" to "ETC" so cards read "Big Sky ETC", not "Big Sky Experimental
 * Treatment Center". The full legal name stays in the DB (tenants.display_name)
 * for the operating platform; the directory just shows the abbreviation.
 */
export function formatEtcName(name: string): string {
  return name
    .replace(/\s*Experimental Treatment Center/gi, " ETC")
    .replace(/\s+/g, " ")
    .trim();
}

export const ETC_CONTENT: Record<string, EtcContent> = {
  "big-sky": {
    aboutParagraphs: [
      "Big Sky Experimental Treatment Center is the first ETC licensed under Montana SB 535, providing investigational treatments to qualifying patients under ETRB-approved protocols. The clinic operates as an outpatient specialty practice serving neurology, pain medicine, and rare-disease consultation.",
      "All treatments at Big Sky are delivered under direct medical supervision by board-certified clinicians. Each program is governed by an Experimental Treatment Review Board (ETRB) protocol approval per RULE 16(6)(a), with annual public safety reporting and adverse-event tracking.",
      "Big Sky is independent of any sponsor or manufacturer. The clinic's enrollment decisions are based on the treating physician's recommendation, the ETRB-approved eligibility criteria, and a clinical evaluation by the Big Sky team — not by Lewis or by the program sponsor.",
    ],
  },
};

export function getEtcContent(slug: string): EtcContent | undefined {
  return ETC_CONTENT[slug];
}
