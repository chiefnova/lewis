import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicDbContextVars } from "../../middleware/public-context.js";

const enqueueMock = vi.fn(async () => ({ jobId: "job-test-001" }));

vi.mock("./enqueue.js", () => ({
  enqueueMarketingConfirmation: enqueueMock,
  __resetNotificationsQueueForTesting: vi.fn(),
}));

const { publicMarketingRoutes } = await import("./routes.js");

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
    c.set("requestId", "req-public-marketing-test");
    c.set("dbClient", client as unknown as PublicDbContextVars["dbClient"]);
    await next();
  });
  app.route("/public/marketing-subscriptions", publicMarketingRoutes);
  return app;
}

beforeEach(() => {
  enqueueMock.mockClear();
});
afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /v1/public/marketing-subscriptions", () => {
  it("happy path: was_new=true → enqueues a confirmation job", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("app.directory_marketing_subscribe"),
        result: {
          rows: [
            {
              confirmation_token: "11111111-1111-1111-1111-111111111111",
              unsubscribe_token: "22222222-2222-2222-2222-222222222222",
              was_new: true,
            },
          ],
        },
      },
    ]);
    const app = buildApp(client);
    const res = await app.request("/public/marketing-subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "vitest",
        "X-Forwarded-For": "203.0.113.42",
      },
      body: JSON.stringify({ email: "subscriber@example.com", source: "announcement_strip" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; message: string };
    expect(body.ok).toBe(true);
    expect(body.message).toMatch(/confirmation/i);

    expect(enqueueMock).toHaveBeenCalledTimes(1);
    expect(enqueueMock).toHaveBeenCalledWith({
      emailLower: "subscriber@example.com",
      confirmationToken: "11111111-1111-1111-1111-111111111111",
      unsubscribeToken: "22222222-2222-2222-2222-222222222222",
    });
  });

  it("idempotent path: was_new=false → does NOT enqueue (no double email)", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("app.directory_marketing_subscribe"),
        result: {
          rows: [
            {
              confirmation_token: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
              unsubscribe_token: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
              was_new: false,
            },
          ],
        },
      },
    ]);
    const app = buildApp(client);
    const res = await app.request("/public/marketing-subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "tester@example.com", source: "homepage_beginning" }),
    });
    expect(res.status).toBe(200);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("returns 400 on malformed email", async () => {
    const client = fakeClient([{ match: () => true, result: { rows: [] } }]);
    const app = buildApp(client);
    const res = await app.request("/public/marketing-subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", source: "browse_bottom" }),
    });
    expect(res.status).toBe(400);
    expect(client.query).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid source", async () => {
    const client = fakeClient([{ match: () => true, result: { rows: [] } }]);
    const app = buildApp(client);
    const res = await app.request("/public/marketing-subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ok@example.com", source: "footer_signup" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 200 even when enqueue fails (row persisted; ops re-enqueues)", async () => {
    enqueueMock.mockRejectedValueOnce(new Error("Redis is down"));
    const client = fakeClient([
      {
        match: (sql) => sql.includes("app.directory_marketing_subscribe"),
        result: {
          rows: [
            {
              confirmation_token: "cccccccc-cccc-cccc-cccc-cccccccccccc",
              unsubscribe_token: "dddddddd-dddd-dddd-dddd-dddddddddddd",
              was_new: true,
            },
          ],
        },
      },
    ]);
    const app = buildApp(client);
    const res = await app.request("/public/marketing-subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "queue-down@example.com", source: "announcement_strip" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});

describe("GET /confirm", () => {
  it("returns { confirmed: true } when helper succeeds", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("app.directory_marketing_confirm"),
        result: { rows: [{ directory_marketing_confirm: true }] },
      },
    ]);
    const app = buildApp(client);
    const res = await app.request(
      "/public/marketing-subscriptions/confirm?token=11111111-1111-1111-1111-111111111111",
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { confirmed: boolean };
    expect(body.confirmed).toBe(true);
  });

  it("returns { confirmed: false } when helper rejects (unknown token)", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("app.directory_marketing_confirm"),
        result: { rows: [{ directory_marketing_confirm: false }] },
      },
    ]);
    const app = buildApp(client);
    const res = await app.request(
      "/public/marketing-subscriptions/confirm?token=00000000-0000-0000-0000-000000000000",
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { confirmed: boolean };
    expect(body.confirmed).toBe(false);
  });

  it("returns 400 on malformed token (not a UUID)", async () => {
    const client = fakeClient([{ match: () => true, result: { rows: [] } }]);
    const app = buildApp(client);
    const res = await app.request("/public/marketing-subscriptions/confirm?token=not-a-uuid");
    expect(res.status).toBe(400);
  });
});

describe("GET /unsubscribe", () => {
  it("returns { unsubscribed: true } when helper succeeds", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("app.directory_marketing_unsubscribe"),
        result: { rows: [{ directory_marketing_unsubscribe: true }] },
      },
    ]);
    const app = buildApp(client);
    const res = await app.request(
      "/public/marketing-subscriptions/unsubscribe?token=22222222-2222-2222-2222-222222222222",
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { unsubscribed: boolean };
    expect(body.unsubscribed).toBe(true);
  });

  it("returns 400 on missing token", async () => {
    const client = fakeClient([{ match: () => true, result: { rows: [] } }]);
    const app = buildApp(client);
    const res = await app.request("/public/marketing-subscriptions/unsubscribe");
    expect(res.status).toBe(400);
  });
});
