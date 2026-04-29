import { describe, expect, test } from "vitest";
import {
  CATALOG,
  CONDITIONS,
  ETCS,
  getConditionBySlug,
  getEtcBySlug,
  getProgramBySlug,
  getProgramsForCondition,
} from "./catalog";

describe("catalog lookups", () => {
  test("getProgramBySlug returns the WST-057 program", () => {
    const p = getProgramBySlug("wst-057");
    expect(p).toBeDefined();
    expect(p?.available).toBe(true);
    expect(p?.name).toContain("WST-057");
  });

  test("getProgramBySlug returns undefined for an unknown slug", () => {
    expect(getProgramBySlug("definitely-not-a-program")).toBeUndefined();
  });

  test("every 'soon-*' placeholder is unavailable", () => {
    for (const p of CATALOG.filter((c) => c.slug.startsWith("soon-"))) {
      expect(p.available).toBe(false);
    }
  });

  test("getEtcBySlug('big-sky') resolves and offers wst-057", () => {
    const etc = getEtcBySlug("big-sky");
    expect(etc).toBeDefined();
    expect(etc?.programs).toContain("wst-057");
  });

  test("getEtcBySlug returns undefined for an unknown slug", () => {
    expect(getEtcBySlug("not-a-real-etc")).toBeUndefined();
  });

  test("all catalog slugs match the public schema regex", () => {
    const re = /^[a-z0-9-]+$/;
    for (const p of CATALOG) expect(p.slug).toMatch(re);
    for (const e of ETCS) expect(e.slug).toMatch(re);
    for (const c of CONDITIONS) expect(c.slug).toMatch(re);
  });

  test("at least one program is currently available", () => {
    expect(CATALOG.some((p) => p.available)).toBe(true);
  });

  test("seeded live neuropathy conditions link to WST-057", () => {
    const liveNeuropathyConditions = CONDITIONS.filter(
      (c) => c.state === "live" && c.slug.includes("neuropathy"),
    );

    expect(liveNeuropathyConditions).toHaveLength(4);
    for (const condition of liveNeuropathyConditions) {
      expect(getProgramsForCondition(condition).map((p) => p.slug)).toContain("wst-057");
    }
  });

  test("getConditionBySlug resolves ALS as not offered", () => {
    expect(getConditionBySlug("als")).toMatchObject({
      name: "Amyotrophic Lateral Sclerosis (ALS)",
      state: "not_offered",
      programSlugs: [],
    });
  });
});
