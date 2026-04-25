import { describe, expect, it } from "vitest";

import { daysUntilDeadline, formatMontana, montanaDeadline } from "./time.js";

describe("Montana deadline helpers", () => {
  it("adds statutory days using America/Denver display semantics", () => {
    const start = new Date("2026-01-27T16:00:00.000Z");
    const deadline = montanaDeadline(start, 5);

    expect(formatMontana(deadline, "yyyy-MM-dd")).toBe("2026-02-01");
  });

  it("computes calendar days until a Montana deadline", () => {
    const now = new Date("2026-01-30T18:00:00.000Z");
    const deadline = new Date("2026-02-01T18:00:00.000Z");

    expect(daysUntilDeadline(deadline, now)).toBe(2);
  });
});
