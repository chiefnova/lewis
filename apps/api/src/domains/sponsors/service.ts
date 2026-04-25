import type { PoolClient } from "@corridor/db";
import type {
  AppContext,
  CursorPageQuery,
  SponsorAdverseEventsResponse,
  SponsorEtcsResponse,
  SponsorId,
  SponsorProgramsResponse,
} from "@corridor/shared";

/**
 * Sponsor service layer. Routes call these functions; functions own the DB
 * queries and business logic. Inputs are pre-validated branded types.
 *
 * All functions take (client, ctx, params) so the per-request transaction
 * (with app.* RLS context already set by withDbContext middleware) flows
 * through. The client must be the request-scoped client — never reach into
 * the pool directly.
 *
 * Until real queries land, these return empty paginated pages. Each TODO
 * marker names the table(s) the eventual query will touch and the sprint
 * it lands in per docs/implementation.md § 0.2:
 *   sprint-1 = Foundation (done)
 *   sprint-2 = Sponsor + ETC onboarding (sponsor wizard, program config, PPA)
 *   sprint-3 = ETC operational backbone (P&P, staff, ETRB, QAPI, compliance)
 *   sprint-4 = Patient flow (8 stages, patient portal end-to-end)
 *   sprint-5 = Treatment + AE + reporting (visit, transfer, AE 5-day, DPHHS, HFAR)
 *   sprint-6 = Hardening + launch (admin portal, pen test, a11y, perf)
 */

export async function listPrograms(
  _client: PoolClient,
  _ctx: AppContext,
  params: { sponsorId: SponsorId } & CursorPageQuery,
): Promise<SponsorProgramsResponse> {
  // TODO(sprint-2): SELECT FROM programs WHERE sponsor_tenant_id = $sponsorId
  // ORDER BY (created_at, id) cursor LIMIT $limit. RLS-gated by
  // programs_sponsor_read (0006). Sprint 2 ships sponsor wizard + program config.
  return {
    sponsorId: params.sponsorId,
    items: [],
    nextCursor: null,
    hasMore: false,
  };
}

export async function listEtcs(
  _client: PoolClient,
  _ctx: AppContext,
  params: { sponsorId: SponsorId } & CursorPageQuery,
): Promise<SponsorEtcsResponse> {
  // TODO(sprint-2): JOIN tenant_relationships ON kind='ppa' to find ETCs
  // related to this sponsor. Sprint 2 ships the PPA workflow.
  return {
    sponsorId: params.sponsorId,
    items: [],
    nextCursor: null,
    hasMore: false,
  };
}

export async function listAdverseEvents(
  _client: PoolClient,
  _ctx: AppContext,
  params: { sponsorId: SponsorId } & CursorPageQuery,
): Promise<SponsorAdverseEventsResponse> {
  // TODO(sprint-5): SELECT FROM adverse_events filtered by consent posture.
  // Data scope is determined by the strongest consent the sponsor holds for
  // each event's patient — defaults to deidentified line-level safety.
  // Sprint 5 ships AE 5-day workflow + sponsor reports.
  return {
    sponsorId: params.sponsorId,
    dataScope: "deidentified_line_level_safety",
    items: [],
    nextCursor: null,
    hasMore: false,
  };
}
