import {
  ConditionSlug,
  PublicConditionDetail,
  PublicConditionListResponse,
  type ConditionState,
  type PublicConditionDetail as PublicConditionDetailType,
  type PublicConditionLinkedProgram,
  type PublicConditionSummary,
} from "@lewis/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { respondWithError } from "../../middleware/errors.js";
import type { PublicDbContextVars } from "../../middleware/public-context.js";
import { logger } from "../../logger.js";

/**
 * GET /v1/public/conditions
 * GET /v1/public/conditions/:slug
 *
 * Anonymous catalog endpoints for the directory's primary patient browse
 * surface (per directoryprd.md § 14). All reads ride the directory_anonymous
 * RLS posture set up by withPublicDbContext: anonymous role + published flag
 * gating, default-deny if either is missing.
 *
 * The list endpoint returns every published condition (catalog cap is ~9 at
 * MVP-0; pagination is dead weight here and is omitted intentionally). The
 * detail endpoint hydrates the requested condition plus its directory_published
 * linked programs in two scoped queries.
 *
 * Cache-Control:
 *   list   → max-age=60, swr=600   (state changes are rare; quick propagation)
 *   detail → max-age=300, swr=3600 (heavier payload; even rarer changes)
 */

const ConditionSlugParam = z.object({ slug: ConditionSlug });

type ConditionListRow = {
  slug: string;
  name: string;
  state: ConditionState;
  summary: string | null;
  icd10_codes: string[] | null;
  program_count: number;
};

type ConditionDetailRow = {
  id: string;
  slug: string;
  name: string;
  state: ConditionState;
  summary: string | null;
  icd10_codes: string[] | null;
};

type LinkedProgramRow = {
  slug: string;
  name: string;
  drug: string | null;
  phase: string | null;
  form: string | null;
};

export const publicConditionsRoutes = new Hono<{ Variables: PublicDbContextVars }>();

publicConditionsRoutes.get("/", async (c) => {
  const db = c.var.dbClient;
  const requestId = c.var.requestId ?? "unknown";

  // One pass: pull every published condition with a count of its
  // directory_published linked programs. The subselect runs once per
  // condition row but the catalog is tiny — a single index scan on
  // program_conditions_condition_idx per row.
  const sql = `
    select c.slug,
           c.name,
           c.state,
           c.summary,
           c.icd10_codes,
           coalesce((
             select count(*)::int
             from program_conditions pc
             join programs p on p.id = pc.program_id
             where pc.condition_id = c.id
               and p.directory_published = true
           ), 0) as program_count
    from conditions c
    where c.published = true
    order by c.name asc
  `;
  const result = await db.query<ConditionListRow>(sql);

  const conditions: PublicConditionSummary[] = result.rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    state: row.state,
    summary: row.summary,
    icd10Codes: row.icd10_codes ?? [],
    programCount: row.program_count,
    href: `/conditions/${row.slug}`,
  }));

  logger.info(
    {
      requestId,
      route: "/v1/public/conditions",
      count: conditions.length,
    },
    "public conditions list executed",
  );

  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=600");
  return c.json(PublicConditionListResponse.parse({ conditions }));
});

publicConditionsRoutes.get(
  "/:slug",
  zValidator("param", ConditionSlugParam, (result, c) => {
    if (!result.success) {
      return respondWithError(
        c,
        "validation_error",
        "Invalid condition slug.",
        result.error.flatten(),
      );
    }
  }),
  async (c) => {
    const db = c.var.dbClient;
    const requestId = c.var.requestId ?? "unknown";
    const { slug } = c.req.valid("param");

    const condResult = await db.query<ConditionDetailRow>(
      `
        select c.id::text as id,
               c.slug,
               c.name,
               c.state,
               c.summary,
               c.icd10_codes
        from conditions c
        where c.slug = $1
          and c.published = true
      `,
      [slug],
    );

    const cond = condResult.rows[0];
    if (!cond) {
      return respondWithError(c, "not_found", "Condition not found.");
    }

    const programsResult = await db.query<LinkedProgramRow>(
      `
        select p.directory_slug as slug,
               p.name,
               p.drug,
               p.phase,
               p.treatment_form as form
        from programs p
        join program_conditions pc on pc.program_id = p.id
        where pc.condition_id = $1::uuid
          and p.directory_published = true
        order by p.name asc
      `,
      [cond.id],
    );

    const linkedPrograms: PublicConditionLinkedProgram[] = programsResult.rows
      .filter((row) => row.slug !== null)
      .map((row) => ({
        slug: row.slug,
        name: row.name,
        drug: row.drug,
        phase: row.phase,
        form: row.form,
        manufacturer: null,
      }));

    const detail: PublicConditionDetailType = {
      slug: cond.slug,
      name: cond.name,
      state: cond.state,
      summary: cond.summary,
      icd10Codes: cond.icd10_codes ?? [],
      programCount: linkedPrograms.length,
      href: `/conditions/${cond.slug}`,
      linkedPrograms,
    };

    logger.info(
      {
        requestId,
        route: "/v1/public/conditions/:slug",
        slug: cond.slug,
        state: cond.state,
        linkedProgramCount: linkedPrograms.length,
      },
      "public condition detail executed",
    );

    c.header("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
    return c.json(PublicConditionDetail.parse(detail));
  },
);
