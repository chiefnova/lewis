import { SearchQueryParams, type SearchResponse } from "@lewis/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AuthenticatedDbVariables } from "../../middleware/db-context.js";

export const searchRoutes = new Hono<{ Variables: AuthenticatedDbVariables }>();

searchRoutes.get("/", zValidator("query", SearchQueryParams), (c) => {
  const { q } = c.req.valid("query");
  const response: SearchResponse = {
    query: q,
    items: [],
    nextCursor: null,
    hasMore: false,
  };
  return c.json(response);
});
