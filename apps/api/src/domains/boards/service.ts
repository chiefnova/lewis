import type { PoolClient } from "@lewis/db";
import type {
  AppContext,
  BoardAnnualReportResponse,
  BoardId,
  BoardProtocolReviewsResponse,
  CursorPageQuery,
} from "@lewis/shared";

/**
 * Review board service layer. See manufacturers/service.ts for the
 * sprint-marker key (docs/implementation.md § 0.2).
 */

export async function listProtocolReviews(
  _client: PoolClient,
  _ctx: AppContext,
  params: { boardId: BoardId } & CursorPageQuery,
): Promise<BoardProtocolReviewsResponse> {
  // TODO(sprint-3): SELECT protocol_reviews WHERE board_tenant_id = $boardId.
  // Sprint 3 ships ETRB workflows (protocol review, RULE 16(6)(f) determinations).
  return {
    boardId: params.boardId,
    items: [],
    nextCursor: null,
    hasMore: false,
  };
}

export async function getAnnualReport(
  _client: PoolClient,
  _ctx: AppContext,
  params: { boardId: BoardId },
): Promise<BoardAnnualReportResponse> {
  // TODO(sprint-5): aggregate Jan-31 annual report data.
  // Sprint 5 ships DPHHS annual reporting (Jan 31 deadline, America/Denver).
  return { boardId: params.boardId, report: null };
}
