import { describe, expect, test } from "vitest";
import { evaluate } from "./evaluate";

describe("evaluate eligibility (slice 5 — failedCriterion shape)", () => {
  const qs = [
    {
      pass: ["Yes"] as const,
      failReason: "requires a confirmed diagnosis.",
    },
    {
      pass: ["Yes", "With assistance"] as const,
      failReason: "requires ability to travel.",
    },
    {}, // no pass array — auto-pass when answered
  ];

  test("all answered correctly → passing", () => {
    const r = evaluate(qs, { 0: "Yes", 1: "With assistance", 2: "anything" });
    expect(r.passing).toBe(true);
    expect(r.failedQuestionIndex).toBe(-1);
    expect(r.failedCriterion).toBeNull();
  });

  test("missing answer fails on that index and surfaces its failReason", () => {
    const r = evaluate(qs, { 0: "Yes" });
    expect(r.passing).toBe(false);
    expect(r.failedQuestionIndex).toBe(1);
    expect(r.failedCriterion).toBe("requires ability to travel.");
  });

  test("answer not in pass[] fails", () => {
    const r = evaluate(qs, { 0: "No", 1: "Yes", 2: "x" });
    expect(r.passing).toBe(false);
    expect(r.failedQuestionIndex).toBe(0);
    expect(r.failedCriterion).toBe("requires a confirmed diagnosis.");
  });

  test("question without pass array auto-passes when answered", () => {
    expect(evaluate([{}], { 0: "anything" })).toEqual({
      passing: true,
      failedQuestionIndex: -1,
      failedCriterion: null,
    });
  });

  test("unanswered question without pass array still fails with fallback reason", () => {
    const r = evaluate([{}], {});
    expect(r.passing).toBe(false);
    expect(r.failedQuestionIndex).toBe(0);
    // No curated failReason on this question — fallback clause is used.
    expect(r.failedCriterion).toContain("may not match");
  });

  test("empty questions array trivially passes", () => {
    expect(evaluate([], {})).toEqual({
      passing: true,
      failedQuestionIndex: -1,
      failedCriterion: null,
    });
  });
});
