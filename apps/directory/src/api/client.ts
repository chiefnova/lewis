// Public-API client for the directory app. Hits only /v1/public/* and the
// two narrowly-scoped semi-authenticated patient-account endpoints. Never
// reads from Supabase directly. Validates every response with the public
// Zod schemas in @lewis/shared.

import {
  type ConnectRequestPayload,
  ConnectRequestResponse,
  type EligibilityAnswersRequest,
  EligibilityCompleteResponse,
  EligibilityStartResponse,
  type LinkAnonymousScreenRequest,
  LinkAnonymousScreenResponse,
  MarketingConfirmResponse,
  type MarketingSubscriptionRequest,
  MarketingSubscriptionResponse,
  MarketingUnsubscribeResponse,
  PublicConditionDetail,
  PublicConditionListResponse,
  PublicEtcDetail,
  PublicEtcListResponse,
  PublicProgramDetail,
  PublicProgramFacets,
  PublicProgramListResponse,
} from "@lewis/shared/api/public";
import { PublicSearchResponse } from "@lewis/shared/api/search";
import type { ZodType } from "zod";

// Slice 4 — faceted /browse query params. Empty arrays / unset sort produce a
// no-op WHERE clause server-side, matching the slice-3 baseline list shape.
export type ProgramListParams = {
  conditions?: ReadonlyArray<string>;
  forms?: ReadonlyArray<string>;
  phases?: ReadonlyArray<string>;
  etcs?: ReadonlyArray<string>;
  manufacturers?: ReadonlyArray<string>;
  sort?: "alphabetical" | "recent" | "etc_count";
};

function buildProgramListQuery(params?: ProgramListParams): string {
  if (!params) return "";
  const u = new URLSearchParams();
  for (const v of params.conditions ?? []) u.append("condition", v);
  for (const v of params.forms ?? []) u.append("form", v);
  for (const v of params.phases ?? []) u.append("phase", v);
  for (const v of params.etcs ?? []) u.append("etc", v);
  for (const v of params.manufacturers ?? []) u.append("manufacturer", v);
  if (params.sort) u.set("sort", params.sort);
  const q = u.toString();
  return q ? `?${q}` : "";
}

// Distinct error types let callers tell network failures apart from server
// contract drift — important once analytics + retry logic land.
export class ApiNetworkError extends Error {
  constructor(
    public status: number,
    public statusText: string,
  ) {
    super(`Public API request failed: ${status} ${statusText}`);
    this.name = "ApiNetworkError";
  }
}

export class ApiSchemaError extends Error {
  constructor(
    public path: string,
    public cause: unknown,
  ) {
    super(`Public API response failed schema validation: ${path}`);
    this.name = "ApiSchemaError";
  }
}

// Default base URL: localhost in dev so a missing VITE_API_BASE_URL does not
// silently target prod. Production builds must set VITE_API_BASE_URL via the
// Vercel project env vars.
const DEFAULT_BASE_URL = import.meta.env.DEV
  ? "http://localhost:13001"
  : "https://api.lewis.health";

function getBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? DEFAULT_BASE_URL;
}

async function getJson<T>(path: string, schema: ZodType<T>, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    throw new ApiNetworkError(res.status, res.statusText);
  }
  const json = (await res.json()) as unknown;
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiSchemaError(path, parsed.error);
  }
  return parsed.data;
}

async function postJson<TBody, TResponse>(
  path: string,
  body: TBody,
  schema: ZodType<TResponse>,
  init?: RequestInit,
): Promise<TResponse> {
  return getJson(path, schema, {
    ...init,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export const publicApi = {
  /**
   * Programs catalog list — drives the homepage carousels + browse grid
   * once those slices migrate (slice 4). Returns every directory_published
   * program with summary metadata + ETC count via the SECURITY DEFINER
   * helper added in migration 0019.
   */
  listPrograms(options?: { signal?: AbortSignal; params?: ProgramListParams }) {
    return getJson(
      `/v1/public/programs${buildProgramListQuery(options?.params)}`,
      PublicProgramListResponse,
      {
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
  },
  /**
   * Faceted counts for the /browse filter rail. Same query params as
   * listPrograms; counts respect every OTHER active filter but not the
   * filter for the same facet (Amazon-style "what would the count be if I
   * added this value to the active filter"). See directoryprd.md § 33.1
   * "/browse filter rail wired".
   */
  getProgramFacets(options?: { signal?: AbortSignal; params?: ProgramListParams }) {
    return getJson(
      `/v1/public/programs/facets${buildProgramListQuery(options?.params)}`,
      PublicProgramFacets,
      {
        ...(options?.signal ? { signal: options.signal } : {}),
      },
    );
  },
  /**
   * Single program detail — primary clinician + SERP-arrival waypoint per
   * directoryprd.md § 15. Hydrates the full Clinical Evidence block:
   * citations, DOI, ETRB approval, ClinicalTrials.gov ID, mechanism summary,
   * key safety findings, plus the cost panel.
   */
  getProgram(slug: string, options?: { signal?: AbortSignal }) {
    return getJson(`/v1/public/programs/${encodeURIComponent(slug)}`, PublicProgramDetail, {
      ...(options?.signal ? { signal: options.signal } : {}),
    });
  },
  /**
   * Absolute URL of the server-rendered clinical brief PDF. The directory
   * frontend uses this as the href on the "Download clinical brief" CTA;
   * the browser hits the API directly with no JS, so the user gets a real
   * file download (not a popup, not a fetch). Cached at the edge for 1h
   * with 24h stale-while-revalidate per directoryprd.md § 28.4.
   */
  briefPdfUrl(slug: string): string {
    return `${getBaseUrl()}/v1/public/programs/${encodeURIComponent(slug)}/brief.pdf`;
  },
  /**
   * ETC catalog list — drives the /etcs page (list + Mapbox map). One round
   * trip carries everything the index needs (lat/lng for pins, programCount
   * for list cards). See directoryprd.md § 16.1.
   */
  listEtcs(options?: { signal?: AbortSignal }) {
    return getJson("/v1/public/etcs", PublicEtcListResponse, {
      ...(options?.signal ? { signal: options.signal } : {}),
    });
  },
  getEtc(slug: string, options?: { signal?: AbortSignal }) {
    return getJson(`/v1/public/etcs/${encodeURIComponent(slug)}`, PublicEtcDetail, {
      ...(options?.signal ? { signal: options.signal } : {}),
    });
  },
  /**
   * Marketing-subscription signup (slice 4 § 11.2 / 11.9). Single-shot POST
   * against the public-marketing domain. The API enqueues a Resend
   * confirmation email via the notifications worker queue; this call only
   * acks that the row was persisted. UX: render "check your email" on
   * success, error inline on 400/5xx.
   */
  subscribeMarketing(payload: MarketingSubscriptionRequest) {
    return postJson("/v1/public/marketing-subscriptions", payload, MarketingSubscriptionResponse);
  },
  confirmMarketing(token: string, options?: { signal?: AbortSignal }) {
    return getJson(
      `/v1/public/marketing-subscriptions/confirm?token=${encodeURIComponent(token)}`,
      MarketingConfirmResponse,
      { ...(options?.signal ? { signal: options.signal } : {}) },
    );
  },
  unsubscribeMarketing(token: string, options?: { signal?: AbortSignal }) {
    return getJson(
      `/v1/public/marketing-subscriptions/unsubscribe?token=${encodeURIComponent(token)}`,
      MarketingUnsubscribeResponse,
      { ...(options?.signal ? { signal: options.signal } : {}) },
    );
  },
  startEligibility(programSlug: string) {
    return getJson(
      `/v1/public/eligibility/${encodeURIComponent(programSlug)}/start`,
      EligibilityStartResponse,
      { method: "POST" },
    );
  },
  submitEligibilityAnswers(sessionToken: string, body: EligibilityAnswersRequest) {
    return getJson(
      `/v1/public/eligibility/sessions/${encodeURIComponent(sessionToken)}/answers`,
      EligibilityCompleteResponse,
      { method: "POST", body: JSON.stringify(body) },
    );
  },
  completeEligibility(sessionToken: string) {
    return getJson(
      `/v1/public/eligibility/sessions/${encodeURIComponent(sessionToken)}/complete`,
      EligibilityCompleteResponse,
      { method: "POST" },
    );
  },
  submitConnectRequest(payload: ConnectRequestPayload) {
    return getJson(`/v1/public/connect-requests`, ConnectRequestResponse, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  /**
   * Public directory search. Sectioned response, condition-first ordering
   * enforced server-side. The optional AbortSignal lets the overlay's
   * live-suggest cancel an in-flight request when the user types again.
   */
  searchPublic(
    q: string,
    options?: { type?: "treatment" | "condition" | "etc"; signal?: AbortSignal },
  ) {
    const params = new URLSearchParams({ q });
    if (options?.type) params.set("type", options.type);
    return getJson(`/v1/public/search?${params.toString()}`, PublicSearchResponse, {
      ...(options?.signal ? { signal: options.signal } : {}),
    });
  },
  /**
   * Conditions catalog list — primary patient browse surface per
   * directoryprd.md § 14. Returns every published condition with a
   * count of directory_published linked programs. AbortSignal lets the
   * index page cancel a pending request on unmount.
   */
  listConditions(options?: { signal?: AbortSignal }) {
    return getJson("/v1/public/conditions", PublicConditionListResponse, {
      ...(options?.signal ? { signal: options.signal } : {}),
    });
  },
  /**
   * Single condition detail — primary patient waypoint per § 14.2.
   * Hydrates linked directory_published programs in one call.
   */
  getCondition(slug: string, options?: { signal?: AbortSignal }) {
    return getJson(`/v1/public/conditions/${encodeURIComponent(slug)}`, PublicConditionDetail, {
      ...(options?.signal ? { signal: options.signal } : {}),
    });
  },
};

// Semi-authenticated endpoint: requires a Clerk session via the .lewis.health
// cookie. Called once, immediately after Clerk SignUp completes, to attach the
// anonymous screen result to the new patient user record.
export async function linkAnonymousScreen(
  bearerToken: string,
  body: LinkAnonymousScreenRequest,
): Promise<LinkAnonymousScreenResponse> {
  return getJson("/v1/patient/account/link-anonymous-screen", LinkAnonymousScreenResponse, {
    method: "POST",
    headers: { authorization: `Bearer ${bearerToken}` },
    body: JSON.stringify(body),
  });
}
