import { CursorPageQuery, SponsorPathParams } from "@corridor/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AuthenticatedDbVariables } from "../../middleware/db-context.js";
import { listAdverseEvents, listEtcs, listPrograms } from "./service.js";

export const sponsorRoutes = new Hono<{ Variables: AuthenticatedDbVariables }>();

sponsorRoutes.get(
  "/:sponsorId/programs",
  zValidator("param", SponsorPathParams),
  zValidator("query", CursorPageQuery),
  async (c) => {
    const { sponsorId } = c.req.valid("param");
    const page = c.req.valid("query");
    const response = await listPrograms(c.get("dbClient"), c.get("appContext"), {
      sponsorId,
      ...page,
    });
    return c.json(response);
  },
);

sponsorRoutes.get(
  "/:sponsorId/etcs",
  zValidator("param", SponsorPathParams),
  zValidator("query", CursorPageQuery),
  async (c) => {
    const { sponsorId } = c.req.valid("param");
    const page = c.req.valid("query");
    const response = await listEtcs(c.get("dbClient"), c.get("appContext"), {
      sponsorId,
      ...page,
    });
    return c.json(response);
  },
);

sponsorRoutes.get(
  "/:sponsorId/adverse-events",
  zValidator("param", SponsorPathParams),
  zValidator("query", CursorPageQuery),
  async (c) => {
    const { sponsorId } = c.req.valid("param");
    const page = c.req.valid("query");
    const response = await listAdverseEvents(c.get("dbClient"), c.get("appContext"), {
      sponsorId,
      ...page,
    });
    return c.json(response);
  },
);
