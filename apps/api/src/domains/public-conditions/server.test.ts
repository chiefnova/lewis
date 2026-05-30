import { beforeEach, describe, expect, it, vi } from "vitest";

const redisMock = vi.hoisted(() => {
  const counts = new Map<string, number>();
  const ttls = new Map<string, number>();
  const client = {
    incr: vi.fn(async (key: string) => {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    }),
    expire: vi.fn(async (key: string, ttl: number) => {
      ttls.set(key, ttl);
      return 1;
    }),
    ttl: vi.fn(async (key: string) => ttls.get(key) ?? 60),
  };

  return {
    client,
    reset() {
      counts.clear();
      ttls.clear();
      client.incr.mockClear();
      client.expire.mockClear();
      client.ttl.mockClear();
    },
  };
});

const dbMock = vi.hoisted(() => {
  const client = {
    query: vi.fn(async (sql: string) => {
      const normalized = sql.replace(/\s+/g, " ").trim();
      if (
        normalized === "begin" ||
        normalized === "commit" ||
        normalized === "rollback" ||
        normalized.startsWith("select set_config(")
      ) {
        return { rows: [] };
      }
      if (normalized.includes("from conditions c") && normalized.includes("program_count")) {
        return {
          rows: [
            {
              slug: "diabetic-peripheral-neuropathy",
              name: "Diabetic peripheral neuropathy",
              state: "live",
              summary: "Nerve damage caused by chronic high blood sugar.",
              icd10_codes: ["E11.40", "E11.42"],
              program_count: 1,
            },
          ],
        };
      }
      throw new Error(`Unmocked SQL: ${normalized}`);
    }),
    release: vi.fn(),
  };
  const connect = vi.fn(async () => client);

  return {
    connect,
    client,
    reset() {
      client.query.mockClear();
      client.release.mockClear();
      connect.mockClear();
    },
  };
});

vi.mock("@lewis/db", () => ({
  checkDatabaseReady: vi.fn(async () => ({ ok: true })),
  getDatabasePool: () => ({ connect: dbMock.connect }),
}));

vi.mock("../../redis.js", () => ({
  checkRedisReady: vi.fn(async () => ({ ok: true })),
  getRedisClient: () => redisMock.client,
}));

import { app } from "../../server.js";

describe("mounted /v1/public/conditions route", () => {
  beforeEach(() => {
    dbMock.reset();
    redisMock.reset();
  });

  it("enforces the dedicated public_conditions rate-limit bucket", async () => {
    const headers = { "x-forwarded-for": "203.0.113.10" };

    for (let i = 0; i < 60; i += 1) {
      const res = await app.request("/v1/public/conditions", { headers });
      expect(res.status).toBe(200);
    }

    const limited = await app.request("/v1/public/conditions", { headers });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("60");

    const body = (await limited.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe("rate_limited");
    expect(redisMock.client.incr).toHaveBeenCalledWith("rl:public_conditions:203.0.113.10");
  });
});
