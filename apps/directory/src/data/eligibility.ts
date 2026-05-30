// Per-program eligibility self-screen question banks. Worked example for WST-057
// from the design handoff. Production-side these will be served by
// GET /v1/public/programs/:slug/eligibility once available.
//
// Slice 5 § 17.4 — the `failReason` clause is the user-facing text the
// hybrid /eligibility fail branch renders after "This program may not be
// the right fit because ". It starts lowercase so it slots cleanly into
// that sentence. Counsel-reviewable copy; counsel sees it in the PR diff.

export interface EligibilityQuestion {
  q: string;
  opts: ReadonlyArray<string>;
  // The answer that is considered "passing" for a likely-eligible result.
  // The screen is informational only — final eligibility is the ETC clinical
  // team's call after reviewing the patient's history.
  pass?: ReadonlyArray<string>;
  // The user-facing reason text rendered by the fail-branch UI when this
  // question is the one that disqualified the screen. Must start lowercase
  // because it follows "...because it " in the sentence.
  failReason?: string;
}

export const ELIGIBILITY_BY_PROGRAM: Readonly<Record<string, ReadonlyArray<EligibilityQuestion>>> =
  {
    "wst-057": [
      {
        q: "Have you been diagnosed with diabetic peripheral neuropathy by a treating clinician?",
        opts: ["Yes", "No", "I'm not sure"],
        pass: ["Yes"],
        failReason:
          "requires a confirmed diabetic peripheral neuropathy diagnosis from a treating clinician.",
      },
      {
        q: "Have you tried at least one standard-of-care option (gabapentinoid, SNRI, or topical agent)?",
        opts: ["Yes", "No"],
        pass: ["Yes"],
        failReason:
          "requires that you've evaluated at least one standard-of-care option — gabapentinoid, SNRI, or topical agent — before considering an experimental treatment.",
      },
      {
        q: "Are you 18 years of age or older?",
        opts: ["Yes", "No"],
        pass: ["Yes"],
        failReason: "currently accepts patients age 18 and older.",
      },
      {
        q: "Are you able to travel to Bozeman, Montana for in-person visits?",
        opts: ["Yes", "With assistance", "No"],
        pass: ["Yes", "With assistance"],
        failReason: "requires the ability to travel to Bozeman, Montana for in-person visits.",
      },
    ],
  };

export function getEligibilityForProgram(
  slug: string,
): ReadonlyArray<EligibilityQuestion> | undefined {
  return ELIGIBILITY_BY_PROGRAM[slug];
}
