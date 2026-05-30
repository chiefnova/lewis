import type { PublicProgramDetail } from "@lewis/shared";
import type { Browser, Page } from "puppeteer";
import { afterEach, describe, expect, test, vi } from "vitest";

const DETAIL: PublicProgramDetail = {
  slug: "wst-057",
  name: "WST-057",
  indication: "for diabetic peripheral neuropathy",
  manufacturer: null,
  form: "Topical",
  phase: "Phase 2",
  etcCount: 1,
  available: true,
  about: "About WST-057.",
  whoThisIsFor: "Adults with confirmed diabetic peripheral neuropathy.",
  enrollment: [],
  costRange: null,
  publishedEvidenceUrl: null,
  clinicalTrialsGovId: null,
  indNumber: null,
  publishedPaper: null,
  etrb: null,
  mechanismSummary: null,
  keySafetyFindings: null,
};

afterEach(() => {
  vi.doUnmock("puppeteer");
  vi.resetModules();
});

describe("renderProgramBrief", () => {
  test("clears a failed launch promise so the next render can retry", async () => {
    const { browser } = buildBrowser(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const launch = vi
      .fn()
      .mockRejectedValueOnce(new Error("chromium launch failed"))
      .mockResolvedValueOnce(browser);
    vi.doMock("puppeteer", () => ({ default: { launch } }));

    const { disposeRenderer, renderProgramBrief } = await import("./render.js");

    await expect(renderProgramBrief(DETAIL, { timeoutMs: 100 })).rejects.toThrow(
      "chromium launch failed",
    );
    await expect(renderProgramBrief(DETAIL, { timeoutMs: 100 })).resolves.toEqual(
      Buffer.from([0x25, 0x50, 0x44, 0x46]),
    );
    expect(launch).toHaveBeenCalledTimes(2);

    await disposeRenderer();
  });

  test("passes the configured timeout through Puppeteer launch, HTML load, and PDF render", async () => {
    const { browser, page } = buildBrowser(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    const launch = vi.fn().mockResolvedValue(browser);
    vi.doMock("puppeteer", () => ({ default: { launch } }));

    const { disposeRenderer, renderProgramBrief } = await import("./render.js");

    await renderProgramBrief(DETAIL, { timeoutMs: 123 });

    expect(launch).toHaveBeenCalledWith(expect.objectContaining({ timeout: 123 }));
    expect(page.setContent).toHaveBeenCalledWith(expect.any(String), {
      waitUntil: "networkidle0",
      timeout: 123,
    });
    expect(page.pdf).toHaveBeenCalledWith(expect.objectContaining({ timeout: 123 }));

    await disposeRenderer();
  });

  test("rejects with PdfRenderTimeoutError when the full render exceeds its deadline", async () => {
    const browser = {
      connected: true,
      newPage: vi.fn(() => new Promise<Page>(() => {})),
      close: vi.fn(async () => {}),
    } as unknown as Browser;
    const launch = vi.fn().mockResolvedValue(browser);
    vi.doMock("puppeteer", () => ({ default: { launch } }));

    const { PdfRenderTimeoutError, renderProgramBrief } = await import("./render.js");

    await expect(renderProgramBrief(DETAIL, { timeoutMs: 5 })).rejects.toBeInstanceOf(
      PdfRenderTimeoutError,
    );
  });
});

function buildBrowser(pdfBytes: Uint8Array): {
  browser: Browser;
  page: Pick<Page, "setContent" | "pdf" | "close">;
} {
  const page = {
    setContent: vi.fn(async () => {}),
    pdf: vi.fn(async () => pdfBytes),
    close: vi.fn(async () => {}),
  };
  const browser = {
    connected: true,
    newPage: vi.fn(async () => page),
    close: vi.fn(async () => {}),
  };
  return { browser: browser as unknown as Browser, page };
}
