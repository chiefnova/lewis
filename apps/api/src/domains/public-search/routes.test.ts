import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import type { PublicDbContextVars } from "../../middleware/public-context.js";
import { publicSearchRoutes } from "./routes.js";

function buildValidationApp() {
  const app = new Hono<{ Variables: PublicDbContextVars }>();
  app.use("*", async (c, next) => {
    c.set("requestId", "req-public-search-test");
    await next();
  });
  app.route("/public/search", publicSearchRoutes);
  return app;
}

describe("publicSearchRoutes validation", () => {
  it("returns the canonical ErrorResponse envelope for an empty query", async () => {
    const res = await buildValidationApp().request("/public/search?q=");
    const body = (await res.json()) as {
      error?: { code?: string; message?: string };
      requestId?: string;
      success?: boolean;
    };

    expect(res.status).toBe(400);
    expect(body).toMatchObject({
      error: {
        code: "validation_error",
        message: "Invalid search query.",
      },
      requestId: "req-public-search-test",
    });
    expect(body.success).toBeUndefined();
  });
});
