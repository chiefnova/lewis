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
  const html = renderProgramBriefHtml(detail, options);
  const browser = await getBrowser(timeout);

  // Track the page (created inside the deadline-raced operation) so the
  // outer timeout can force-close it without waiting for the abandoned
  // newPage / setContent / page.pdf promises to settle. Promise.race
  // abandons the loser; without this, an outer timeout firing while
  // setContent or page.pdf was hung would leak the Chromium page.
  let page: import("puppeteer").Page | null = null;
  let pageClosed = false;
  const closePageOnce = async (): Promise<void> => {
    if (pageClosed || !page) return;
    pageClosed = true;
    try {
      await page.close();
    } catch {
      // page.close() can throw if Chromium disconnected mid-render
      // (browser crashed, container died, etc.). We've already given
      // up on this render so swallow it. getBrowser's connected check
      // auto-relaunches on the next request.
    }
  };

  const operation = (async () => {
    page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout });
    const pdf = await page.pdf({
      format: "letter",
      printBackground: true,
      margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
      timeout,
    });
    // puppeteer returns Uint8Array; the API layer wants Buffer for Hono.
    return Buffer.from(pdf);
  })();

  try {
    return await withRenderDeadline(operation, timeout, closePageOnce);
  } finally {
    await closePageOnce();
  }
}

async function withRenderDeadline<T>(
  operation: Promise<T>,
  timeoutMs: number,
  onTimeout?: () => Promise<void> | void,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          // Fire the abort callback before rejecting so the abandoned
          // operation gets a chance to release its resources (close the
          // Puppeteer page, etc.) before the caller sees the timeout.
          // Errors in the abort callback are swallowed — caller already
          // sees the timeout, propagating an abort-cleanup error would
          // mask it.
          if (onTimeout) {
            void Promise.resolve()
              .then(() => onTimeout())
              .catch(() => undefined);
          }
          reject(new PdfRenderTimeoutError(timeoutMs));
        }, timeoutMs);
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
