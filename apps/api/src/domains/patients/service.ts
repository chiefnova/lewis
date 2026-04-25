import type { PoolClient } from "@corridor/db";
import type {
  AppContext,
  CursorPageQuery,
  PatientDocumentsResponse,
  PatientMeResponse,
  PatientMessagesResponse,
} from "@corridor/shared";

/**
 * Patient service layer. The patient portal's "me" endpoints resolve the
 * patient by app.current_tenant_id() — RLS ensures a patient session can
 * only see their own row.
 *
 * See sponsors/service.ts for the sprint-marker key (docs/implementation.md
 * § 0.2).
 */

export async function getMe(_client: PoolClient, _ctx: AppContext): Promise<PatientMeResponse> {
  // TODO(sprint-4): SELECT FROM patients WHERE tenant_id = app.current_tenant_id()
  // gated by patients_self_read (0006). Sprint 4 ships the patient portal end-to-end.
  return { treatmentStatus: null, tasks: [] };
}

export async function listMyMessages(
  _client: PoolClient,
  _ctx: AppContext,
  _page: CursorPageQuery,
): Promise<PatientMessagesResponse> {
  // TODO(sprint-4): cursor-paginated message threads for the patient.
  // Sprint 4 ships the messaging surface as part of the patient portal e2e.
  return { items: [], nextCursor: null, hasMore: false };
}

export async function listMyDocuments(
  _client: PoolClient,
  _ctx: AppContext,
  _page: CursorPageQuery,
): Promise<PatientDocumentsResponse> {
  // TODO(sprint-4): documents from file_storage_objects scoped to this patient.
  // Sprint 4 ships the patient documents surface (agreements, consents, results).
  return { items: [], nextCursor: null, hasMore: false };
}
