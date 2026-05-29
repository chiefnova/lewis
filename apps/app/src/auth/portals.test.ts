import { defaultStaffPath, readStaffPortals } from "@lewis/shared";
import { describe, expect, it } from "vitest";

describe("readStaffPortals", () => {
  it("returns [] for null", () => {
    expect(readStaffPortals(null)).toEqual([]);
  });

  it("returns [] for undefined", () => {
    expect(readStaffPortals(undefined)).toEqual([]);
  });

  it("returns [] for empty metadata", () => {
    expect(readStaffPortals({})).toEqual([]);
  });

  it("filters invalid portal names from lewisPortals", () => {
    expect(readStaffPortals({ lewisPortals: ["manufacturer", "evil", "etc"] })).toEqual([
      "manufacturer",
      "etc",
    ]);
  });

  it("returns valid portals from lewisPortals", () => {
    expect(readStaffPortals({ lewisPortals: ["manufacturer", "etc", "admin"] })).toEqual([
      "manufacturer",
      "etc",
      "admin",
    ]);
  });

  it("falls back to lewisDefaultPortal when lewisPortals absent", () => {
    expect(readStaffPortals({ lewisDefaultPortal: "admin" })).toEqual(["admin"]);
  });

  it("rejects an invalid lewisDefaultPortal fallback", () => {
    expect(readStaffPortals({ lewisDefaultPortal: "evil" })).toEqual([]);
  });

  it("ignores lewisDefaultPortal when lewisPortals is present (even if empty)", () => {
    expect(readStaffPortals({ lewisPortals: [], lewisDefaultPortal: "etc" })).toEqual([]);
  });

  it("ignores non-array lewisPortals", () => {
    expect(readStaffPortals({ lewisPortals: "etc" })).toEqual([]);
  });
});

describe("defaultStaffPath", () => {
  it("returns null for null metadata", () => {
    expect(defaultStaffPath(null)).toBeNull();
  });

  it("returns null when no portals assigned", () => {
    expect(defaultStaffPath({})).toBeNull();
  });

  it("honors lewisDefaultPortal", () => {
    expect(defaultStaffPath({ lewisDefaultPortal: "etc" })).toBe("/etc");
  });

  it("rejects invalid lewisDefaultPortal", () => {
    expect(defaultStaffPath({ lewisDefaultPortal: "evil" })).toBeNull();
  });

  it("falls through to first portal in lewisPortals", () => {
    expect(defaultStaffPath({ lewisPortals: ["admin", "etc"] })).toBe("/admin");
  });

  it("prefers lewisDefaultPortal over lewisPortals[0]", () => {
    expect(defaultStaffPath({ lewisDefaultPortal: "etc", lewisPortals: ["admin"] })).toBe("/etc");
  });
});
