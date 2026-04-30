import { Hono, type Context } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  connect: vi.fn(),
}));

vi.mock("@lewis/db", () => ({
  getDatabasePool: () => ({ connect: dbMock.connect }),
}));

import { withPublicDbContext, type PublicDbContextVars } from "./public-context.js";

function makeClient() {
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    release: vi.fn(),
  };
}

function buildApp(
  handler: (c: Context<{ Variables: PublicDbContextVars }>) => Response | Promise<Response>,
) {
  const app = new Hono<{ Variables: PublicDbContextVars }>();
  app.use("*", async (c, next) => {
    c.set("requestId", "req-public-context-test");
    await next();
  });
  app.use("*", withPublicDbContext);
  app.get("/", handler);
  app.onError((_error, c) => c.text("Internal Server Error", 500));
  return app;
}

describe("withPublicDbContext", () => {
  beforeEach(() => {
    dbMock.connect.mockReset();
  });

  it("sets the anonymous role and commits 2xx responses", async () => {
    const client = makeClient();
    dbMock.connect.mockResolvedValue(client);

    const res = await buildApp((c) => c.json({ ok: true })).request("/");

    expect(res.status).toBe(200);
    expect(client.query).toHaveBeenCalledWith("begin");
    expect(client.query).toHaveBeenCalledWith("select set_config('app.role', $1, true)", [
      "directory_anonymous",
    ]);
    expect(client.query).toHaveBeenCalledWith("select set_config('app.request_id', $1, true)", [
      "req-public-context-test",
    ]);
    expect(client.query).toHaveBeenCalledWith("commit");
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("rolls back non-2xx responses", async () => {
    const client = makeClient();
    dbMock.connect.mockResolvedValue(client);

    const res = await buildApp((c) => c.json({ error: "nope" }, 404)).request("/");

    expect(res.status).toBe(404);
    expect(client.query).toHaveBeenCalledWith("rollback");
    expect(client.query).not.toHaveBeenCalledWith("commit");
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("rolls back and releases when the handler throws", async () => {
    const client = makeClient();
    dbMock.connect.mockResolvedValue(client);

    const res = await buildApp(() => {
      throw new Error("boom");
    }).request("/");

    expect(res.status).toBe(500);
    expect(client.query).toHaveBeenCalledWith("rollback");
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
