import { describe, expect, it } from "vitest";

import { signCookie, verifyCookie, verifyPassword } from "./crypto.js";

const SECRET = "test-secret-do-not-use-in-prod";

describe("signCookie / verifyCookie", () => {
  it("round-trips a future expiry as ok", async () => {
    const expiry = Date.now() + 60_000;
    const cookie = await signCookie(SECRET, expiry);
    const result = await verifyCookie(SECRET, cookie);
    expect(result).toEqual({ ok: true, expiryMs: expiry });
  });

  it("rejects a past expiry even with valid signature", async () => {
    const expiry = Date.now() - 1;
    const cookie = await signCookie(SECRET, expiry);
    const result = await verifyCookie(SECRET, cookie);
    expect(result).toEqual({ ok: false });
  });

  it("rejects a tampered signature", async () => {
    const expiry = Date.now() + 60_000;
    const cookie = await signCookie(SECRET, expiry);
    const tampered = cookie.slice(0, -2) + "00";
    const result = await verifyCookie(SECRET, tampered);
    expect(result).toEqual({ ok: false });
  });

  it("rejects a different secret (cookies do not cross between apps)", async () => {
    const expiry = Date.now() + 60_000;
    const cookie = await signCookie(SECRET, expiry);
    const result = await verifyCookie("a-different-secret", cookie);
    expect(result).toEqual({ ok: false });
  });

  it("rejects malformed values", async () => {
    expect(await verifyCookie(SECRET, "")).toEqual({ ok: false });
    expect(await verifyCookie(SECRET, "no-dot")).toEqual({ ok: false });
    expect(await verifyCookie(SECRET, ".")).toEqual({ ok: false });
    expect(await verifyCookie(SECRET, "abc.def")).toEqual({ ok: false });
    expect(await verifyCookie(SECRET, "1700000000000.")).toEqual({ ok: false });
  });
});

describe("verifyPassword", () => {
  it("returns true when submitted matches expected", async () => {
    expect(await verifyPassword(SECRET, "WST-057", "WST-057")).toBe(true);
  });

  it("returns false on mismatch", async () => {
    expect(await verifyPassword(SECRET, "wrong", "WST-057")).toBe(false);
  });

  it("returns false on empty submission", async () => {
    expect(await verifyPassword(SECRET, "", "WST-057")).toBe(false);
  });

  it("returns false on near-miss (single character difference)", async () => {
    expect(await verifyPassword(SECRET, "WST-058", "WST-057")).toBe(false);
  });
});
