import { BoardPathParams, CursorPageQuery } from "@lewis/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AuthenticatedDbVariables } from "../../middleware/db-context.js";
import { getAnnualReport, listProtocolReviews } from "./service.js";

export const boardRoutes = new Hono<{ Variables: AuthenticatedDbVariables }>();

boardRoutes.get(
  "/:boardId/protocol-reviews",
  zValidator("param", BoardPathParams),
  zValidator("query", CursorPageQuery),
  async (c) => {
    const { boardId } = c.req.valid("param");
    const page = c.req.valid("query");
    const response = await listProtocolReviews(c.get("dbClient"), c.get("appContext"), {
      boardId,
      ...page,
    });
    return c.json(response);
  },
);

boardRoutes.get("/:boardId/annual-report", zValidator("param", BoardPathParams), async (c) => {
  const { boardId } = c.req.valid("param");
  const response = await getAnnualReport(c.get("dbClient"), c.get("appContext"), { boardId });
  return c.json(response);
});
