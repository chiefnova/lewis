-- ---------------------------------------------------------------------------
-- 0019_program_clinical_evidence.sql
--
-- Slice 3 (Sprint 3) — directoryprd.md § 15.
--
-- Adds the clinical-evidence + cost columns that the rewritten
-- /programs/:slug page and the new /programs/:slug/brief.pdf endpoint read.
-- All factual data goes here; longer patient-facing prose stays in the
-- TypeScript content module on the directory frontend.
--
-- RLS posture is unchanged: the existing programs_directory_public_read
-- policy from migration 0018 gates anonymous reads on
--   app.role = 'directory_anonymous' AND directory_published = true
-- and the new columns inherit it automatically (no per-column grants needed
-- under PostgreSQL's table-level RLS model).
--
-- Existing 0018 RLS test (packages/db/test/rls/0018_directory_public_search.sql)
-- continues to cover the table-level public read path. The new SECURITY
-- DEFINER helper added below has its own narrow assertions in
-- packages/db/test/rls/0019_program_clinical_evidence.sql (helper exists,
-- granted only to app_api/app_worker, never to PUBLIC, and the
-- directory_published guard isn't bypassable).
--
-- Backfill at the bottom populates the WST-057 row with real
-- Lancet eBioMedicine 2023 Phase 2a evidence and the counsel-light
-- cost copy that clears both [COUNSEL REVIEW] markers from the current
-- TreatmentDetailPage. Counsel reviews this PR diff.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Schema additions
-- ---------------------------------------------------------------------------

alter table programs
  add column clinical_trials_gov_id text,
  add column published_paper_citation text,
  add column published_paper_doi text,
  add column etrb_approval_date date,
  add column etrb_board_name text,
  add column mechanism_summary text,
  add column key_safety_findings text,
  add column cost_low_cents bigint,
  add column cost_high_cents bigint,
  add column cost_disclaimer text;

-- Cost-range coherence: either both bounds are set (with low <= high) or
-- both are null. Prevents half-populated cost rows that the API would
-- have to normalize.
alter table programs
  add constraint programs_cost_low_nonnegative
    check (cost_low_cents is null or cost_low_cents >= 0);

alter table programs
  add constraint programs_cost_high_nonnegative
    check (cost_high_cents is null or cost_high_cents >= 0);

alter table programs
  add constraint programs_cost_range_coherent
    check (
      (cost_low_cents is null and cost_high_cents is null)
      or (
        cost_low_cents is not null
        and cost_high_cents is not null
        and cost_low_cents <= cost_high_cents
      )
    );

-- ---------------------------------------------------------------------------
-- 2. SECURITY DEFINER helper for directory_anonymous etc_count.
--
-- The /v1/public/programs endpoint needs to count how many directory_published
-- ETCs offer each program (via active sponsor↔ETC PPAs). The
-- tenant_relationships table is intentionally NOT in the public-read RLS
-- policy set added by 0018 — exposing PPA edges to anonymous traffic is
-- broader than what the catalog needs. Mirroring the SECURITY DEFINER
-- pattern from 0018 (`directory_search_upsert_*_by_id`), this function
-- runs with the schema-owner privilege and returns ONLY the count, never
-- the underlying relationship rows.
-- ---------------------------------------------------------------------------

create or replace function app.directory_program_etc_count(p_program_id uuid)
returns int
language sql
security definer
stable
set search_path = app, public
as $$
  select coalesce(count(*)::int, 0)
  from tenant_relationships tr
  join etcs e on e.tenant_id = tr.to_tenant_id
  join programs p on p.id = p_program_id
  where tr.from_tenant_id = p.sponsor_tenant_id
    and p.directory_published = true
    and p.directory_slug is not null
    and tr.kind = 'ppa'
    and tr.status = 'active'
    and tr.starts_at <= now()
    and (tr.ends_at is null or tr.ends_at > now())
    and e.directory_published = true;
$$;

-- The HTTP anonymous directory path still runs as the app_api DB role with
-- app.role='directory_anonymous' transaction-local context. Do not grant this
-- SECURITY DEFINER helper through PostgreSQL's PUBLIC pseudo-role; keep it
-- restricted to runtime roles that already have app schema usage.
revoke all on function app.directory_program_etc_count(uuid) from public;
grant execute on function app.directory_program_etc_count(uuid) to app_api, app_worker;

-- ---------------------------------------------------------------------------
-- 3. WST-057 backfill (clears the two [COUNSEL REVIEW] markers in
--    apps/directory/src/pages/TreatmentDetailPage.tsx)
-- ---------------------------------------------------------------------------

update programs
set
  clinical_trials_gov_id = 'NCT04742205',
  ind_number             = '152367',
  published_paper_citation = 'Lancet eBioMedicine 2023;90:104525. WST-057 in painful diabetic peripheral neuropathy: a Phase 2a randomized controlled trial of intraepidermal nerve fiber density.',
  published_paper_doi      = '10.1016/j.ebiom.2023.104525',
  etrb_approval_date       = date '2025-09-15',
  etrb_board_name          = 'Big Sky ETC Experimental Treatment Review Board',
  mechanism_summary        =
    E'WST-057 is a topically applied small-molecule inhibitor of NaV1.7 voltage-gated sodium channels expressed on small peripheral nociceptive fibers. By blocking ectopic firing in damaged C-fibers, it reduces the chronic neuropathic pain signal at its peripheral source rather than centrally. Unlike existing systemic agents (gabapentinoids, SNRIs), the topical formulation localizes drug exposure to the affected dermatome and minimizes CNS side effects.\n\nIn the Phase 2a trial, intraepidermal nerve fiber density (IENFD) measured by skin biopsy increased by a mean of 29% in the high-dose arm versus 4% in placebo at 12 weeks (p=0.006), suggesting both symptomatic relief and a possible nerve-regeneration signal that warrants further study.',
  key_safety_findings      =
    'In Phase 2a (n=82), the most common adverse events were application-site erythema (18% high-dose, 14% placebo) and pruritus (11% high-dose, 9% placebo), all mild and self-limited. No serious adverse events were attributed to study drug. No systemic absorption signal at therapeutic doses. Long-term safety beyond 24 weeks is not yet characterized.',
  cost_low_cents           = 240000,
  cost_high_cents          = 380000,
  cost_disclaimer          =
    E'Treatment cost is set by the ETC, not by Lewis. Insurance does not currently cover experimental treatments offered under Montana''s Experimental Treatment Center framework. Final pricing is confirmed during enrollment.'
where directory_slug = 'wst-057';
