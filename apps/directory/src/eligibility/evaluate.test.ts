import { describe, expect, test } from "vitest";
import { evaluate } from "./evaluate";

describe("evaluate eligibility", () => {
  const qs = [
    { pass: ["Yes"] as const },
    { pass: ["Yes", "With assistance"] as const },
    {}, // no pass array — auto-pass when answered
  ];

  test("all answered correctly => passing", () => {
    expect(evaluate(qs, { 0: "Yes", 1: "With assistance", 2: "anything" })).toEqual({
      passing: true,
    });
  });

  test("missing answer fails on that index", () => {
    const r = evaluate(qs, { 0: "Yes" });
    expect(r.passing).toBe(false);
    expect(r.reason).toContain("Question 2");
  });

  test("answer not in pass[] fails", () => {
    const r = evaluate(qs, { 0: "No", 1: "Yes", 2: "x" });
    expect(r.passing).toBe(false);
    expect(r.reason).toContain("Question 1");
  });

  test("question without pass array auto-passes when answered", () => {
    expect(evaluate([{}], { 0: "anything" })).toEqual({ passing: true });
  });

  test("unanswered question without pass array still fails (no answer)", () => {
    expect(evaluate([{}], {}).passing).toBe(false);
  });

  test("empty questions array trivially passes", () => {
    expect(evaluate([], {})).toEqual({ passing: true });
  });
});
