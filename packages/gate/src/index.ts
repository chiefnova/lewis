/* Vercel Edge Middleware for the temporary lewis.health portal gate.
 *
 * Runs on Vercel's Edge runtime (V8 isolates, Web standards only — no Node
 * APIs). Each of the three frontends (apps/directory, apps/app, apps/patient)
 * has a one-line middleware.ts that re-exports `gateMiddleware` and
 * `gateConfig` from this file.
 *
 * Returning `undefined` from middleware = passthrough (request continues to
 * the static file / SPA index). Returning a `Response` short-circuits the
 * request.
 *
 * Local dev (`vite` via `mise run dev:*`) bypasses this entirely — Vercel
 * middleware only runs on Vercel-built deploys. Test the gate via
 * `vercel dev` from each app directory or by deploying to a preview URL.
 */

import { signCookie, verifyCookie, verifyPassword } from "./crypto.js";
import { gateHtml, loadingHtml } from "./html.js";

const COOKIE_NAME = "lewis_gate";
const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 7;

function readEnv(key: string): string | undefined {
  return (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.[key];
}

function gateResponse(opts: { error?: boolean; status?: number } = {}): Response {
  const error = opts.error === true;
  return new Response(gateHtml(error ? { error: true } : {}), {
    status: opts.status ?? 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  const parts = header.split(";");
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    if (k === name) return part.slice(eq + 1).trim();
  }
  return null;
}

/* CSRF guard: a cross-site form post (e.g. evil.com submitting to our auth
 * endpoint) lacks a same-host Origin/Referer. Both modern browsers reliably
 * send Origin on POSTs; Referer is a fallback. Missing both = reject. */
function isSameOrigin(req: Request): boolean {
  const host = req.headers.get("host");
  if (!host) return false;
  const check = (header: string | null): boolean | undefined => {
    if (!header) return undefined;
    try {
      return new URL(header).host === host;
    } catch {
      return false;
    }
  };
  const fromOrigin = check(req.headers.get("origin"));
  if (fromOrigin !== undefined) return fromOrigin;
  const fromReferer = check(req.headers.get("referer"));
  if (fromReferer !== undefined) return fromReferer;
  return false;
}

const sleep = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/* Brute-force throttle on a wrong password. 800ms is short enough to feel
 * snappy through the client-side "Checking…" state but long enough to make
 * automated guessing unattractive at the scale a temporary gate cares about
 * (the strong password and HMAC-signed cookie carry the rest of the load). */
const FAIL_DELAY_MS = 800;

function wantsJson(req: Request): boolean {
  const accept = req.headers.get("accept") ?? "";
  return accept.includes("application/json");
}

const SET_COOKIE_HEADER = (value: string): string =>
  `${COOKIE_NAME}=${value}; Path=/; Max-Age=${COOKIE_MAX_AGE_S}; HttpOnly; Secure; SameSite=Lax`;

/* Exclude static assets and crawl directives from the gate. Three reasons:
 *   1. SEO: serving the gate HTML in place of /robots.txt or /sitemap.xml
 *      teaches Googlebot the wrong thing and the cache outlives the gate.
 *   2. UX: serving the gate HTML in place of /favicon.ico paints a broken
 *      icon for anyone who lands on the gate page.
 *   3. Cost: Vercel bills an Edge invocation per matched request. Letting
 *      Vite/Vercel serve static asset routes directly avoids that.
 * Trade-off: the SPA's JS/CSS bundle is fetchable by anyone who knows the
 * URL, even with the gate up. Acceptable for a temporary gate over WIP
 * code — the SPA still can't actually run without the index.html document
 * (which IS gated) and without API auth at api.lewis.health (Clerk/RLS,
 * separate). */
export const gateConfig = {
  matcher: [
    "/((?!_next/|_vercel/|favicon\\.ico|apple-touch-icon|robots\\.txt|sitemap\\.xml|.*\\.(?:js|mjs|css|map|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|otf)).*)",
  ],
};

export async function gateMiddleware(req: Request): Promise<Response | undefined> {
  if (readEnv("LEWIS_GATE_DISABLED") === "true") return undefined;

  const password = readEnv("LEWIS_GATE_PASSWORD");
  const secret = readEnv("LEWIS_GATE_SECRET");
  if (!password || !secret) {
    return new Response("Gate misconfigured.", {
      status: 503,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  const url = new URL(req.url);

  if (req.method === "POST" && url.pathname === "/__gate/auth") {
    if (!isSameOrigin(req)) {
      return gateResponse({ error: true, status: 403 });
    }
    let submitted = "";
    try {
      const form = await req.formData();
      const value = form.get("password");
      if (typeof value === "string") submitted = value;
    } catch {
      submitted = "";
    }
    const ok = await verifyPassword(secret, submitted, password);
    const json = wantsJson(req);
    if (ok) {
      const expiry = Date.now() + COOKIE_MAX_AGE_S * 1000;
      const cookieValue = await signCookie(secret, expiry);
      /* Two response shapes for the success case:
       *   - JSON for fetch callers (the gate's inline JS) — client handles
       *     the smooth fade-to-loading and navigates via location.replace.
       *   - HTML "Loading…" interstitial for the no-JS form-post fallback,
       *     which keeps the same calm visual bridge before /. */
      if (json) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "set-cookie": SET_COOKIE_HEADER(cookieValue),
            "cache-control": "no-store",
          },
        });
      }
      return new Response(loadingHtml(), {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "set-cookie": SET_COOKIE_HEADER(cookieValue),
          "cache-control": "no-store",
          "x-robots-tag": "noindex, nofollow",
        },
      });
    }
    await sleep(FAIL_DELAY_MS);
    if (json) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 401,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }
    return gateResponse({ error: true });
  }

  const cookie = readCookie(req, COOKIE_NAME);
  if (cookie) {
    const verified = await verifyCookie(secret, cookie);
    if (verified.ok) return undefined;
  }

  if (url.pathname === "/__gate/auth") {
    return new Response(null, { status: 303, headers: { location: "/" } });
  }

  return gateResponse();
}

export default gateMiddleware;
