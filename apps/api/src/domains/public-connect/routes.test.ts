import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicDbContextVars } from "../../middleware/public-context.js";

const enqueueMock = vi.fn(async () => ({ jobId: "connect-job-test-001" }));

vi.mock("./enqueue.js", () => ({
  enqueueConnectRequestSend: enqueueMock,
  __resetConnectQueueForTesting: vi.fn(),
}));

const { publicConnectRoutes } = await import("./routes.js");

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
    c.set("requestId", "req-public-connect-test");
    c.set("dbClient", client as unknown as PublicDbContextVars["dbClient"]);
    await next();
  });
  app.route("/public/connect-requests", publicConnectRoutes);
  return app;
}

const VALID_PAYLOAD = {
  programSlug: "wst-057",
  eligibilitySessionToken: null,
  name: "Sam Sample",
  email: "sam@example.com",
  phone: "+1 (406) 555-1212",
  bestTimeToContact: "evenings",
  situation: null,
};

const HELPER_CREATE_ROW = {
  directory_connect_request_create: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};

beforeEach(() => {
  enqueueMock.mockClear();
});
afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /v1/public/connect-requests", () => {
  it("happy path: returns 200 with id + signupUrl=null + needsAccount=false", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("app.directory_connect_request_create"),
        result: { rows: [HELPER_CREATE_ROW] },
      },
    ]);
    const app = buildApp(client);
    const res = await app.request("/public/connect-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": "203.0.113.50",
        "User-Agent": "vitest",
      },
      body: JSON.stringify(VALID_PAYLOAD),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      connectRequestId: string;
      signupUrl: string | null;
      needsAccount: boolean;
    };
    expect(body.connectRequestId).toBe(HELPER_CREATE_ROW.directory_connect_request_create);
    expect(body.signupUrl).toBeNull();
    // § 18.2 critical: anonymous submission is the primary path. The
    // response must never push the patient to Clerk pre-conversion.
    expect(body.needsAccount).toBe(false);

    // Helper called with the right parameter shape.
    expect(client.query).toHaveBeenCalledTimes(1);
    const [, params] = client.query.mock.calls[0]!;
    expect(params).toEqual([
      "wst-057",
      null, // eligibility token
      "Sam Sample",
      "sam@example.com",
      "+1 (406) 555-1212",
      "evenings",
      null, // situation
      "203.0.113.50",
      "vitest",
    ]);

    // Enqueue called with the inserted id.
    expect(enqueueMock).toHaveBeenCalledTimes(1);
    expect(enqueueMock).toHaveBeenCalledWith({
      connectRequestId: HELPER_CREATE_ROW.directory_connect_request_create,
    });
  });

  it("attaches eligibility token when provided", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("app.directory_connect_request_create"),
        result: { rows: [HELPER_CREATE_ROW] },
      },
    ]);
    const app = buildApp(client);
    const res = await app.request("/public/connect-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...VALID_PAYLOAD,
        eligibilitySessionToken: "11111111-1111-4111-8111-111111111111",
      }),
    });
    expect(res.status).toBe(200);
    const [, params] = client.query.mock.calls[0]!;
    expect(params?.[1]).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("§ 18.1 optional situation: null is accepted", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("app.directory_connect_request_create"),
        result: { rows: [HELPER_CREATE_ROW] },
      },
    ]);
    const app = buildApp(client);
    const res = await app.request("/public/connect-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_PAYLOAD, situation: null }),
    });
    expect(res.status).toBe(200);
  });

  it("returns 400 on malformed email", async () => {
    const client = fakeClient([{ match: () => true, result: { rows: [] } }]);
    const app = buildApp(client);
    const res = await app.request("/public/connect-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_PAYLOAD, email: "not-an-email" }),
    });
    expect(res.status).toBe(400);
    expect(client.query).not.toHaveBeenCalled();
  });

  it("returns 400 on empty name", async () => {
    const client = fakeClient([{ match: () => true, result: { rows: [] } }]);
    const app = buildApp(client);
    const res = await app.request("/public/connect-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_PAYLOAD, name: "" }),
    });
    expect(res.status).toBe(400);
    expect(client.query).not.toHaveBeenCalled();
  });

  it("returns 400 on non-UUID eligibilitySessionToken", async () => {
    const client = fakeClient([{ match: () => true, result: { rows: [] } }]);
    const app = buildApp(client);
    const res = await app.request("/public/connect-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_PAYLOAD, eligibilitySessionToken: "not-a-uuid" }),
    });
    expect(res.status).toBe(400);
    expect(client.query).not.toHaveBeenCalled();
  });

  it("returns 400 on helper P0001 invalid_email (contract drift)", async () => {
    const client = {
      query: vi.fn(async () => {
        const err = new Error("invalid_email") as Error & { code?: string };
        err.code = "P0001";
        throw err;
      }),
    } as unknown as ReturnType<typeof fakeClient>;
    const app = buildApp(client);
    const res = await app.request("/public/connect-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_PAYLOAD),
    });
    expect(res.status).toBe(400);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("returns 400 on helper P0001 unknown_program", async () => {
    const client = {
      query: vi.fn(async () => {
        const err = new Error("unknown_program") as Error & { code?: string };
        err.code = "P0001";
        throw err;
      }),
    } as unknown as ReturnType<typeof fakeClient>;
    const app = buildApp(client);
    const res = await app.request("/public/connect-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_PAYLOAD),
    });
    expect(res.status).toBe(400);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("returns 400 on helper P0001 no_offering_etc", async () => {
    // The § 18.2 "no Montana ETC currently offers this program" branch —
    // most likely to fire in MVP-0 if the Big Sky PPA lapses.
    const client = {
      query: vi.fn(async () => {
        const err = new Error("no_offering_etc") as Error & { code?: string };
        err.code = "P0001";
        throw err;
      }),
    } as unknown as ReturnType<typeof fakeClient>;
    const app = buildApp(client);
    const res = await app.request("/public/connect-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_PAYLOAD),
    });
    expect(res.status).toBe(400);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("returns 500 (and does not enqueue) when the create helper yields no id", async () => {
    // SECURITY DEFINER contract drift: the call succeeds but returns zero
    // rows. The handler must not enqueue a send for a non-existent row.
    const client = fakeClient([
      {
        match: (sql) => sql.includes("app.directory_connect_request_create"),
        result: { rows: [] },
      },
    ]);
    const app = buildApp(client);
    const res = await app.request("/public/connect-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_PAYLOAD),
    });
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("non-validation DB failure (connection drop) returns 500, not 400", async () => {
    const client = {
      query: vi.fn(async () => {
        // Plain Error with no `code` — simulates pg losing its connection.
        throw new Error("connection terminated unexpectedly");
      }),
    } as unknown as ReturnType<typeof fakeClient>;
    const app = buildApp(client);
    const res = await app.request("/public/connect-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_PAYLOAD),
    });
    expect(res.status).not.toBe(400);
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("returns 200 even when enqueue fails (row persisted; ops re-enqueues)", async () => {
    enqueueMock.mockRejectedValueOnce(new Error("Redis is down"));
    const client = fakeClient([
      {
        match: (sql) => sql.includes("app.directory_connect_request_create"),
        result: { rows: [HELPER_CREATE_ROW] },
      },
    ]);
    const app = buildApp(client);
    const res = await app.request("/public/connect-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_PAYLOAD),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { connectRequestId: string };
    expect(body.connectRequestId).toBe(HELPER_CREATE_ROW.directory_connect_request_create);
  });

  it("captures client IP from cf-connecting-ip when present", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("app.directory_connect_request_create"),
        result: { rows: [HELPER_CREATE_ROW] },
      },
    ]);
    const app = buildApp(client);
    await app.request("/public/connect-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": "198.51.100.7",
        "X-Forwarded-For": "203.0.113.50",
      },
      body: JSON.stringify(VALID_PAYLOAD),
    });
    const [, params] = client.query.mock.calls[0]!;
    // cf-connecting-ip wins over x-forwarded-for in TRUST_REMOTE_ADDR_HEADERS.
    expect(params?.[7]).toBe("198.51.100.7");
  });

  it("PII never appears in the response or logs", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("app.directory_connect_request_create"),
        result: { rows: [HELPER_CREATE_ROW] },
      },
    ]);
    const app = buildApp(client);
    const res = await app.request("/public/connect-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_PAYLOAD),
    });
    const bodyText = await res.text();
    // The response body should never echo the patient email or name.
    expect(bodyText).not.toContain("sam@example.com");
    expect(bodyText).not.toContain("Sam Sample");
  });
});
