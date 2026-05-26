import {
  EtcSlug,
  PublicEtcDetail,
  PublicEtcListResponse,
  type PublicEtcDetail as PublicEtcDetailType,
  type PublicEtcOfferedProgram,
  type PublicEtcSummary,
} from "@lewis/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { respondWithError } from "../../middleware/errors.js";
import type { PublicDbContextVars } from "../../middleware/public-context.js";
import { logger } from "../../logger.js";

/**
 * GET /v1/public/etcs
 * GET /v1/public/etcs/:slug
 *
 * Anonymous catalog endpoints for the directory's ETC surface (per
 * directoryprd.md § 16). All reads ride the directory_anonymous RLS posture
 * set up by withPublicDbContext: anonymous role + directory_published flag
 * gating, default-deny if either is missing.
 *
 * The list returns every directory_published ETC with the lat/lng + program
 * count needed by the Mapbox map AND the list cards in one round trip. The
 * detail endpoint hydrates the requested ETC plus its offered programs via
 * the SECURITY DEFINER helper app.directory_etc_program_offerings, which
 * traverses tenant_relationships (PPA edges) without exposing those rows
 * to the anonymous role.
 *
 * Cache-Control:
 *   list   → max-age=60,  swr=600   (Big Sky changes are rare)
 *   detail → max-age=300, swr=3600  (heavier payload, even rarer changes)
 */

const EtcSlugParam = z.object({ slug: EtcSlug });

type EtcListRow = {
  slug: string;
  name: string;
  directory_city: string | null;
  license_number: string | null;
  accepting_new_patients: boolean;
  directory_lat: number | null;
  directory_lng: number | null;
  program_count: number;
};

type EtcDetailRow = {
  id: string;
  slug: string;
  name: string;
  directory_city: string | null;
  license_number: string | null;
  accepting_new_patients: boolean;
  directory_lat: number | null;
  directory_lng: number | null;
  directory_summary: string | null;
  directory_address_lines: string[] | null;
  directory_phone: string | null;
  directory_hours: string | null;
  medical_director_name: string | null;
  medical_director_credentials: string | null;
  medical_director_clinical_email: string | null;
  medical_director_clinical_phone: string | null;
};

type OfferedProgramRow = {
  slug: string;
  name: string;
  drug: string | null;
  indication: string | null;
  treatment_form: string | null;
  phase: string | null;
};

export const publicEtcsRoutes = new Hono<{ Variables: PublicDbContextVars }>();

publicEtcsRoutes.get("/", async (c) => {
  const db = c.var.dbClient;
  const requestId = c.var.requestId ?? "unknown";

  // The human-facing ETC name lives on the parent tenant row
  // (tenants.display_name), which the directory_anonymous role CANNOT read —
  // `tenants` has only member-read + write policies, no public-read. So the
  // name comes through the SECURITY DEFINER helper app.directory_etc_display_name
  // (same posture as every other tenants-traversing directory read); a direct
  // join would silently return zero rows under RLS.
  //
  // The program_count subquery counts via the same SECURITY DEFINER helper
  // the detail endpoint uses, so list + detail can never disagree about how
  // many programs an ETC offers.
  const sql = `
    select e.directory_slug as slug,
           app.directory_etc_display_name(e.id) as name,
           e.directory_city,
           e.license_number,
           e.accepting_new_patients,
           e.directory_lat,
           e.directory_lng,
           coalesce((
             select count(*)::int
             from app.directory_etc_program_offerings(e.id)
           ), 0) as program_count
    from etcs e
    where e.directory_published = true
      and e.directory_slug is not null
    order by name asc
  `;
  const result = await db.query<EtcListRow>(sql);

  const etcs: PublicEtcSummary[] = result.rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    city: row.directory_city ?? "",
    state: "MT",
    licenseNumber: row.license_number ?? "",
    acceptingPatients: row.accepting_new_patients,
    lat: row.directory_lat,
    lng: row.directory_lng,
    programCount: row.program_count,
  }));

  logger.info(
    {
      requestId,
      route: "/v1/public/etcs",
      count: etcs.length,
    },
    "public etcs list executed",
  );

  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=600");
  return c.json(PublicEtcListResponse.parse({ etcs }));
});

publicEtcsRoutes.get(
  "/:slug",
  zValidator("param", EtcSlugParam, (result, c) => {
    if (!result.success) {
      return respondWithError(c, "validation_error", "Invalid ETC slug.", result.error.flatten());
    }
  }),
  async (c) => {
    const db = c.var.dbClient;
    const requestId = c.var.requestId ?? "unknown";
    const { slug } = c.req.valid("param");

    const detailResult = await db.query<EtcDetailRow>(
      `
        select e.id::text as id,
               e.directory_slug as slug,
               app.directory_etc_display_name(e.id) as name,
               e.directory_city,
               e.license_number,
               e.accepting_new_patients,
               e.directory_lat,
               e.directory_lng,
               e.directory_summary,
               e.directory_address_lines,
               e.directory_phone,
               e.directory_hours,
               e.medical_director_name,
               e.medical_director_credentials,
               e.medical_director_clinical_email,
               e.medical_director_clinical_phone
        from etcs e
        where e.directory_slug = $1
          and e.directory_published = true
      `,
      [slug],
    );

    const row = detailResult.rows[0];
    if (!row) {
      return respondWithError(c, "not_found", "ETC not found.");
    }

    // Programs offered via active PPA. The SECURITY DEFINER helper handles
    // the join through tenant_relationships (which is NOT in the
    // directory_anonymous read policy set) and returns only the public
    // catalog columns.
    const programsResult = await db.query<OfferedProgramRow>(
      `select slug, name, drug, indication, treatment_form, phase
         from app.directory_etc_program_offerings($1::uuid)`,
      [row.id],
    );

    const programs: PublicEtcOfferedProgram[] = programsResult.rows.map((p) => ({
      slug: p.slug,
      name: p.name,
      drug: p.drug,
      indication: p.indication,
      form: p.treatment_form,
      phase: p.phase,
    }));

    // Address lines come from directory_address_lines (text[]). Falling back
    // to a single-line "directory_city" when the structured array isn't set
    // keeps the schema's `min(1)` invariant satisfied for ETCs that only
    // have city populated yet.
    const address: string[] =
      row.directory_address_lines && row.directory_address_lines.length > 0
        ? row.directory_address_lines
        : row.directory_city
          ? [`${row.directory_city}, MT`]
          : ["Montana"];

    const detail: PublicEtcDetailType = {
      slug: row.slug,
      name: row.name,
      city: row.directory_city ?? "",
      state: "MT",
      licenseNumber: row.license_number ?? "",
      acceptingPatients: row.accepting_new_patients,
      lat: row.directory_lat,
      lng: row.directory_lng,
      programCount: programs.length,
      about: row.directory_summary ?? "",
      address,
      phone: row.directory_phone,
      hours: row.directory_hours,
      medicalDirector: {
        name: row.medical_director_name ?? "",
        credentials: row.medical_director_credentials ?? "",
        clinicalEmail: row.medical_director_clinical_email,
        clinicalPhone: row.medical_director_clinical_phone,
      },
      programs,
      // P2 work — manual + etrb-report are rendered from app.lewis.health once
      // the operating platform is live (per § 32.3). Slice 4 returns an empty
      // array; the EtcProfilePage hides the public-documents block when empty.
      publicDocuments: [],
    };

    logger.info(
      {
        requestId,
        route: "/v1/public/etcs/:slug",
        slug: detail.slug,
        programCount: programs.length,
      },
      "public etc detail executed",
    );

    c.header("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
    return c.json(PublicEtcDetail.parse(detail));
  },
);
