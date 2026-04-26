import { CursorPageQuery, EtcPathParams } from "@lewis/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AuthenticatedDbVariables } from "../../middleware/db-context.js";
import { getCompliance, getDashboard, listDrugInventoryLots, listMessages } from "./service.js";

export const etcRoutes = new Hono<{ Variables: AuthenticatedDbVariables }>();

etcRoutes.get("/:etcId/dashboard", zValidator("param", EtcPathParams), async (c) => {
  const { etcId } = c.req.valid("param");
  const response = await getDashboard(c.get("dbClient"), c.get("appContext"), { etcId });
  return c.json(response);
});

etcRoutes.get("/:etcId/compliance", zValidator("param", EtcPathParams), async (c) => {
  const { etcId } = c.req.valid("param");
  const response = await getCompliance(c.get("dbClient"), c.get("appContext"), { etcId });
  return c.json(response);
});

etcRoutes.get(
  "/:etcId/messages",
  zValidator("param", EtcPathParams),
  zValidator("query", CursorPageQuery),
  async (c) => {
    const { etcId } = c.req.valid("param");
    const page = c.req.valid("query");
    const response = await listMessages(c.get("dbClient"), c.get("appContext"), {
      etcId,
      ...page,
    });
    return c.json(response);
  },
);

etcRoutes.get(
  "/:etcId/drug-inventory/lots",
  zValidator("param", EtcPathParams),
  zValidator("query", CursorPageQuery),
  async (c) => {
    const { etcId } = c.req.valid("param");
    const page = c.req.valid("query");
    const response = await listDrugInventoryLots(c.get("dbClient"), c.get("appContext"), {
      etcId,
      ...page,
    });
    return c.json(response);
  },
);
