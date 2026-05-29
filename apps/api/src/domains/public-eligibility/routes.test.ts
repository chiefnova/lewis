import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PublicDbContextVars } from "../../middleware/public-context.js";
import { publicEligibilityRoutes } from "./routes.js";

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
    c.set("requestId", "req-public-eligibility-test");
    c.set("dbClient", client as unknown as PublicDbContextVars["dbClient"]);
    await next();
  });
  app.route("/public/eligibility", publicEligibilityRoutes);
  return app;
}

const TOKEN = "11111111-1111-4111-8111-111111111111";

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /v1/public/eligibility/start", () => {
  it("returns sessionToken + expiresAt for a published program", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("app.directory_eligibility_start"),
        result: {
          rows: [
            {
              token: TOKEN,
              expires_at: new Date("2026-06-25T00:00:00.000Z"),
            },
          ],
        },
      },
    ]);
    const res = await buildApp(client).request("/public/eligibility/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programSlug: "wst-057" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { sessionToken: string; programSlug: string };
    expect(body.sessionToken).toBe(TOKEN);
    expect(body.programSlug).toBe("wst-057");
  });

  it("404s on unknown / unpublished program (no discovery oracle)", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("app.directory_eligibility_start"),
        result: { rows: [] }, // helper returns 0 rows
      },
    ]);
    const res = await buildApp(client).request("/public/eligibility/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programSlug: "never-published" }),
    });
    expect(res.status).toBe(404);
  });

  it("400s on invalid slug shape", async () => {
    const client = fakeClient([{ match: () => true, result: { rows: [] } }]);
    const res = await buildApp(client).request("/public/eligibility/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programSlug: "INVALID UPPERCASE" }),
    });
    expect(res.status).toBe(400);
    expect(client.query).not.toHaveBeenCalled();
  });
});

describe("POST /v1/public/eligibility/sessions/:token/answers", () => {
  it("accepts a valid answer", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("app.directory_eligibility_append_answer"),
        result: { rows: [{ directory_eligibility_append_answer: true }] },
      },
    ]);
    const res = await buildApp(client).request(`/public/eligibility/sessions/${TOKEN}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: "age_18_plus", value: "yes" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { accepted: boolean };
    expect(body.accepted).toBe(true);
  });

  it("404s on expired / unknown session", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("app.directory_eligibility_append_answer"),
        result: { rows: [{ directory_eligibility_append_answer: false }] },
      },
    ]);
    const res = await buildApp(client).request(`/public/eligibility/sessions/${TOKEN}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: "age_18_plus", value: "yes" }),
    });
    expect(res.status).toBe(404);
  });

  it("400s on malformed token in path", async () => {
    const client = fakeClient([{ match: () => true, result: { rows: [] } }]);
    const res = await buildApp(client).request("/public/eligibility/sessions/not-a-uuid/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: "age_18_plus", value: "yes" }),
    });
    expect(res.status).toBe(400);
    expect(client.query).not.toHaveBeenCalled();
  });
});

describe("POST /v1/public/eligibility/sessions/:token/complete", () => {
  it("happy path passed: returns result=passed + failedCriterion=null", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("app.directory_eligibility_complete"),
        result: { rows: [{ directory_eligibility_complete: true }] },
      },
    ]);
    const res = await buildApp(client).request(`/public/eligibility/sessions/${TOKEN}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passed: true, failedCriterion: null }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result: string;
      failedCriterion: string | null;
    };
    expect(body.result).toBe("passed");
    expect(body.failedCriterion).toBeNull();
  });

  it("happy path failed: returns failedCriterion text for § 17.4 UI", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("app.directory_eligibility_complete"),
        result: { rows: [{ directory_eligibility_complete: true }] },
      },
    ]);
    const REASON =
      "The program requires a confirmed diabetic peripheral neuropathy diagnosis from a treating physician.";
    const res = await buildApp(client).request(`/public/eligibility/sessions/${TOKEN}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passed: false, failedCriterion: REASON }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result: string;
      failedCriterion: string | null;
    };
    expect(body.result).toBe("failed");
    expect(body.failedCriterion).toBe(REASON);
  });

  it("400s on passed=true with a failedCriterion (cross-field)", async () => {
    const client = fakeClient([{ match: () => true, result: { rows: [] } }]);
    const res = await buildApp(client).request(`/public/eligibility/sessions/${TOKEN}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passed: true, failedCriterion: "should not be set" }),
    });
    expect(res.status).toBe(400);
    expect(client.query).not.toHaveBeenCalled();
  });

  it("400s on passed=false with no failedCriterion (cross-field)", async () => {
    const client = fakeClient([{ match: () => true, result: { rows: [] } }]);
    const res = await buildApp(client).request(`/public/eligibility/sessions/${TOKEN}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passed: false, failedCriterion: null }),
    });
    expect(res.status).toBe(400);
    expect(client.query).not.toHaveBeenCalled();
  });

  it("404s on expired / already-completed session", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("app.directory_eligibility_complete"),
        result: { rows: [{ directory_eligibility_complete: false }] },
      },
    ]);
    const res = await buildApp(client).request(`/public/eligibility/sessions/${TOKEN}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passed: true, failedCriterion: null }),
    });
    expect(res.status).toBe(404);
  });
});

describe("GET /v1/public/eligibility/sessions/:token", () => {
  it("returns the persisted state for a live session", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("app.directory_eligibility_resume"),
        result: {
          rows: [
            {
              program_slug: "wst-057",
              answers: { age_18_plus: "yes" },
              status: "in_progress",
              failed_criterion: null,
              expires_at: new Date("2026-06-25T00:00:00.000Z"),
            },
          ],
        },
      },
    ]);
    const res = await buildApp(client).request(`/public/eligibility/sessions/${TOKEN}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      programSlug: string;
      answers: Record<string, string>;
      status: string;
    };
    expect(body.programSlug).toBe("wst-057");
    expect(body.answers).toEqual({ age_18_plus: "yes" });
    expect(body.status).toBe("in_progress");
  });

  it("404s on expired / unknown token (single state, no oracle)", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("app.directory_eligibility_resume"),
        result: { rows: [] },
      },
    ]);
    const res = await buildApp(client).request(`/public/eligibility/sessions/${TOKEN}`);
    expect(res.status).toBe(404);
  });

  it("handles jsonb-as-string from pg", async () => {
    const client = fakeClient([
      {
        match: (sql) => sql.includes("app.directory_eligibility_resume"),
        result: {
          rows: [
            {
              program_slug: "wst-057",
              answers: '{"age_18_plus":"yes"}', // pg JSON-string form
              status: "in_progress",
              failed_criterion: null,
              expires_at: new Date("2026-06-25T00:00:00.000Z"),
            },
          ],
        },
      },
    ]);
    const res = await buildApp(client).request(`/public/eligibility/sessions/${TOKEN}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { answers: Record<string, string> };
    expect(body.answers).toEqual({ age_18_plus: "yes" });
  });
});
