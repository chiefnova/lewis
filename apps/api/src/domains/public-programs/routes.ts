import {
  PublicProgramDetail,
  PublicProgramListResponse,
  ProgramSlug,
  type PublicProgramDetail as PublicProgramDetailType,
  type PublicProgramSummary,
} from "@lewis/shared";
import { renderProgramBrief } from "@lewis/pdf/render";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { respondWithError } from "../../middleware/errors.js";
import type { PublicDbContextVars } from "../../middleware/public-context.js";
import { logger } from "../../logger.js";

/**
 * Public programs API per directoryprd.md § 15.
 *
 *   GET /v1/public/programs                  → list of directory_published programs
 *   GET /v1/public/programs/:slug            → detail with clinical evidence
 *   GET /v1/public/programs/:slug/brief.pdf  → 1-page Puppeteer-rendered clinical brief
 *
 * All reads ride the directory_anonymous RLS posture set up by
 * withPublicDbContext (see migration 0018 + middleware/public-context.ts).
 *
 * Cache-Control:
 *   list   → max-age=60,   swr=600
 *   detail → max-age=300,  swr=3600
 *   brief  → max-age=3600, swr=86400  (per § 28.4)
 *
 * The brief PDF renders synchronously via Puppeteer; the Cloudflare edge
 * cache + tighter rate-limit bucket (mounted in server.ts) absorbs the cost.
 */

const ProgramSlugParam = z.object({ slug: ProgramSlug });

type ProgramListRow = {
  slug: string;
  name: string;
  drug: string | null;
  indication: string | null;
  treatment_form: string | null;
  phase: string | null;
  etc_count: number;
};

type ProgramDetailRow = {
  id: string;
  slug: string;
  name: string;
  drug: string | null;
  indication: string | null;
  treatment_form: string | null;
  phase: string | null;
  patient_facing_description: string | null;
  directory_summary: string | null;
  clinical_trials_gov_id: string | null;
  ind_number: string | null;
  published_paper_citation: string | null;
  published_paper_doi: string | null;
  etrb_approval_date: string | null;
  etrb_board_name: string | null;
  mechanism_summary: string | null;
  key_safety_findings: string | null;
  cost_low_cents: string | null;
  cost_high_cents: string | null;
  cost_disclaimer: string | null;
  etc_count: number;
};

export const publicProgramsRoutes = new Hono<{ Variables: PublicDbContextVars }>();

publicProgramsRoutes.get("/", async (c) => {
  const db = c.var.dbClient;
  const requestId = c.var.requestId ?? "unknown";

  // List: directory_published programs, plus a count of ETCs offering each
  // (via the sponsor↔ETC PPA relationship). The count comes from a
  // SECURITY DEFINER helper because tenant_relationships is intentionally
  // not in the directory_anonymous public-read policy set. See migration 0019.
  const sql = `
    select p.directory_slug as slug,
           p.name,
           p.drug,
           p.indication,
           p.treatment_form,
           p.phase,
           app.directory_program_etc_count(p.id) as etc_count
    from programs p
    where p.directory_published = true
      and p.directory_slug is not null
    order by p.name asc
  `;
  const result = await db.query<ProgramListRow>(sql);

  const programs: PublicProgramSummary[] = result.rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    indication: row.indication ?? "",
    // manufacturer stays null until a public-safe tenant display-name path
    // ships (slice 4 — same Slice 1/2 carryover note).
    manufacturer: null,
    form: parseFormEnum(row.treatment_form),
    phase: parsePhaseEnum(row.phase),
    etcCount: row.etc_count,
    available: true,
  }));

  logger.info(
    { requestId, route: "/v1/public/programs", count: programs.length },
    "public programs list executed",
  );

  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=600");
  return c.json(PublicProgramListResponse.parse({ programs, total: programs.length }));
});

publicProgramsRoutes.get(
  "/:slug",
  zValidator("param", ProgramSlugParam, (result, c) => {
    if (!result.success) {
      return respondWithError(
        c,
        "validation_error",
        "Invalid program slug.",
        result.error.flatten(),
      );
    }
  }),
  async (c) => {
    const db = c.var.dbClient;
    const requestId = c.var.requestId ?? "unknown";
    const { slug } = c.req.valid("param");

    const detail = await fetchProgramDetail(db, slug);
    if (!detail) {
      return respondWithError(c, "not_found", "Program not found.");
    }

    logger.info(
      {
        requestId,
        route: "/v1/public/programs/:slug",
        slug: detail.slug,
        etcCount: detail.etcCount,
      },
      "public program detail executed",
    );

    c.header("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
    return c.json(PublicProgramDetail.parse(detail));
  },
);

publicProgramsRoutes.get(
  "/:slug/brief.pdf",
  zValidator("param", ProgramSlugParam, (result, c) => {
    if (!result.success) {
      return respondWithError(
        c,
        "validation_error",
        "Invalid program slug.",
        result.error.flatten(),
      );
    }
  }),
  async (c) => {
    const db = c.var.dbClient;
    const requestId = c.var.requestId ?? "unknown";
    const { slug } = c.req.valid("param");

    const detail = await fetchProgramDetail(db, slug);
    if (!detail) {
      return respondWithError(c, "not_found", "Program not found.");
    }

    // Parse through PublicProgramDetail before rendering so the PDF path
    // enforces the same schema invariants as the JSON path (etrb.approvalDate
    // regex, costRange.currency literal, etc.). Without this, a future
    // migration that stores a malformed approvalDate would render a wonky
    // PDF instead of failing loudly. Zod throws on bad data; the surrounding
    // try/catch maps that to the canonical 503 service_unavail envelope.
    const renderStartedAt = Date.now();
    let pdfBytes: Buffer;
    try {
      const validated = PublicProgramDetail.parse(detail);
      pdfBytes = await renderProgramBrief(validated, {
        siteUrl: process.env.PUBLIC_SITE_URL ?? "https://lewis.health",
      });
    } catch (error: unknown) {
      const renderMs = Date.now() - renderStartedAt;
      logger.error(
        {
          requestId,
          route: "/v1/public/programs/:slug/brief.pdf",
          slug: detail.slug,
          renderMs,
          message: error instanceof Error ? error.message : "unknown render error",
        },
        "public program brief render failed",
      );
      return respondWithError(c, "service_unavail", "Program brief is temporarily unavailable.");
    }
    const renderMs = Date.now() - renderStartedAt;

    const filename = `lewis-brief-${detail.slug}-${formatYyyymmdd(new Date())}.pdf`;

    logger.info(
      {
        requestId,
        route: "/v1/public/programs/:slug/brief.pdf",
        slug: detail.slug,
        renderMs,
        bytes: pdfBytes.length,
      },
      "public program brief rendered",
    );

    // c.body() narrows Uint8Array to a generic that's stricter than Buffer's
    // ArrayBufferLike, so we return a Response directly. Hono passes this
    // through without trying to re-type the body.
    return new Response(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  },
);

// ---------------------------------------------------------------------------
// internals
// ---------------------------------------------------------------------------

async function fetchProgramDetail(
  db: PublicDbContextVars["dbClient"],
  slug: string,
): Promise<PublicProgramDetailType | null> {
  const result = await db.query<ProgramDetailRow>(
    `
      select p.id::text as id,
             p.directory_slug as slug,
             p.name,
             p.drug,
             p.indication,
             p.treatment_form,
             p.phase,
             p.patient_facing_description,
             p.directory_summary,
             p.clinical_trials_gov_id,
             p.ind_number,
             p.published_paper_citation,
             p.published_paper_doi,
             to_char(p.etrb_approval_date, 'YYYY-MM-DD') as etrb_approval_date,
             p.etrb_board_name,
             p.mechanism_summary,
             p.key_safety_findings,
             p.cost_low_cents::text as cost_low_cents,
             p.cost_high_cents::text as cost_high_cents,
             p.cost_disclaimer,
             app.directory_program_etc_count(p.id) as etc_count
      from programs p
      where p.directory_slug = $1
        and p.directory_published = true
    `,
    [slug],
  );

  const row = result.rows[0];
  if (!row) return null;

  const costLow = row.cost_low_cents !== null ? Number(row.cost_low_cents) : null;
  const costHigh = row.cost_high_cents !== null ? Number(row.cost_high_cents) : null;

  // Map the directory_summary or patient_facing_description into "about"
  // so the API surface stays stable even before the editorial content
  // module on the directory frontend ships.
  const about = row.directory_summary ?? row.patient_facing_description ?? "";

  return {
    slug: row.slug,
    name: row.name,
    indication: row.indication ?? "",
    manufacturer: null,
    form: parseFormEnum(row.treatment_form),
    phase: parsePhaseEnum(row.phase),
    etcCount: row.etc_count,
    available: true,
    about,
    whoThisIsFor: row.patient_facing_description ?? "",
    enrollment: [],
    costRange:
      costLow !== null && costHigh !== null
        ? {
            low: costLow,
            high: costHigh,
            currency: "USD" as const,
            disclaimer: row.cost_disclaimer,
          }
        : null,
    publishedEvidenceUrl: null,
    clinicalTrialsGovId: row.clinical_trials_gov_id,
    indNumber: row.ind_number,
    publishedPaper:
      row.published_paper_citation !== null && row.published_paper_doi !== null
        ? {
            citation: row.published_paper_citation,
            doi: row.published_paper_doi,
          }
        : null,
    etrb:
      row.etrb_approval_date !== null && row.etrb_board_name !== null
        ? {
            approvalDate: row.etrb_approval_date,
            boardName: row.etrb_board_name,
          }
        : null,
    mechanismSummary: row.mechanism_summary,
    keySafetyFindings: row.key_safety_findings,
  };
}

// The programs table stores treatment_form / phase as lowercase / underscored
// internal codes (e.g. "topical", "phase_2") because the same column powers
// the regulated app.lewis.health side, where those codes drive workflow
// branches. The public-API contract uses the human-readable display strings
// in PublicProgramSummary.form / .phase, so this mapping translates between
// the two. Unknown codes return null — the directory UI degrades gracefully.

const FORM_DISPLAY_BY_CODE: Record<
  string,
  "Topical" | "Oral" | "Injection" | "Infusion" | "Device"
> = {
  topical: "Topical",
  oral: "Oral",
  injection: "Injection",
  infusion: "Infusion",
  device: "Device",
  // Tolerate already-display-cased values too (e.g. test fixtures, fresh
  // seeds, or future migrations that store display strings directly).
  Topical: "Topical",
  Oral: "Oral",
  Injection: "Injection",
  Infusion: "Infusion",
  Device: "Device",
};

function parseFormEnum(
  value: string | null,
): "Topical" | "Oral" | "Injection" | "Infusion" | "Device" | null {
  if (!value) return null;
  return FORM_DISPLAY_BY_CODE[value] ?? null;
}

const PHASE_DISPLAY_BY_CODE: Record<string, "Phase 1" | "Phase 2" | "Phase 3"> = {
  phase_1: "Phase 1",
  phase_2: "Phase 2",
  phase_3: "Phase 3",
  "Phase 1": "Phase 1",
  "Phase 2": "Phase 2",
  "Phase 3": "Phase 3",
};

function parsePhaseEnum(value: string | null): "Phase 1" | "Phase 2" | "Phase 3" | null {
  if (!value) return null;
  return PHASE_DISPLAY_BY_CODE[value] ?? null;
}

function formatYyyymmdd(date: Date): string {
  const yyyy = date.getUTCFullYear().toString().padStart(4, "0");
  const mm = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = date.getUTCDate().toString().padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}
