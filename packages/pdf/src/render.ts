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
import type { Browser, Page } from "puppeteer";
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

  // Track the page so cleanup can run from any of three call sites:
  //   1. withRenderDeadline's onTimeout — fire-and-forget close on the
  //      timeout edge (may no-op if newPage hasn't resolved yet).
  //   2. The inner finally inside the IIFE below — guarantees a close
  //      after the IIFE's promise eventually settles, even if it
  //      settles AFTER the outer deadline already gave up. Without this,
  //      a slow newPage that resolves post-timeout would leak the page
  //      until process exit (the IIFE keeps running on the abandoned
  //      side of Promise.race).
  //   3. The outer finally — covers the success path (closes page after
  //      pdf is captured) and is the no-op last line of defense.
  // closePageOnce is idempotent via the pageClosed flag, so all three
  // call sites are safe to fire.
  let page: Page | null = null;
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

  // The IIFE runs entirely inside the deadline race, including the
  // browser-launch step. The header comment at line 7 promises a "5-second
  // hard timeout" as a wall-clock contract — putting getBrowser INSIDE the
  // race makes that contract honest on cold start. Steady-state (warm
  // shared browser) returns ~0ms from getBrowser, so the wrap costs
  // nothing in the hot path.
  const operation = (async () => {
    try {
      const browser = await getBrowser(timeout);
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
    } finally {
      // Inner finally covers the post-timeout race: if newPage resolved
      // late (after the outer race already rejected), this still closes
      // the page when the IIFE's promise eventually settles.
      await closePageOnce();
    }
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
  // Capture both refs synchronously and null the module-level state in
  // the same tick. Without this, a launch that resolves mid-dispose
  // would silently assign the just-launched Browser back into
  // sharedBrowser via the launchPromise body's closure — and any
  // concurrent getBrowser caller would see "still alive" or "still in
  // flight" and receive a doomed handle. Capturing locally lets us
  // close both the already-launched browser AND any in-flight launch
  // result deterministically before returning.
  const browser = sharedBrowser;
  const inFlight = launchPromise;
  sharedBrowser = null;
  launchPromise = null;

  const closeTasks: Array<Promise<unknown>> = [];
  if (browser) {
    closeTasks.push(browser.close());
  }
  if (inFlight) {
    // Wait for the in-flight launch to land, then close that Browser
    // too. Swallow rejections — a failed launch has no handle to close.
    // We do NOT reassign sharedBrowser from the launched handle; the
    // launchPromise body's closure writes to sharedBrowser when it
    // resolves, and the final null-out below cancels that write so
    // post-dispose module state stays deterministic.
    closeTasks.push(inFlight.then((launched) => launched.close()).catch(() => undefined));
  }
  await Promise.allSettled(closeTasks);

  // The launchPromise body executes `sharedBrowser = browser` when
  // launch resolves; that write happened during the await above (after
  // our initial null-out). Reset sharedBrowser to null so a future
  // getBrowser starts a fresh launch instead of returning the closed
  // Browser handle we just disposed of.
  sharedBrowser = null;
}
