import {
  PublicSearchQueryParams,
  type PublicSearchConditionHit,
  type PublicSearchEtcHit,
  type PublicSearchResponse,
  type PublicSearchTreatmentHit,
  type ConditionState,
} from "@lewis/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { respondWithError } from "../../middleware/errors.js";
import type { PublicDbContextVars } from "../../middleware/public-context.js";
import { logger } from "../../logger.js";

/**
 * GET /v1/public/search?q=<query>&type=<treatment|condition|etc>
 *
 * Anonymous, condition-first directory search. The handler:
 *   1. Runs a single FTS query against search_index_documents using
 *      websearch_to_tsquery + ts_rank_cd. Results are ranked across all
 *      types simultaneously (a query like "neuropathy" co-ranks the four
 *      PN conditions and WST-057 in one pass).
 *   2. Filters out off-topic results via MIN_RANK floor (§ 13.5: an "ALS"
 *      query must NEVER promote WST-057 as a primary match).
 *   3. Buckets the ranked rows into sections by source_table. Section
 *      ORDER in the response is fixed: conditions → treatments → etcs.
 *      The client renders sections in shipped order; ordering invariants
 *      are enforced server-side, not by frontend convention.
 *   4. Hydrates each row with directory-routable metadata (slug, href,
 *      state) by joining back to the source tables. The hydration step
 *      goes through the same RLS-gated client; an unpublished source row
 *      will simply not appear (the trigger removes its index row on
 *      unpublish, but defense-in-depth via the public-read policies on
 *      programs/etcs/conditions catches any drift).
 *
 * Caching: Cache-Control with 60s max-age + 600s stale-while-revalidate.
 * Harmless for direct hits today (Vercel edge respects it; Cloudflare
 * deferred per the plan's "Out-of-scope confirmations" section).
 */

const MIN_RANK = 0.05;
const SECTION_LIMIT = 10;
const TOTAL_LIMIT = 60; // SECTION_LIMIT × 3 (conditions, treatments, etcs) ×2 headroom

// At MVP-0 the entire public catalog is ~11 rows (9 conditions + 1 program +
// 1 ETC), so a global LIMIT 60 after ranking can never starve a section. As
// the catalog grows past ~30 rows per section the global cap could let one
// table dominate the top-N before we bucket. When that happens, switch to a
// window-function shape:
//   row_number() OVER (PARTITION BY source_table ORDER BY rank DESC) AS rn
// + a per-section filter (rn <= SECTION_LIMIT) to enforce the per-section
// cap inside SQL rather than in JS post-processing. Tracked as a Phase 2/3
// follow-up — not worth the SQL complexity at current scale.

type SearchIndexRow = {
  source_table: string;
  source_id: string;
  title: string;
  redacted_snippet: string | null;
  rank: number;
};

type ConditionRow = {
  id: string;
  slug: string;
  name: string;
  state: ConditionState;
  program_count: number;
};

type ProgramRow = {
  id: string;
  slug: string;
  name: string;
  drug: string | null;
  manufacturer: string | null;
  available: boolean;
};

type EtcRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
};

export const publicSearchRoutes = new Hono<{ Variables: PublicDbContextVars }>();

const validatePublicSearchQuery = zValidator("query", PublicSearchQueryParams, (result, c) => {
  if (!result.success) {
    return respondWithError(c, "validation_error", "Invalid search query.", result.error.flatten());
  }
});

publicSearchRoutes.get("/", validatePublicSearchQuery, async (c) => {
  const { q, type } = c.req.valid("query");
  const db = c.var.dbClient;
  const requestId = c.var.requestId ?? "unknown";

  // Optional `type` filter narrows the query to one section. Useful for the
  // overlay's per-section "see more" affordance in a future slice; today
  // both surfaces request all sections.
  const typeToTable: Record<NonNullable<typeof type>, string> = {
    condition: "conditions",
    treatment: "programs",
    etc: "etcs",
  };

  // 1. FTS pass — single query, all sections, ranked. Off-topic floor
  //    applied here so the MIN_RANK threshold filters out drug-name-only
  //    matches that happen to share a stem with the query (e.g. an ALS
  //    query matching nothing in WST-057's vector returns 0 rank → drops).
  const ftsSql = `
    select source_table, source_id::text as source_id, title, redacted_snippet,
           ts_rank_cd(search_vector, websearch_to_tsquery('english', $1)) as rank
    from search_index_documents
    where visibility_classification = 'public'
      and search_vector @@ websearch_to_tsquery('english', $1)
      and ($2::text is null or source_table = $2::text)
    order by rank desc, title asc
    limit ${TOTAL_LIMIT}
  `;
  const sourceTableFilter = type ? typeToTable[type] : null;
  const ftsResult = await db.query<SearchIndexRow>(ftsSql, [q, sourceTableFilter]);

  // Apply the MIN_RANK floor in JS so we can include the threshold in
  // observability output if we ever want to emit it.
  const ranked = ftsResult.rows.filter((r) => r.rank > MIN_RANK);

  // 2. Bucket into sections, capping each at SECTION_LIMIT.
  const conditionIds: string[] = [];
  const programIds: string[] = [];
  const etcIds: string[] = [];

  for (const row of ranked) {
    if (row.source_table === "conditions" && conditionIds.length < SECTION_LIMIT) {
      conditionIds.push(row.source_id);
    } else if (row.source_table === "programs" && programIds.length < SECTION_LIMIT) {
      programIds.push(row.source_id);
    } else if (row.source_table === "etcs" && etcIds.length < SECTION_LIMIT) {
      etcIds.push(row.source_id);
    }
  }

  // 3. Hydrate each section with display metadata. Three small lookups,
  //    each RLS-gated. The directory_anonymous policy + published flag
  //    means an out-of-sync index row (e.g. a program just unpublished
  //    but the trigger hasn't fired yet) gracefully drops out instead of
  //    rendering a half-broken card.
  const conditions = conditionIds.length > 0 ? await hydrateConditions(db, conditionIds) : [];
  const treatments = programIds.length > 0 ? await hydrateTreatments(db, programIds) : [];
  const etcs = etcIds.length > 0 ? await hydrateEtcs(db, etcIds) : [];

  // Preserve rank order from the FTS pass. The hydration queries can
  // return rows in any order, so we re-sort by the index of the source_id
  // in the original ranked list.
  const conditionRank = new Map(conditionIds.map((id, i) => [id, i]));
  const programRank = new Map(programIds.map((id, i) => [id, i]));
  const etcRank = new Map(etcIds.map((id, i) => [id, i]));

  const sections = {
    conditions: conditions
      .sort((a, b) => (conditionRank.get(a.id) ?? 0) - (conditionRank.get(b.id) ?? 0))
      .map(toConditionHit),
    treatments: treatments
      .sort((a, b) => (programRank.get(a.id) ?? 0) - (programRank.get(b.id) ?? 0))
      .map(toTreatmentHit),
    etcs: etcs.sort((a, b) => (etcRank.get(a.id) ?? 0) - (etcRank.get(b.id) ?? 0)).map(toEtcHit),
  };

  // PHI-redaction posture: never log raw q. Search boxes can receive
  // identifying clinical text, so observability keeps only length and counts.
  logger.info(
    {
      requestId,
      route: "/v1/public/search",
      queryLength: q.length,
      counts: {
        conditions: sections.conditions.length,
        treatments: sections.treatments.length,
        etcs: sections.etcs.length,
      },
    },
    "public search executed",
  );

  // 4. Cache headers — 60s max-age, stale-while-revalidate for any future
  // CDN. Plays well with Vercel edge today; Cloudflare deferred.
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=600");

  const response: PublicSearchResponse = {
    query: q,
    sections,
    totals: {
      conditions: sections.conditions.length,
      treatments: sections.treatments.length,
      etcs: sections.etcs.length,
    },
  };
  return c.json(response);
});

// ---------------------------------------------------------------------------
// Hydration helpers. Each runs under the same transaction-local
// directory_anonymous role context as the FTS pass.
// ---------------------------------------------------------------------------

async function hydrateConditions(
  db: PublicDbContextVars["dbClient"],
  ids: string[],
): Promise<ConditionRow[]> {
  const sql = `
    select c.id::text as id,
           c.slug,
           c.name,
           c.state,
           coalesce((
             select count(*)::int
             from program_conditions pc
             join programs p on p.id = pc.program_id
             where pc.condition_id = c.id
               and p.directory_published = true
           ), 0) as program_count
    from conditions c
    where c.id = any($1::uuid[])
      and c.published = true
  `;
  const result = await db.query<ConditionRow>(sql, [ids]);
  return result.rows;
}

async function hydrateTreatments(
  db: PublicDbContextVars["dbClient"],
  ids: string[],
): Promise<ProgramRow[]> {
  // The tenants table is not readable to the directory_anonymous role
  // (existing tenant-membership-scoped policies, intentional posture).
  // For Slice 1 we leave manufacturer null on the wire — the schema
  // allows it (PublicSearchTreatmentHit.manufacturer is nullable). A
  // future slice can either denormalize manufacturer onto programs at
  // publish time or add a narrow public-read policy on tenants for rows
  // referenced by directory_published programs/etcs.
  const sql = `
    select p.id::text as id,
           p.directory_slug as slug,
           p.name,
           p.drug,
           null::text as manufacturer,
           true as available
    from programs p
    where p.id = any($1::uuid[])
      and p.directory_published = true
  `;
  const result = await db.query<ProgramRow>(sql, [ids]);
  return result.rows.filter((r) => r.slug !== null);
}

async function hydrateEtcs(db: PublicDbContextVars["dbClient"], ids: string[]): Promise<EtcRow[]> {
  // ETC display name comes from tenants.display_name — not directly
  // readable here. The trigger on etcs (SECURITY DEFINER, owner has
  // BYPASSRLS per migration 0011's contract) populated
  // search_index_documents.title with the right value, and the public
  // visibility_classification = 'public' policy makes it readable to
  // the directory_anonymous role. Source the name from there.
  const sql = `
    select e.id::text as id,
           e.directory_slug as slug,
           sid.title as name,
           e.directory_city as city
    from etcs e
    join search_index_documents sid
      on sid.source_table = 'etcs'
      and sid.source_id = e.id
      and sid.visibility_classification = 'public'
    where e.id = any($1::uuid[])
      and e.directory_published = true
  `;
  const result = await db.query<EtcRow>(sql, [ids]);
  return result.rows.filter((r) => r.slug !== null);
}

function toConditionHit(row: ConditionRow): PublicSearchConditionHit {
  return {
    type: "condition",
    slug: row.slug,
    name: row.name,
    state: row.state,
    programCount: row.program_count,
    href: `/conditions/${row.slug}`,
  };
}

function toTreatmentHit(row: ProgramRow): PublicSearchTreatmentHit {
  return {
    type: "treatment",
    slug: row.slug,
    name: row.name,
    drug: row.drug,
    manufacturer: row.manufacturer,
    available: row.available,
    href: `/programs/${row.slug}`,
  };
}

function toEtcHit(row: EtcRow): PublicSearchEtcHit {
  return {
    type: "etc",
    slug: row.slug,
    name: row.name,
    city: row.city,
    href: `/etcs/${row.slug}`,
  };
}
