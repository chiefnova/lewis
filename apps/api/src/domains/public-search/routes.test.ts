import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import type { PublicDbContextVars } from "../../middleware/public-context.js";
import { buildPrefixTsquery, publicSearchRoutes } from "./routes.js";

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

describe("buildPrefixTsquery", () => {
  it("converts a single token into a prefix-mode tsquery", () => {
    expect(buildPrefixTsquery("neur")).toBe("neur:*");
    expect(buildPrefixTsquery("diabetic")).toBe("diabetic:*");
  });

  it("ANDs multiple tokens with each as a prefix", () => {
    expect(buildPrefixTsquery("peripheral neuropathy")).toBe("peripheral:* & neuropathy:*");
  });

  it("lowercases input so case doesn't break stemming downstream", () => {
    expect(buildPrefixTsquery("ALS")).toBe("als:*");
    expect(buildPrefixTsquery("PTSD")).toBe("ptsd:*");
  });

  it("strips punctuation and collapses whitespace", () => {
    expect(buildPrefixTsquery("post-traumatic stress")).toBe("post:* & traumatic:* & stress:*");
    expect(buildPrefixTsquery("  diabetic   neuropathy  ")).toBe("diabetic:* & neuropathy:*");
  });

  it('returns null for empty / whitespace-only input so to_tsquery("") is never called', () => {
    expect(buildPrefixTsquery("")).toBeNull();
    expect(buildPrefixTsquery("   ")).toBeNull();
    expect(buildPrefixTsquery("!!!")).toBeNull();
  });
});
