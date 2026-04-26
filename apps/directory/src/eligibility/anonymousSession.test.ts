// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  clearStoredScreen,
  generateLocalToken,
  getStoredScreen,
  saveStoredScreen,
} from "./anonymousSession";

afterEach(() => window.localStorage.clear());

describe("anonymousSession", () => {
  test("round-trip preserves token, startedAt, answers", () => {
    const screen = {
      token: "t-1",
      startedAt: "2026-04-25T00:00:00.000Z",
      answers: { 0: "Yes" },
    };
    saveStoredScreen("wst-057", screen);
    expect(getStoredScreen("wst-057")).toEqual(screen);
  });

  test("per-program slugs are namespaced", () => {
    saveStoredScreen("a", { token: "a", startedAt: "x", answers: {} });
    saveStoredScreen("b", { token: "b", startedAt: "x", answers: {} });
    expect(getStoredScreen("a")?.token).toBe("a");
    expect(getStoredScreen("b")?.token).toBe("b");
  });

  test("clearStoredScreen removes only the targeted slug", () => {
    saveStoredScreen("a", { token: "a", startedAt: "x", answers: {} });
    saveStoredScreen("b", { token: "b", startedAt: "x", answers: {} });
    clearStoredScreen("a");
    expect(getStoredScreen("a")).toBeNull();
    expect(getStoredScreen("b")?.token).toBe("b");
  });

  test("corrupted JSON returns null (not throw)", () => {
    window.localStorage.setItem("lewis:eligibility:wst-057", "not-json{");
    expect(getStoredScreen("wst-057")).toBeNull();
  });

  test("missing entry returns null", () => {
    expect(getStoredScreen("not-set")).toBeNull();
  });

  test("generateLocalToken uses crypto.randomUUID when available", () => {
    const spy = vi
      .spyOn(window.crypto, "randomUUID")
      .mockReturnValue("00000000-0000-0000-0000-000000000000");
    expect(generateLocalToken()).toBe("00000000-0000-0000-0000-000000000000");
    spy.mockRestore();
  });

  test("saveStoredScreen swallows quota errors", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });
    expect(() => saveStoredScreen("x", { token: "t", startedAt: "x", answers: {} })).not.toThrow();
    spy.mockRestore();
  });
});
