import { CursorPageQuery } from "@corridor/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AuthenticatedDbVariables } from "../../middleware/db-context.js";
import { getMe, listMyDocuments, listMyMessages } from "./service.js";

export const patientRoutes = new Hono<{ Variables: AuthenticatedDbVariables }>();

patientRoutes.get("/me", async (c) => {
  const response = await getMe(c.get("dbClient"), c.get("appContext"));
  return c.json(response);
});

patientRoutes.get("/me/messages", zValidator("query", CursorPageQuery), async (c) => {
  const page = c.req.valid("query");
  const response = await listMyMessages(c.get("dbClient"), c.get("appContext"), page);
  return c.json(response);
});

patientRoutes.get("/me/documents", zValidator("query", CursorPageQuery), async (c) => {
  const page = c.req.valid("query");
  const response = await listMyDocuments(c.get("dbClient"), c.get("appContext"), page);
  return c.json(response);
});
