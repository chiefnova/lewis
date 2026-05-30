import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import type { PublicDbContextVars } from "../../middleware/public-context.js";
import { publicConditionsRoutes } from "./routes.js";

// In-process tests against a stub pg client. The public DB transaction
// lifecycle is covered by ../../middleware/public-context.test.ts and the
// anonymous-RLS published/unpublished contract is covered by
// packages/db/test/rls/0018_directory_public_search.sql; this file exercises
// the route handlers' SQL composition, response shape, headers, and Zod
// parsing by injecting a fake `dbClient` into c.var.

type QueryResult<T> = { rows: T[] };

interface FakeQueryHandler {
  match: (sql: string, params: unknown[]) => boolean;
  result: QueryResult<unknown>;
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
    c.set("requestId", "req-public-conditions-test");
    // Cast: the real type is PoolClient; the route only calls .query().
    c.set("dbClient", client as unknown as PublicDbContextVars["dbClient"]);
    await next();
  });
  app.route("/public/conditions", publicConditionsRoutes);
  return app;
}

function normalizeSql(value: unknown): string {
  return String(value).replace(/\s+/g, " ").trim();
}

const SEED_LIVE_ROW = {
  id: "00000000-0000-0000-0000-000000000001",
  slug: "diabetic-peripheral-neuropathy",
  name: "Diabetic peripheral neuropathy",
  state: "live",
  summary: "Nerve damage caused by chronic high blood sugar.",
  icd10_codes: ["E11.40", "E11.42"],
};

const SEED_COMING_SOON_ROW = {
  id: "00000000-0000-0000-0000-000000000002",
  slug: "ptsd",
  name: "Post-traumatic stress disorder (PTSD)",
  state: "coming_soon",
  summary: "A psychiatric condition that may develop after trauma.",
  icd10_codes: ["F43.10"],
};

const SEED_NOT_OFFERED_ROW = {
  id: "00000000-0000-0000-0000-000000000003",
  slug: "als",
  name: "Amyotrophic Lateral Sclerosis (ALS)",
  state: "not_offered",
  summary: "A progressive neurodegenerative disease.",
  icd10_codes: ["G12.21"],
};

const WST_057_PROGRAM_ROW = {
  slug: "wst-057",
  name: "WST-057®",
  drug: "WST-057",
  phase: "Phase 2",
  form: "Topical",
};

describe("GET /public/conditions (list)", () => {
  it("returns the catalog with program counts and sets a 60s cache header", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("from conditions c") && sql.includes("program_count"),
        result: {
          rows: [
            { ...SEED_LIVE_ROW, program_count: 1 },
            { ...SEED_COMING_SOON_ROW, program_count: 0 },
            { ...SEED_NOT_OFFERED_ROW, program_count: 0 },
          ],
        },
      },
    ]);

    const res = await buildApp(client).request("/public/conditions");
    expect(res.status).toBe(200);

    const listSql = normalizeSql(client.query.mock.calls[0]?.[0]);
    expect(listSql).toContain("from conditions c");
    expect(listSql).toContain("where c.published = true");
    expect(listSql).toContain("and p.directory_published = true");
    expect(listSql).toContain("order by c.name asc");
    expect(res.headers.get("cache-control")).toBe("public, max-age=60, stale-while-revalidate=600");

    const body = (await res.json()) as {
      conditions: Array<{
        slug: string;
        state: string;
        icd10Codes: string[];
        programCount: number;
        href: string;
      }>;
    };

    expect(body.conditions).toHaveLength(3);
    expect(body.conditions[0]).toMatchObject({
      slug: "diabetic-peripheral-neuropathy",
      state: "live",
      icd10Codes: ["E11.40", "E11.42"],
      programCount: 1,
      href: "/conditions/diabetic-peripheral-neuropathy",
    });
    expect(body.conditions[1]).toMatchObject({ state: "coming_soon", programCount: 0 });
    expect(body.conditions[2]).toMatchObject({ state: "not_offered", programCount: 0 });
  });

  it("renders an empty list correctly", async () => {
    const client = fakeClient([
      { match: (sql) => sql.includes("from conditions c"), result: { rows: [] } },
    ]);
    const res = await buildApp(client).request("/public/conditions");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ conditions: [] });
  });

  it("coerces null icd10_codes from the DB into an empty array", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("from conditions c"),
        result: {
          rows: [{ ...SEED_LIVE_ROW, icd10_codes: null, program_count: 1 }],
        },
      },
    ]);
    const res = await buildApp(client).request("/public/conditions");
    const body = (await res.json()) as { conditions: Array<{ icd10Codes: string[] }> };
    expect(body.conditions[0]?.icd10Codes).toEqual([]);
  });
});

describe("GET /public/conditions/:slug (detail)", () => {
  it("returns the live condition with linked WST-057 + 5min cache header", async () => {
    const client = fakeClient([
      {
        match: (sql, params) =>
          sql.includes("from conditions c") &&
          sql.includes("where c.slug = $1") &&
          params[0] === "diabetic-peripheral-neuropathy",
        result: { rows: [SEED_LIVE_ROW] },
      },
      {
        match: (sql) => sql.includes("from programs p") && sql.includes("program_conditions pc"),
        result: { rows: [WST_057_PROGRAM_ROW] },
      },
    ]);

    const res = await buildApp(client).request("/public/conditions/diabetic-peripheral-neuropathy");
    expect(res.status).toBe(200);

    const detailSql = normalizeSql(client.query.mock.calls[0]?.[0]);
    const programsSql = normalizeSql(client.query.mock.calls[1]?.[0]);
    expect(detailSql).toContain("where c.slug = $1 and c.published = true");
    expect(client.query.mock.calls[0]?.[1]).toEqual(["diabetic-peripheral-neuropathy"]);
    expect(programsSql).toContain("from programs p join program_conditions pc");
    expect(programsSql).toContain("and p.directory_published = true");
    expect(programsSql).toContain("order by p.name asc");
    expect(programsSql).not.toContain("join tenants");
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=300, stale-while-revalidate=3600",
    );

    const body = (await res.json()) as {
      slug: string;
      state: string;
      icd10Codes: string[];
      linkedPrograms: Array<{
        slug: string;
        name: string;
        drug: string | null;
        phase: string | null;
        form: string | null;
        manufacturer: string | null;
      }>;
      programCount: number;
    };

    expect(body).toMatchObject({
      slug: "diabetic-peripheral-neuropathy",
      state: "live",
      icd10Codes: ["E11.40", "E11.42"],
      programCount: 1,
    });
    expect(body.linkedPrograms).toHaveLength(1);
    expect(body.linkedPrograms[0]).toEqual({
      slug: "wst-057",
      name: "WST-057®",
      drug: "WST-057",
      phase: "Phase 2",
      form: "Topical",
      manufacturer: null,
    });
  });

  it("coming_soon condition returns empty linkedPrograms", async () => {
    const client = fakeClient([
      {
        match: (sql, params) => sql.includes("from conditions c") && params[0] === "ptsd",
        result: { rows: [SEED_COMING_SOON_ROW] },
      },
      {
        match: (sql) => sql.includes("from programs p"),
        result: { rows: [] },
      },
    ]);
    const res = await buildApp(client).request("/public/conditions/ptsd");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { state: string; linkedPrograms: unknown[] };
    expect(body.state).toBe("coming_soon");
    expect(body.linkedPrograms).toEqual([]);
  });

  it("not_offered condition returns empty linkedPrograms", async () => {
    const client = fakeClient([
      {
        match: (sql, params) => sql.includes("from conditions c") && params[0] === "als",
        result: { rows: [SEED_NOT_OFFERED_ROW] },
      },
      {
        match: (sql) => sql.includes("from programs p"),
        result: { rows: [] },
      },
    ]);
    const res = await buildApp(client).request("/public/conditions/als");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { state: string; programCount: number };
    expect(body.state).toBe("not_offered");
    expect(body.programCount).toBe(0);
  });

  it("returns the canonical not_found envelope for an unknown slug", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("from conditions c"),
        result: { rows: [] },
      },
    ]);
    const res = await buildApp(client).request("/public/conditions/no-such-slug");
    expect(res.status).toBe(404);
    const body = (await res.json()) as {
      error?: { code?: string; message?: string };
    };
    expect(body.error?.code).toBe("not_found");
  });

  it("filters out linked-program rows whose slug is null (defense against directory_slug=null)", async () => {
    const client = fakeClient([
      {
        match: (sql, params) =>
          sql.includes("from conditions c") && params[0] === "diabetic-peripheral-neuropathy",
        result: { rows: [SEED_LIVE_ROW] },
      },
      {
        match: (sql) => sql.includes("from programs p"),
        result: {
          rows: [
            // first row has null slug — would be a publish-flag inconsistency
            // (directory_published true but directory_slug missing). Belt-and-
            // suspenders: routes.ts filters them out before serializing.
            { slug: null, name: "X", drug: null, phase: null, form: null, manufacturer: null },
            WST_057_PROGRAM_ROW,
          ],
        },
      },
    ]);
    const res = await buildApp(client).request("/public/conditions/diabetic-peripheral-neuropathy");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { linkedPrograms: Array<{ slug: string }> };
    expect(body.linkedPrograms.map((p) => p.slug)).toEqual(["wst-057"]);
  });
});

describe("GET /public/conditions/:slug — slug validation (no DB call)", () => {
  // These exercise zValidator before the handler ever touches the DB.
  // The fake client throws on any query, so a 200 here would mean validation
  // let an invalid slug through.
  function appWithExplodingClient() {
    const client = {
      query: vi.fn(() => {
        throw new Error("validation should have rejected before SQL");
      }),
    };
    return buildApp(client);
  }

  it("rejects uppercase slugs with the canonical validation_error envelope", async () => {
    const res = await appWithExplodingClient().request("/public/conditions/Diabetic-PN");
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error?: { code?: string; message?: string };
      requestId?: string;
    };
    expect(body).toMatchObject({
      error: {
        code: "validation_error",
        message: "Invalid condition slug.",
      },
      requestId: "req-public-conditions-test",
    });
  });

  it("rejects slugs with underscores", async () => {
    const res = await appWithExplodingClient().request("/public/conditions/diabetic_pn");
    expect(res.status).toBe(400);
  });

  it("rejects slugs with spaces (URL-encoded)", async () => {
    const res = await appWithExplodingClient().request("/public/conditions/diabetic%20pn");
    expect(res.status).toBe(400);
  });

  it("rejects oversize slugs", async () => {
    const oversize = "a".repeat(121);
    const res = await appWithExplodingClient().request(`/public/conditions/${oversize}`);
    expect(res.status).toBe(400);
  });
});
