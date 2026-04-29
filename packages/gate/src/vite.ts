/* Vite dev-server shim for the gate.
 *
 * Production runs on Vercel Edge — Vite dev server has no middleware layer
 * for our Edge code to attach to. This shim bridges Vite's connect-style
 * middleware to the same `gateMiddleware` Web-standards function we ship to
 * Edge, so local dev mirrors what visitors see in production.
 *
 * Active whenever the plugin is registered. Defaults to the production
 * password (WST-057) and a non-secret dev SECRET if env vars are unset, so
 * `mise run dev:*` works with no extra setup. To bypass the gate locally
 * set `LEWIS_GATE_DISABLED=true` (same env var the production middleware
 * honours as a kill switch).
 *
 * The 7-day signed cookie persists across reloads, so the password prompt
 * shows up at most once a week per developer machine.
 */

import type { IncomingMessage, ServerResponse } from "node:http";

import { gateMiddleware } from "./index.js";

interface ConnectMiddleware {
  (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void): void;
}

interface ViteDevServer {
  middlewares: { use: (fn: ConnectMiddleware) => void };
}

interface VitePluginShape {
  name: string;
  configureServer: (server: ViteDevServer) => void;
}

async function readBody(req: IncomingMessage): Promise<string | undefined> {
  if (req.method === "GET" || req.method === "HEAD" || !req.method) return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) return undefined;
  return Buffer.concat(chunks).toString("utf-8");
}

function toWebRequest(req: IncomingMessage, body: string | undefined): Request {
  const host = req.headers.host ?? "localhost";
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? "http";
  const url = `${proto}://${host}${req.url ?? "/"}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") headers.set(k, v);
    else if (Array.isArray(v)) for (const item of v) headers.append(k, item);
  }
  const init: RequestInit = { method: req.method ?? "GET", headers };
  if (body !== undefined) init.body = body;
  return new Request(url, init);
}

async function applyResponse(response: Response, res: ServerResponse): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    /* Vite serves dev over plain HTTP so the browser silently drops a
     * Set-Cookie marked Secure. Strip it for dev so login persists. */
    if (key.toLowerCase() === "set-cookie") {
      res.setHeader("set-cookie", value.replace(/;\s*Secure/i, ""));
    } else {
      res.setHeader(key, value);
    }
  });
  const buf = Buffer.from(await response.arrayBuffer());
  res.end(buf);
}

const DEV_DEFAULT_PASSWORD = "WST-057";
const DEV_DEFAULT_SECRET = "dev-only-non-secret-do-not-use-in-prod";

export function gateVitePlugin(): VitePluginShape {
  return {
    name: "lewis-gate-dev",
    configureServer(server) {
      /* Default the gate ON in dev so local mirrors production. The plugin
       * being in vite.config.ts is the opt-in; the kill-switch env var is
       * the opt-out — same one the production middleware honors. */
      if (!process.env["LEWIS_GATE_PASSWORD"]) {
        process.env["LEWIS_GATE_PASSWORD"] = DEV_DEFAULT_PASSWORD;
      }
      if (!process.env["LEWIS_GATE_SECRET"]) {
        process.env["LEWIS_GATE_SECRET"] = DEV_DEFAULT_SECRET;
      }
      const disabled = process.env["LEWIS_GATE_DISABLED"] === "true";
      console.log(
        disabled
          ? "[lewis-gate] disabled (LEWIS_GATE_DISABLED=true)"
          : "[lewis-gate] active (set LEWIS_GATE_DISABLED=true to bypass)",
      );
      server.middlewares.use((req, res, next) => {
        void (async () => {
          try {
            const body = await readBody(req);
            const webReq = toWebRequest(req, body);
            const response = await gateMiddleware(webReq);
            if (!response) {
              next();
              return;
            }
            await applyResponse(response, res);
          } catch (err) {
            next(err);
          }
        })();
      });
    },
  };
}
