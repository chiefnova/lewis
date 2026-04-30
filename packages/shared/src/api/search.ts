import { z } from "zod";

import { cursorPage } from "./pagination.js";

export const SearchQueryParams = z.object({
  q: z.string().trim().min(1).max(200),
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type SearchQueryParams = z.infer<typeof SearchQueryParams>;

export const SearchResponse = z.object({
  query: z.string(),
  ...cursorPage(z.unknown()).shape,
});
export type SearchResponse = z.infer<typeof SearchResponse>;

// ---------------------------------------------------------------------------
// Public directory search (anonymous, condition-first sectioned response).
// See docs/directoryprd.md § 13 and plans/immutable-squishing-sprout.md.
// ---------------------------------------------------------------------------

export const PublicSearchQueryParams = z.object({
  q: z.string().trim().min(1).max(200),
  type: z.enum(["treatment", "condition", "etc"]).optional(),
});
export type PublicSearchQueryParams = z.infer<typeof PublicSearchQueryParams>;

export const ConditionState = z.enum(["live", "coming_soon", "not_offered"]);
export type ConditionState = z.infer<typeof ConditionState>;

export const PublicSearchConditionHit = z.object({
  type: z.literal("condition"),
  slug: z.string(),
  name: z.string(),
  state: ConditionState,
  programCount: z.number().int().nonnegative(),
  href: z.string(),
});
export type PublicSearchConditionHit = z.infer<typeof PublicSearchConditionHit>;

export const PublicSearchTreatmentHit = z.object({
  type: z.literal("treatment"),
  slug: z.string(),
  name: z.string(),
  drug: z.string().nullable(),
  manufacturer: z.string().nullable(),
  available: z.boolean(),
  href: z.string(),
});
export type PublicSearchTreatmentHit = z.infer<typeof PublicSearchTreatmentHit>;

export const PublicSearchEtcHit = z.object({
  type: z.literal("etc"),
  slug: z.string(),
  name: z.string(),
  city: z.string().nullable(),
  href: z.string(),
});
export type PublicSearchEtcHit = z.infer<typeof PublicSearchEtcHit>;

export const PublicSearchResponse = z.object({
  query: z.string(),
  sections: z.object({
    conditions: z.array(PublicSearchConditionHit),
    treatments: z.array(PublicSearchTreatmentHit),
    etcs: z.array(PublicSearchEtcHit),
  }),
  totals: z.object({
    conditions: z.number().int().nonnegative(),
    treatments: z.number().int().nonnegative(),
    etcs: z.number().int().nonnegative(),
  }),
});
export type PublicSearchResponse = z.infer<typeof PublicSearchResponse>;
