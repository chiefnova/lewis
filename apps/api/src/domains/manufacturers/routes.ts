import { CursorPageQuery, ManufacturerPathParams } from "@lewis/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AuthenticatedDbVariables } from "../../middleware/db-context.js";
import { listAdverseEvents, listEtcs, listPrograms } from "./service.js";

export const manufacturerRoutes = new Hono<{ Variables: AuthenticatedDbVariables }>();

manufacturerRoutes.get(
  "/:manufacturerId/programs",
  zValidator("param", ManufacturerPathParams),
  zValidator("query", CursorPageQuery),
  async (c) => {
    const { manufacturerId } = c.req.valid("param");
    const page = c.req.valid("query");
    const response = await listPrograms(c.get("dbClient"), c.get("appContext"), {
      manufacturerId,
      ...page,
    });
    return c.json(response);
  },
);

manufacturerRoutes.get(
  "/:manufacturerId/etcs",
  zValidator("param", ManufacturerPathParams),
  zValidator("query", CursorPageQuery),
  async (c) => {
    const { manufacturerId } = c.req.valid("param");
    const page = c.req.valid("query");
    const response = await listEtcs(c.get("dbClient"), c.get("appContext"), {
      manufacturerId,
      ...page,
    });
    return c.json(response);
  },
);

manufacturerRoutes.get(
  "/:manufacturerId/adverse-events",
  zValidator("param", ManufacturerPathParams),
  zValidator("query", CursorPageQuery),
  async (c) => {
    const { manufacturerId } = c.req.valid("param");
    const page = c.req.valid("query");
    const response = await listAdverseEvents(c.get("dbClient"), c.get("appContext"), {
      manufacturerId,
      ...page,
    });
    return c.json(response);
  },
);
