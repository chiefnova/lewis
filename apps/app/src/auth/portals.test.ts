import { defaultStaffPath, readStaffPortals } from "@corridor/shared";
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

  it("filters invalid portal names from corridorPortals", () => {
    expect(readStaffPortals({ corridorPortals: ["sponsor", "evil", "etc"] })).toEqual([
      "sponsor",
      "etc",
    ]);
  });

  it("returns valid portals from corridorPortals", () => {
    expect(readStaffPortals({ corridorPortals: ["sponsor", "etc", "admin"] })).toEqual([
      "sponsor",
      "etc",
      "admin",
    ]);
  });

  it("falls back to corridorDefaultPortal when corridorPortals absent", () => {
    expect(readStaffPortals({ corridorDefaultPortal: "admin" })).toEqual(["admin"]);
  });

  it("rejects an invalid corridorDefaultPortal fallback", () => {
    expect(readStaffPortals({ corridorDefaultPortal: "evil" })).toEqual([]);
  });

  it("ignores corridorDefaultPortal when corridorPortals is present (even if empty)", () => {
    expect(readStaffPortals({ corridorPortals: [], corridorDefaultPortal: "etc" })).toEqual([]);
  });

  it("ignores non-array corridorPortals", () => {
    expect(readStaffPortals({ corridorPortals: "etc" })).toEqual([]);
  });
});

describe("defaultStaffPath", () => {
  it("returns null for null metadata", () => {
    expect(defaultStaffPath(null)).toBeNull();
  });

  it("returns null when no portals assigned", () => {
    expect(defaultStaffPath({})).toBeNull();
  });

  it("honors corridorDefaultPortal", () => {
    expect(defaultStaffPath({ corridorDefaultPortal: "etc" })).toBe("/etc");
  });

  it("rejects invalid corridorDefaultPortal", () => {
    expect(defaultStaffPath({ corridorDefaultPortal: "evil" })).toBeNull();
  });

  it("falls through to first portal in corridorPortals", () => {
    expect(defaultStaffPath({ corridorPortals: ["admin", "etc"] })).toBe("/admin");
  });

  it("prefers corridorDefaultPortal over corridorPortals[0]", () => {
    expect(defaultStaffPath({ corridorDefaultPortal: "etc", corridorPortals: ["admin"] })).toBe(
      "/etc",
    );
  });
});
