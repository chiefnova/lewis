// Per-program eligibility self-screen question banks. Worked example for WST-057
// from the design handoff. Production-side these will be served by
// GET /v1/public/programs/:slug/eligibility once available.

export interface EligibilityQuestion {
  q: string;
  opts: ReadonlyArray<string>;
  // The answer that is considered "passing" for a likely-eligible result.
  // The screen is informational only — final eligibility is the ETC clinical
  // team's call after reviewing the patient's history.
  pass?: ReadonlyArray<string>;
}

export const ELIGIBILITY_BY_PROGRAM: Readonly<Record<string, ReadonlyArray<EligibilityQuestion>>> =
  {
    "wst-057": [
      {
        q: "Have you been diagnosed with diabetic peripheral neuropathy by a treating physician?",
        opts: ["Yes", "No", "I'm not sure"],
        pass: ["Yes"],
      },
      {
        q: "Have you tried at least one standard-of-care option (gabapentinoid, SNRI, or topical agent)?",
        opts: ["Yes", "No"],
        pass: ["Yes"],
      },
      {
        q: "Are you 18 years of age or older?",
        opts: ["Yes", "No"],
        pass: ["Yes"],
      },
      {
        q: "Are you able to travel to Bozeman, Montana for in-person visits?",
        opts: ["Yes", "With assistance", "No"],
        pass: ["Yes", "With assistance"],
      },
    ],
  };

export function getEligibilityForProgram(
  slug: string,
): ReadonlyArray<EligibilityQuestion> | undefined {
  return ELIGIBILITY_BY_PROGRAM[slug];
}
