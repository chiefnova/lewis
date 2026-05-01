import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import type { PublicDbContextVars } from "../../middleware/public-context.js";

// Mock the heavy Puppeteer renderer at the package boundary so the test
// suite stays in-process and sub-second. The real Puppeteer round-trip is
// covered by the manual API smoke at verification time + the brief.pdf
// snapshot test in @lewis/pdf which doesn't require Chromium.
const renderProgramBriefMock = vi.fn(async () =>
  Buffer.concat([
    Buffer.from("%PDF-1.7\n", "utf8"),
    Buffer.alloc(6 * 1024, 0x20), // 6KB of padding so the size-floor assertion passes
    Buffer.from("\n%%EOF\n", "utf8"),
  ]),
);

vi.mock("@lewis/pdf/render", () => ({
  renderProgramBrief: renderProgramBriefMock,
  disposeRenderer: vi.fn(async () => {}),
}));

// The route module imports @lewis/pdf/render eagerly, so the vi.mock above
// must register before the route module loads. Dynamic-import the routes
// AFTER the mock is in place.
const { publicProgramsRoutes } = await import("./routes.js");

// In-process tests against a stub pg client. The public DB transaction
// lifecycle is covered by ../../middleware/public-context.test.ts and the
// anonymous-RLS published/unpublished contract is covered by
// packages/db/test/rls/0018_directory_public_search.sql; this file exercises
// the route handlers' SQL composition, response shape, headers, and Zod
// parsing by injecting a fake `dbClient` into c.var.

interface FakeQueryHandler {
  match: (sql: string, params: unknown[]) => boolean;
  result: { rows: unknown[] };
}

function fakeClient(handlers: FakeQueryHandler[]) {
  return {
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      for (const h of handlers) {
        if (h.match(sql, params ?? [])) return h.result;
      }
      throw new Error(`Unmocked SQL: ${sql.trim().slice(0, 80)}…`);
    }),
  };
}

function buildApp(client: { query: ReturnType<typeof vi.fn> }) {
  const app = new Hono<{ Variables: PublicDbContextVars }>();
  app.use("*", async (c, next) => {
    c.set("requestId", "req-public-programs-test");
    c.set("dbClient", client as unknown as PublicDbContextVars["dbClient"]);
    await next();
  });
  app.route("/public/programs", publicProgramsRoutes);
  return app;
}

function normalizeSql(value: unknown): string {
  return String(value).replace(/\s+/g, " ").trim();
}

const WST_057_LIST_ROW = {
  slug: "wst-057",
  name: "WST-057®",
  drug: "WST-057",
  indication: "for diabetic peripheral neuropathy",
  treatment_form: "Topical",
  phase: "Phase 2",
  etc_count: 1,
};

const WST_057_DETAIL_ROW = {
  id: "b0000000-0000-0000-0000-000000000001",
  slug: "wst-057",
  name: "WST-057®",
  drug: "WST-057",
  indication: "for diabetic peripheral neuropathy",
  treatment_form: "Topical",
  phase: "Phase 2",
  patient_facing_description:
    "Adults with confirmed diabetic peripheral neuropathy who have evaluated standard-of-care options.",
  directory_summary: "Investigational topical for painful diabetic PN.",
  clinical_trials_gov_id: "NCT04742205",
  ind_number: "152367",
  published_paper_citation: "Lancet eBioMedicine 2023;90:104525.",
  published_paper_doi: "10.1016/j.ebiom.2023.104525",
  etrb_approval_date: "2025-09-15",
  etrb_board_name: "Big Sky ETC ETRB",
  mechanism_summary: "Two-paragraph mechanism prose.",
  key_safety_findings: "Application-site erythema and pruritus.",
  cost_low_cents: "240000",
  cost_high_cents: "380000",
  cost_disclaimer: "Treatment cost is set by the ETC.",
  etc_count: 1,
};

describe("GET /public/programs (list)", () => {
  it("returns directory_published programs with etc_count and the 60s cache header", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("from programs p") && sql.includes("etc_count"),
        result: { rows: [WST_057_LIST_ROW] },
      },
    ]);

    const res = await buildApp(client).request("/public/programs");
    expect(res.status).toBe(200);

    const sql = normalizeSql(client.query.mock.calls[0]?.[0]);
    expect(sql).toContain("where p.directory_published = true");
    expect(sql).toContain("and p.directory_slug is not null");
    // etc_count comes from the SECURITY DEFINER helper added in migration
    // 0019 because tenant_relationships is intentionally not in the
    // directory_anonymous public-read policy set.
    expect(sql).toContain("app.directory_program_etc_count(p.id)");
    expect(sql).toContain("order by p.name asc");
    expect(res.headers.get("cache-control")).toBe("public, max-age=60, stale-while-revalidate=600");

    const body = (await res.json()) as {
      total: number;
      programs: Array<{
        slug: string;
        name: string;
        indication: string;
        manufacturer: string | null;
        form: string | null;
        phase: string | null;
        etcCount: number;
        available: boolean;
      }>;
    };

    expect(body.total).toBe(1);
    expect(body.programs).toHaveLength(1);
    expect(body.programs[0]).toEqual({
      slug: "wst-057",
      name: "WST-057®",
      indication: "for diabetic peripheral neuropathy",
      // manufacturer stays null until /v1/public/etcs / sponsor display name
      // exposure ships in a later slice.
      manufacturer: null,
      form: "Topical",
      phase: "Phase 2",
      etcCount: 1,
      available: true,
    });
  });

  it("renders an empty list correctly", async () => {
    const client = fakeClient([
      { match: (sql) => sql.includes("from programs p"), result: { rows: [] } },
    ]);
    const res = await buildApp(client).request("/public/programs");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ programs: [], total: 0 });
  });

  it("normalizes unknown form / phase values to null", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("from programs p"),
        result: {
          rows: [{ ...WST_057_LIST_ROW, treatment_form: "WeirdForm", phase: "Phase 4" }],
        },
      },
    ]);
    const res = await buildApp(client).request("/public/programs");
    const body = (await res.json()) as {
      programs: Array<{ form: string | null; phase: string | null }>;
    };
    expect(body.programs[0]).toMatchObject({ form: null, phase: null });
  });

  it("maps DB-internal lowercase form/phase codes to display strings", async () => {
    // The programs table stores treatment_form/phase as lowercase /
    // underscored codes (the regulated app side runs workflow logic off
    // those codes). The public API contract uses display strings, so the
    // route translates "topical" → "Topical", "phase_2" → "Phase 2".
    const client = fakeClient([
      {
        match: (sql) => sql.includes("from programs p"),
        result: {
          rows: [{ ...WST_057_LIST_ROW, treatment_form: "topical", phase: "phase_2" }],
        },
      },
    ]);
    const res = await buildApp(client).request("/public/programs");
    const body = (await res.json()) as {
      programs: Array<{ form: string | null; phase: string | null }>;
    };
    expect(body.programs[0]).toMatchObject({ form: "Topical", phase: "Phase 2" });
  });
});

describe("GET /public/programs/:slug (detail)", () => {
  it("returns full WST-057 detail with clinical evidence + 5min cache header", async () => {
    const client = fakeClient([
      {
        match: (sql, params) =>
          sql.includes("from programs p") &&
          sql.includes("where p.directory_slug = $1") &&
          params[0] === "wst-057",
        result: { rows: [WST_057_DETAIL_ROW] },
      },
    ]);

    const res = await buildApp(client).request("/public/programs/wst-057");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=300, stale-while-revalidate=3600",
    );

    const body = (await res.json()) as {
      slug: string;
      clinicalTrialsGovId: string | null;
      indNumber: string | null;
      publishedPaper: { citation: string; doi: string } | null;
      etrb: { approvalDate: string; boardName: string } | null;
      mechanismSummary: string | null;
      keySafetyFindings: string | null;
      costRange: { low: number; high: number; currency: string; disclaimer: string | null } | null;
    };

    expect(body.slug).toBe("wst-057");
    expect(body.clinicalTrialsGovId).toBe("NCT04742205");
    expect(body.indNumber).toBe("152367");
    expect(body.publishedPaper).toEqual({
      citation: "Lancet eBioMedicine 2023;90:104525.",
      doi: "10.1016/j.ebiom.2023.104525",
    });
    expect(body.etrb).toEqual({
      approvalDate: "2025-09-15",
      boardName: "Big Sky ETC ETRB",
    });
    expect(body.mechanismSummary).toContain("Two-paragraph mechanism");
    expect(body.keySafetyFindings).toContain("erythema");
    expect(body.costRange).toEqual({
      low: 240000,
      high: 380000,
      currency: "USD",
      disclaimer: "Treatment cost is set by the ETC.",
    });
  });

  it("graceful degradation: null evidence + cost fields all serialize as null", async () => {
    const client = fakeClient([
      {
        match: (sql, params) => sql.includes("from programs p") && params[0] === "wst-057",
        result: {
          rows: [
            {
              ...WST_057_DETAIL_ROW,
              clinical_trials_gov_id: null,
              ind_number: null,
              published_paper_citation: null,
              published_paper_doi: null,
              etrb_approval_date: null,
              etrb_board_name: null,
              mechanism_summary: null,
              key_safety_findings: null,
              cost_low_cents: null,
              cost_high_cents: null,
              cost_disclaimer: null,
            },
          ],
        },
      },
    ]);
    const res = await buildApp(client).request("/public/programs/wst-057");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      clinicalTrialsGovId: null;
      publishedPaper: null;
      etrb: null;
      mechanismSummary: null;
      keySafetyFindings: null;
      costRange: null;
    };
    expect(body.clinicalTrialsGovId).toBeNull();
    expect(body.publishedPaper).toBeNull();
    expect(body.etrb).toBeNull();
    expect(body.mechanismSummary).toBeNull();
    expect(body.keySafetyFindings).toBeNull();
    expect(body.costRange).toBeNull();
  });

  it("returns 404 with the canonical envelope for an unknown slug", async () => {
    const client = fakeClient([
      { match: (sql) => sql.includes("from programs p"), result: { rows: [] } },
    ]);
    const res = await buildApp(client).request("/public/programs/no-such-program");
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe("not_found");
  });

  it("rejects malformed slugs before any DB query (validation_error)", async () => {
    const client = {
      query: vi.fn(() => {
        throw new Error("validation should have rejected before SQL");
      }),
    };
    const app = buildApp(client);
    const res = await app.request("/public/programs/Diabetic-PN");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe("validation_error");
  });
});

describe("GET /public/programs/:slug/brief.pdf", () => {
  it("returns a real-looking PDF body with attachment headers + 1h cache", async () => {
    const client = fakeClient([
      {
        match: (sql, params) => sql.includes("from programs p") && params[0] === "wst-057",
        result: { rows: [WST_057_DETAIL_ROW] },
      },
    ]);
    renderProgramBriefMock.mockClear();

    const res = await buildApp(client).request("/public/programs/wst-057/brief.pdf");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=3600, stale-while-revalidate=86400",
    );
    const disposition = res.headers.get("content-disposition") ?? "";
    expect(disposition).toMatch(/^attachment; filename="lewis-brief-wst-057-\d{8}\.pdf"$/);

    const buffer = Buffer.from(await res.arrayBuffer());
    expect(buffer.length).toBeGreaterThan(5_000);
    expect(buffer.subarray(0, 5).toString("utf8")).toBe("%PDF-");

    expect(renderProgramBriefMock).toHaveBeenCalledTimes(1);
    const detailArg = renderProgramBriefMock.mock.calls.at(0)?.at(0) as
      | {
          slug?: string;
          clinicalTrialsGovId?: string;
          etrb?: { approvalDate?: string; boardName?: string };
        }
      | undefined;
    expect(detailArg).toMatchObject({
      slug: "wst-057",
      clinicalTrialsGovId: "NCT04742205",
      etrb: { approvalDate: "2025-09-15", boardName: "Big Sky ETC ETRB" },
    });
  });

  it("returns 404 (no Puppeteer call) for an unknown slug", async () => {
    const client = fakeClient([
      { match: (sql) => sql.includes("from programs p"), result: { rows: [] } },
    ]);
    renderProgramBriefMock.mockClear();

    const res = await buildApp(client).request("/public/programs/nonexistent/brief.pdf");
    expect(res.status).toBe(404);
    expect(renderProgramBriefMock).not.toHaveBeenCalled();
  });

  it("returns service_unavail when the PDF renderer fails", async () => {
    const client = fakeClient([
      {
        match: (sql, params) => sql.includes("from programs p") && params[0] === "wst-057",
        result: { rows: [WST_057_DETAIL_ROW] },
      },
    ]);
    renderProgramBriefMock.mockRejectedValueOnce(new Error("chromium timeout"));

    const res = await buildApp(client).request("/public/programs/wst-057/brief.pdf");
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error?: { code?: string; message?: string } };
    expect(body.error).toMatchObject({
      code: "service_unavail",
      message: "Program brief is temporarily unavailable.",
    });
  });

  it("rejects malformed slug before Puppeteer or DB", async () => {
    renderProgramBriefMock.mockClear();
    const client = {
      query: vi.fn(() => {
        throw new Error("validation should have rejected before SQL");
      }),
    };
    const res = await buildApp(client).request("/public/programs/INVALID/brief.pdf");
    expect(res.status).toBe(400);
    expect(renderProgramBriefMock).not.toHaveBeenCalled();
  });
});
