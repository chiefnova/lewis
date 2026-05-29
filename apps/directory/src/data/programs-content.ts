// Editorial prose for /programs/:slug — split per slice 3 plan architecture
// decision 6: factual data lives in the DB (mechanism_summary,
// key_safety_findings, citations), patient-facing prose lives here.
//
// Mirror slice 2's apps/directory/src/data/conditions-content.ts pattern.
// Counsel reviews PR diffs of this file — keeping prose in TypeScript
// constants (vs markdown ingestion) means the rendered text appears in
// the diff exactly as users will see it.
//
// Drift detection: every directory_published slug in the DB seed must have
// a matching entry here. Enforced by programs-content.test.ts.

export interface ProgramContent {
  /** One-sentence summary used in <meta description> for SERP previews. */
  aboutSummary: string;
  /** Patient-facing intro paragraphs above the eligibility CTA. */
  aboutParagraphs: ReadonlyArray<string>;
  /** Lead-in prose above the "Check my eligibility" radio cards. */
  whoThisIsForIntro: string;
}

export const PROGRAM_CONTENT: Record<string, ProgramContent> = {
  "wst-057": {
    aboutSummary:
      "An investigational topical treatment for painful diabetic peripheral neuropathy.",
    aboutParagraphs: [
      "WST-057 is a topical small-molecule formulation in development for the treatment of painful diabetic peripheral neuropathy. It targets a peripheral nerve regeneration pathway that has not been addressed by current standard-of-care.",
      "Currently in Phase 2 clinical evaluation. Available in Montana under SB 535's Experimental Treatment Center framework, with treatment provided by a licensed ETC under an ETRB-approved protocol.",
    ],
    whoThisIsForIntro:
      "Adults with confirmed diabetic peripheral neuropathy who have evaluated standard-of-care options including gabapentinoids, SNRIs, and topical agents, and have discussed experimental options with their treating clinician.",
  },
};

export function getProgramContent(slug: string): ProgramContent | undefined {
  return PROGRAM_CONTENT[slug];
}
