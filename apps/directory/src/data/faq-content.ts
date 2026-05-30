// Slice 4 § 11.8 — abridged homepage FAQ (5 patient questions). The full
// 15-question FAQ migrates to /faq as the canonical destination (P1 page
// implementation per § 32.2). Both surfaces read from this single source of
// truth — homepage filters on `homepage: true`, /faq groups by `category`.
//
// Counsel reviews the answers in the PR diff. When in doubt, voice rule:
// plain, calm, peer-level. No marketing tropes. No exclamation points.
// No emoji. Independence framing surfaced where load-bearing.

export type FaqCategory = "patient" | "physician" | "etc" | "manufacturer";

export interface FaqQuestion {
  /** Stable id used for accordion state + future analytics. */
  id: string;
  question: string;
  answer: string;
  category: FaqCategory;
  /** When true, surfaces on the homepage AbridgedFAQ (max 5). */
  homepage: boolean;
}

export const FAQ_CONTENT: ReadonlyArray<FaqQuestion> = [
  // -- 5 homepage questions (§ 11.8 recommended set) -----------------------
  {
    id: "what-is-lewis",
    question: "What is Lewis?",
    answer:
      "Lewis is an independent directory of experimental treatments available in Montana under SB 535. We list every licensed Experimental Treatment Center and the programs they offer, with the same evidence and contact information a treating clinician would want. We are not a manufacturer, not a clinic, and we do not enroll patients ourselves — we connect you to a licensed ETC that does.",
    category: "patient",
    homepage: true,
  },
  {
    id: "what-is-rtt-montana",
    question: "What is Right to Try in Montana?",
    answer:
      "Montana SB 535 (2025) created a state framework for licensed clinics — Experimental Treatment Centers — to offer investigational treatments to patients who have evaluated standard-of-care options with their treating clinician. Each program operates under an Experimental Treatment Review Board (ETRB)-approved protocol, with mandatory safety reporting and annual public summaries. It is a state regulatory regime with its own licensed-clinic and ETRB-review structure, operating under MAR 2026-427.1 rules.",
    category: "patient",
    homepage: true,
  },
  {
    id: "lewis-charges",
    question: "Does Lewis charge me anything?",
    answer:
      "No. Browsing the directory, taking the eligibility self-screen, and submitting a connect request are all free. Treatment costs are set by the ETC and disclosed on each program page; insurance does not currently cover experimental treatments under Montana's ETC framework, so most programs are cash-pay.",
    category: "patient",
    homepage: true,
  },
  {
    id: "need-account",
    question: "Do I need an account to browse?",
    answer:
      "No. The directory is anonymous-first — every page on lewis.health, including the eligibility self-screen, works without a sign-in. An account is only needed if you choose to submit a connect request and want to track its status; you can also submit a connect request anonymously and create an account afterwards.",
    category: "patient",
    homepage: true,
  },
  {
    id: "eligibility",
    question: "How do I know if I'm eligible?",
    answer:
      "Each program page lists eligibility criteria in plain language, and a short anonymous self-screen tells you whether you may be a fit. Final eligibility is always determined by the ETC's clinical team after reviewing your treating clinician's recommendation and current History & Physical — the self-screen is a first filter, not a clinical decision.",
    category: "patient",
    homepage: true,
  },
];

/** Returns only the homepage-flagged questions (max 5 per § 11.8). */
export function getHomepageFaq(): ReadonlyArray<FaqQuestion> {
  return FAQ_CONTENT.filter((q) => q.homepage).slice(0, 5);
}

/** Returns all questions in the given category — used by the future /faq P1 page. */
export function getFaqByCategory(category: FaqCategory): ReadonlyArray<FaqQuestion> {
  return FAQ_CONTENT.filter((q) => q.category === category);
}
