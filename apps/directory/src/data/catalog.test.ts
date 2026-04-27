import { describe, expect, test } from "vitest";
import { CATALOG, ETCS, getEtcBySlug, getProgramBySlug } from "./catalog";

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
  });

  test("at least one program is currently available", () => {
    expect(CATALOG.some((p) => p.available)).toBe(true);
  });
});
