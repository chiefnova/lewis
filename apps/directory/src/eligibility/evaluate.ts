// Eligibility self-screen evaluator. Pure function so it can be unit-tested
// without React. The real result for a connect request comes from the API
// (POST /v1/public/eligibility/sessions/:token/complete) — this local
// evaluator runs in the browser only to render the immediate result page.
//
// Slice 5 § 17.4 — returns `failedCriterion`, the user-facing clause
// rendered by the fail-branch UI after "This program may not be the right
// fit because ". The clause comes from the failing question's `failReason`
// field; lower-case so it slots into the sentence. Defensive fallback for
// questions without a curated reason.

export interface EvaluableQuestion {
  // The set of answers that count as "passing" for this question. If absent,
  // any answer counts as a pass — the question is informational only.
  pass?: ReadonlyArray<string>;
  // The user-facing reason text the fail-branch UI renders after
  // "This program may not be the right fit because ". Lower-case clause
  // ending with a period.
  failReason?: string;
}

export interface EligibilityResult {
  passing: boolean;
  /** Index of the first failing question (0-based), or -1 if all pass. */
  failedQuestionIndex: number;
  /** User-facing clause for the § 17.4 fail-branch reason line. */
  failedCriterion: string | null;
}

const FALLBACK_FAIL_REASON = "may not match what you shared in the self-screen.";

export function evaluate(
  questions: ReadonlyArray<EvaluableQuestion>,
  answers: Record<number, string>,
): EligibilityResult {
  const failingIndex = questions.findIndex((q, i) => {
    const a = answers[i];
    if (!a) return true;
    if (!q.pass) return false;
    return !q.pass.includes(a);
  });
  if (failingIndex === -1) {
    return { passing: true, failedQuestionIndex: -1, failedCriterion: null };
  }
  const reason = questions[failingIndex]?.failReason ?? FALLBACK_FAIL_REASON;
  return {
    passing: false,
    failedQuestionIndex: failingIndex,
    failedCriterion: reason,
  };
}
