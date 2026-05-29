/**
 * Slice 4 § 11.4 / 11.4b — homepage FeaturedConditions carousel slug list.
 *
 * The carousel renders 4 LIVE peripheral-neuropathy condition cards (each
 * sub-lined "Available now via WST-057® at Big Sky ETC, Bozeman") + 1 muted
 * "Coming soon for PTSD" card foreshadowing Phase 2 manufacturer onboarding.
 * Each live card links to /conditions/:slug; the muted card links to
 * /conditions/ptsd (state=coming_soon, renders graceful fallback).
 *
 * The drift test in featured-conditions.test.ts asserts every slug listed
 * here exists in the seeded conditions catalog as directory_published=true.
 * Removing a condition from the seed without updating this list fails CI.
 *
 * As Phase 2 conditions land in production, the steady state is:
 *   - Replace `ptsd` in FEATURED_COMING_SOON_CONDITION_SLUG with the next
 *     coming-soon condition (or set to `null` and update the carousel
 *     component to omit the muted card).
 *   - Add the newly-live PTSD slug to FEATURED_CONDITION_SLUGS.
 */

export const FEATURED_CONDITION_SLUGS = [
  "diabetic-peripheral-neuropathy",
  "chemotherapy-induced-peripheral-neuropathy",
  "hiv-induced-peripheral-neuropathy",
  "idiopathic-peripheral-neuropathy",
] as const;

export type FeaturedConditionSlug = (typeof FEATURED_CONDITION_SLUGS)[number];

export const FEATURED_COMING_SOON_CONDITION_SLUG = "ptsd" as const;
