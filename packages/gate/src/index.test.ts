import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { signCookie } from "./crypto.js";
import { gateMiddleware } from "./index.js";

const PASSWORD = "WST-057";
const SECRET = "test-secret";
const HOST = "localhost:13003";
const ORIGIN = `http://${HOST}`;

function setEnv(): void {
  process.env["LEWIS_GATE_PASSWORD"] = PASSWORD;
  process.env["LEWIS_GATE_SECRET"] = SECRET;
  delete process.env["LEWIS_GATE_DISABLED"];
}

function clearEnv(): void {
  delete process.env["LEWIS_GATE_PASSWORD"];
  delete process.env["LEWIS_GATE_SECRET"];
  delete process.env["LEWIS_GATE_DISABLED"];
}

function getReq(path = "/", cookieValue?: string): Request {
  const headers = new Headers({ host: HOST });
  if (cookieValue) headers.set("cookie", `lewis_gate=${cookieValue}`);
  return new Request(`${ORIGIN}${path}`, { method: "GET", headers });
}

function postAuthReq(opts: { password: string; origin?: string | null; accept?: string }): Request {
  const headers = new Headers({ host: HOST });
  if (opts.origin !== null) {
    headers.set("origin", opts.origin ?? ORIGIN);
  }
  if (opts.accept) headers.set("accept", opts.accept);
  const body = new URLSearchParams({ password: opts.password }).toString();
  headers.set("content-type", "application/x-www-form-urlencoded");
  return new Request(`${ORIGIN}/__gate/auth`, {
    method: "POST",
    headers,
    body,
  });
}

describe("gateMiddleware", () => {
  beforeEach(setEnv);
  afterEach(clearEnv);

  describe("configuration", () => {
    it("503s when LEWIS_GATE_PASSWORD is missing", async () => {
      delete process.env["LEWIS_GATE_PASSWORD"];
      const res = await gateMiddleware(getReq());
      expect(res?.status).toBe(503);
    });

    it("503s when LEWIS_GATE_SECRET is missing", async () => {
      delete process.env["LEWIS_GATE_SECRET"];
      const res = await gateMiddleware(getReq());
      expect(res?.status).toBe(503);
    });

    it("passthroughs when LEWIS_GATE_DISABLED=true (kill switch)", async () => {
      process.env["LEWIS_GATE_DISABLED"] = "true";
      const res = await gateMiddleware(getReq());
      expect(res).toBeUndefined();
    });
  });

  describe("cold visit (no cookie)", () => {
    it("returns 200 gate HTML with noindex + no-store headers", async () => {
      const res = await gateMiddleware(getReq("/"));
      expect(res?.status).toBe(200);
      expect(res?.headers.get("x-robots-tag")).toBe("noindex, nofollow");
      expect(res?.headers.get("cache-control")).toBe("no-store");
      const body = await res?.text();
      expect(body).toContain("Some treatments don");
    });
  });

  describe("cookie verification", () => {
    it("passthroughs when cookie is valid and not expired", async () => {
      const expiry = Date.now() + 60_000;
      const cookie = await signCookie(SECRET, expiry);
      const res = await gateMiddleware(getReq("/", cookie));
      expect(res).toBeUndefined();
    });

    it("returns gate when cookie expiry is in the past", async () => {
      const expiry = Date.now() - 1;
      const cookie = await signCookie(SECRET, expiry);
      const res = await gateMiddleware(getReq("/", cookie));
      expect(res?.status).toBe(200);
    });

    it("returns gate when cookie signature is tampered", async () => {
      const expiry = Date.now() + 60_000;
      const cookie = await signCookie(SECRET, expiry);
      const tampered = cookie.slice(0, -2) + "00";
      const res = await gateMiddleware(getReq("/", tampered));
      expect(res?.status).toBe(200);
    });

    it("returns gate when cookie was signed with a different secret", async () => {
      const expiry = Date.now() + 60_000;
      const cookie = await signCookie("different-secret", expiry);
      const res = await gateMiddleware(getReq("/", cookie));
      expect(res?.status).toBe(200);
    });
  });

  describe("CSRF guard on POST /__gate/auth", () => {
    it("403s when Origin is missing and no Referer", async () => {
      const res = await gateMiddleware(postAuthReq({ password: PASSWORD, origin: null }));
      expect(res?.status).toBe(403);
    });

    it("403s when Origin host does not match request host", async () => {
      const res = await gateMiddleware(
        postAuthReq({ password: PASSWORD, origin: "http://evil.com" }),
      );
      expect(res?.status).toBe(403);
    });
  });

  describe("successful auth", () => {
    it("returns JSON with set-cookie when client requests application/json", async () => {
      const res = await gateMiddleware(
        postAuthReq({ password: PASSWORD, accept: "application/json" }),
      );
      expect(res?.status).toBe(200);
      expect(res?.headers.get("content-type")).toContain("application/json");
      const setCookie = res?.headers.get("set-cookie");
      expect(setCookie).toMatch(/^lewis_gate=\d+\.[a-f0-9]+;/);
      expect(setCookie).toContain("HttpOnly");
      expect(setCookie).toContain("SameSite=Lax");
      expect(setCookie).toContain("Path=/");
      expect(setCookie).toContain("Max-Age=604800");
      const body = await res?.json();
      expect(body).toEqual({ ok: true });
    });

    it("returns Loading HTML interstitial when client wants HTML (no-JS fallback)", async () => {
      const res = await gateMiddleware(postAuthReq({ password: PASSWORD }));
      expect(res?.status).toBe(200);
      expect(res?.headers.get("content-type")).toContain("text/html");
      expect(res?.headers.get("set-cookie")).toMatch(/^lewis_gate=/);
      const body = await res?.text();
      expect(body).toContain("Loading");
    });
  });

  describe("failed auth", () => {
    it("returns 401 JSON for fetch caller and no cookie", async () => {
      const start = Date.now();
      const res = await gateMiddleware(
        postAuthReq({ password: "wrong", accept: "application/json" }),
      );
      const elapsed = Date.now() - start;
      expect(res?.status).toBe(401);
      expect(res?.headers.get("set-cookie")).toBeNull();
      expect(elapsed).toBeGreaterThanOrEqual(700);
      const body = await res?.json();
      expect(body).toEqual({ ok: false });
    });

    it("returns gate HTML with error block for HTML form post (no-JS fallback)", async () => {
      const res = await gateMiddleware(postAuthReq({ password: "wrong" }));
      expect(res?.status).toBe(200);
      expect(res?.headers.get("set-cookie")).toBeNull();
      const body = await res?.text();
      expect(body).toContain("That isn");
    });
  });

  describe("GET /__gate/auth", () => {
    it("redirects to / instead of rendering the gate", async () => {
      const res = await gateMiddleware(getReq("/__gate/auth"));
      expect(res?.status).toBe(303);
      expect(res?.headers.get("location")).toBe("/");
    });
  });
});
