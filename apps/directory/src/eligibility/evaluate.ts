// Eligibility self-screen evaluator. Pure function so it can be unit-tested
// without React. The real result for a connect request comes from the API
// (POST /v1/public/eligibility/sessions/:token/complete) — this local
// evaluator runs in the browser only to render the immediate result page.

export interface EvaluableQuestion {
  // The set of answers that count as "passing" for this question. If absent,
  // any answer counts as a pass — the question is informational only.
  pass?: ReadonlyArray<string>;
}

export interface EligibilityResult {
  passing: boolean;
  reason?: string;
}

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
  if (failingIndex === -1) return { passing: true };
  return {
    passing: false,
    reason: `Question ${failingIndex + 1} did not match the screen criteria.`,
  };
}
