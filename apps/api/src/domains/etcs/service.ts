import type { PoolClient } from "@lewis/db";
import type {
  AppContext,
  CursorPageQuery,
  EtcComplianceResponse,
  EtcDashboardResponse,
  EtcDrugInventoryLotsResponse,
  EtcId,
  EtcMessagesResponse,
} from "@lewis/shared";

/**
 * ETC service layer. See manufacturers/service.ts for the contract and the
 * sprint-marker key (docs/implementation.md § 0.2).
 */

export async function getDashboard(
  _client: PoolClient,
  _ctx: AppContext,
  params: { etcId: EtcId },
): Promise<EtcDashboardResponse> {
  // TODO(sprint-3): aggregate compliance score + open task list for the ETC.
  // Sprint 3 ships ETC operational backbone (P&P, staff, ETRB, QAPI, compliance).
  return { etcId: params.etcId, compliance: null, tasks: [] };
}

export async function getCompliance(
  _client: PoolClient,
  _ctx: AppContext,
  params: { etcId: EtcId },
): Promise<EtcComplianceResponse> {
  // TODO(sprint-3): SELECT compliance health + obligations from regulatory tables.
  // Sprint 3 ships the compliance-scoring surface.
  return { etcId: params.etcId, healthScore: null, obligations: [] };
}

export async function listMessages(
  _client: PoolClient,
  _ctx: AppContext,
  params: { etcId: EtcId } & CursorPageQuery,
): Promise<EtcMessagesResponse> {
  // TODO(sprint-4): cursor-paginated message threads for this ETC.
  // Sprint 4 ships patient flow (8 stages) which includes ETC↔patient messaging.
  return {
    etcId: params.etcId,
    items: [],
    nextCursor: null,
    hasMore: false,
  };
}

export async function listDrugInventoryLots(
  _client: PoolClient,
  _ctx: AppContext,
  params: { etcId: EtcId } & CursorPageQuery,
): Promise<EtcDrugInventoryLotsResponse> {
  // TODO(sprint-5): drug inventory + lot tracking from ETC drug tables.
  // Sprint 5 ships treatment + visit documentation, where drug-lot tracking lives.
  return {
    etcId: params.etcId,
    items: [],
    nextCursor: null,
    hasMore: false,
  };
}
