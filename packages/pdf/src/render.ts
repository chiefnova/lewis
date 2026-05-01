// Puppeteer renderer for the program brief PDF.
//
// Per architecture decisions in the slice 3 plan:
//   - Synchronous render in the API request path (no BullMQ queue).
//   - Single shared Browser instance, lazy-launched on first call,
//     kept warm across requests.
//   - 5-second hard timeout; on timeout the request 503s and the
//     Cloudflare edge serves stale via stale-while-revalidate.
//   - SIGTERM hook in the API server calls disposeRenderer() to clean up.
//
// puppeteer (full distribution) is imported lazily so:
//   - The HTML template snapshot test can run without Chromium installed.
//   - Cold-imports of @lewis/pdf for type-only usage don't pull in
//     the puppeteer dependency.

import { clearTimeout, setTimeout } from "node:timers";
import type { Browser } from "puppeteer";
import type { PublicProgramDetail } from "@lewis/shared";

import {
  renderProgramBriefHtml,
  type RenderProgramBriefHtmlOptions,
} from "./templates/program-brief.html.js";

let sharedBrowser: Browser | null = null;
let launchPromise: Promise<Browser> | null = null;

const DEFAULT_TIMEOUT_MS = 5_000;

export class PdfRenderTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Program brief PDF render timed out after ${timeoutMs}ms`);
    this.name = "PdfRenderTimeoutError";
  }
}

async function getBrowser(timeoutMs: number): Promise<Browser> {
  if (sharedBrowser && sharedBrowser.connected) return sharedBrowser;
  if (launchPromise) return launchPromise;

  // Dynamic import keeps puppeteer out of the type-only dep graph.
  // The cast goes through unknown so we can call the runtime API
  // without import puppeteer's value side eagerly at the top level.
  launchPromise = (async () => {
    const puppeteerModule = (await import("puppeteer")) as {
      default: { launch(opts: Record<string, unknown>): Promise<Browser> };
    };
    const browser = await puppeteerModule.default.launch({
      headless: true,
      timeout: timeoutMs,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--no-zygote",
        "--single-process",
      ],
    });
    sharedBrowser = browser;
    return browser;
  })().finally(() => {
    launchPromise = null;
  });

  return launchPromise;
}

export interface RenderProgramBriefOptions extends RenderProgramBriefHtmlOptions {
  /** Override the default 5s render timeout. */
  timeoutMs?: number;
}

export async function renderProgramBrief(
  detail: PublicProgramDetail,
  options: RenderProgramBriefOptions = {},
): Promise<Buffer> {
  const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return withRenderDeadline(renderProgramBriefUnsafe(detail, options, timeout), timeout);
}

async function renderProgramBriefUnsafe(
  detail: PublicProgramDetail,
  options: RenderProgramBriefOptions,
  timeout: number,
): Promise<Buffer> {
  const html = renderProgramBriefHtml(detail, options);

  const browser = await getBrowser(timeout);
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0", timeout });
    const pdf = await page.pdf({
      format: "letter",
      printBackground: true,
      margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
      timeout,
    });
    // puppeteer returns Uint8Array; the API layer wants Buffer for Hono.
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

async function withRenderDeadline<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new PdfRenderTimeoutError(timeoutMs)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function disposeRenderer(): Promise<void> {
  if (sharedBrowser) {
    const b = sharedBrowser;
    sharedBrowser = null;
    await b.close();
  }
}
