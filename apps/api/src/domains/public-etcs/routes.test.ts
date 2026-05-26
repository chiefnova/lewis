import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import type { PublicDbContextVars } from "../../middleware/public-context.js";
import { publicEtcsRoutes } from "./routes.js";

/**
 * In-process tests against a fake pg client. Anonymous-RLS published/
 * unpublished gating is asserted in
 *   packages/db/test/rls/0020_etcs_directory_extended.sql
 *   packages/db/test/rls/0018_directory_public_search.sql
 * These tests exercise SQL composition, response shape, headers, and Zod
 * parsing.
 */

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
    c.set("requestId", "req-public-etcs-test");
    c.set("dbClient", client as unknown as PublicDbContextVars["dbClient"]);
    await next();
  });
  app.route("/public/etcs", publicEtcsRoutes);
  return app;
}

const BIG_SKY_LIST_ROW = {
  slug: "big-sky",
  name: "Big Sky Experimental Treatment Center",
  directory_city: "Bozeman",
  license_number: "ETC-2025-001",
  accepting_new_patients: true,
  directory_lat: 45.6889,
  directory_lng: -111.0379,
  program_count: 1,
};

const BIG_SKY_DETAIL_ROW = {
  id: "c0000000-0000-0000-0000-000000000001",
  slug: "big-sky",
  name: "Big Sky Experimental Treatment Center",
  directory_city: "Bozeman",
  license_number: "ETC-2025-001",
  accepting_new_patients: true,
  directory_lat: 45.6889,
  directory_lng: -111.0379,
  directory_summary: "Outpatient specialty clinic licensed under Montana SB 535.",
  directory_address_lines: ["1240 N Rouse Avenue, Suite 200", "Bozeman, MT 59715"],
  directory_phone: "+1 (406) 555-0142",
  directory_hours: "M-F 8am-5pm",
  medical_director_name: "Helena Marsh, MD",
  medical_director_credentials: "MD, FACP",
  medical_director_clinical_email: "medical.director@bigskyetc.com",
  medical_director_clinical_phone: null,
};

const WST_OFFERED_ROW = {
  slug: "wst-057",
  name: "WST-057",
  drug: "WST-057",
  indication: "peripheral neuropathy",
  treatment_form: "topical",
  phase: "phase_2",
};

describe("GET /v1/public/etcs (list)", () => {
  it("returns the published Big Sky ETC with lat/lng + programCount", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("from etcs e") && sql.includes("directory_published = true"),
        result: { rows: [BIG_SKY_LIST_ROW] },
      },
    ]);
    const app = buildApp(client);
    const res = await app.request("/public/etcs");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { etcs: unknown[] };
    expect(body.etcs).toHaveLength(1);
    expect(body.etcs[0]).toEqual({
      slug: "big-sky",
      name: "Big Sky Experimental Treatment Center",
      city: "Bozeman",
      state: "MT",
      licenseNumber: "ETC-2025-001",
      acceptingPatients: true,
      lat: 45.6889,
      lng: -111.0379,
      programCount: 1,
    });
  });

  it("sets Cache-Control max-age=60 with SWR=600", async () => {
    const client = fakeClient([{ match: () => true, result: { rows: [] } }]);
    const app = buildApp(client);
    const res = await app.request("/public/etcs");
    expect(res.headers.get("cache-control")).toContain("max-age=60");
    expect(res.headers.get("cache-control")).toContain("stale-while-revalidate=600");
  });

  it("returns empty list when no published ETCs", async () => {
    const client = fakeClient([{ match: () => true, result: { rows: [] } }]);
    const app = buildApp(client);
    const res = await app.request("/public/etcs");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { etcs: unknown[] };
    expect(body.etcs).toEqual([]);
  });
});

describe("GET /v1/public/etcs/:slug (detail)", () => {
  it("returns full Big Sky detail with medical director clinical contact", async () => {
    const client = fakeClient([
      {
        match: (sql, params) =>
          sql.includes("from etcs e") &&
          sql.includes("e.directory_slug = $1") &&
          params[0] === "big-sky",
        result: { rows: [BIG_SKY_DETAIL_ROW] },
      },
      {
        match: (sql) => sql.includes("app.directory_etc_program_offerings"),
        result: { rows: [WST_OFFERED_ROW] },
      },
    ]);
    const app = buildApp(client);
    const res = await app.request("/public/etcs/big-sky");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.slug).toBe("big-sky");
    expect(body.licenseNumber).toBe("ETC-2025-001");
    expect(body.medicalDirector).toEqual({
      name: "Helena Marsh, MD",
      credentials: "MD, FACP",
      clinicalEmail: "medical.director@bigskyetc.com",
      clinicalPhone: null,
    });
    expect(body.address).toEqual(["1240 N Rouse Avenue, Suite 200", "Bozeman, MT 59715"]);
    expect(body.programs).toEqual([
      {
        slug: "wst-057",
        name: "WST-057",
        drug: "WST-057",
        indication: "peripheral neuropathy",
        form: "topical",
        phase: "phase_2",
      },
    ]);
    expect(body.publicDocuments).toEqual([]);
  });

  it("returns 404 when slug is unknown / unpublished", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("from etcs e") && sql.includes("e.directory_slug = $1"),
        result: { rows: [] },
      },
    ]);
    const app = buildApp(client);
    const res = await app.request("/public/etcs/nonexistent");
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("not_found");
  });

  it("returns 400 on invalid slug shape", async () => {
    const client = fakeClient([{ match: () => true, result: { rows: [] } }]);
    const app = buildApp(client);
    const res = await app.request("/public/etcs/INVALID%20SLUG");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("validation_error");
  });

  it("sets Cache-Control max-age=300 with SWR=3600", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("from etcs e") && sql.includes("e.directory_slug = $1"),
        result: { rows: [BIG_SKY_DETAIL_ROW] },
      },
      {
        match: (sql) => sql.includes("app.directory_etc_program_offerings"),
        result: { rows: [WST_OFFERED_ROW] },
      },
    ]);
    const app = buildApp(client);
    const res = await app.request("/public/etcs/big-sky");
    expect(res.headers.get("cache-control")).toContain("max-age=300");
    expect(res.headers.get("cache-control")).toContain("stale-while-revalidate=3600");
  });

  it("falls back to {city}, MT when directory_address_lines is null", async () => {
    const client = fakeClient([
      {
        match: (sql, params) =>
          sql.includes("from etcs e") &&
          sql.includes("e.directory_slug = $1") &&
          params[0] === "big-sky",
        result: {
          rows: [{ ...BIG_SKY_DETAIL_ROW, directory_address_lines: null }],
        },
      },
      {
        match: (sql) => sql.includes("app.directory_etc_program_offerings"),
        result: { rows: [] },
      },
    ]);
    const app = buildApp(client);
    const res = await app.request("/public/etcs/big-sky");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { address: string[] };
    expect(body.address).toEqual(["Bozeman, MT"]);
  });
});
