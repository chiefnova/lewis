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
  PublicConditionDetail,
  PublicConditionListResponse,
  PublicEtcDetail,
  PublicProgramDetail,
  PublicProgramListResponse,
} from "@lewis/shared/api/public";
import { PublicSearchResponse } from "@lewis/shared/api/search";
import type { ZodType } from "zod";

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

export const publicApi = {
  listPrograms() {
    return getJson("/v1/public/programs", PublicProgramListResponse);
  },
  getProgram(slug: string) {
    return getJson(`/v1/public/programs/${encodeURIComponent(slug)}`, PublicProgramDetail);
  },
  getEtc(slug: string) {
    return getJson(`/v1/public/etcs/${encodeURIComponent(slug)}`, PublicEtcDetail);
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
