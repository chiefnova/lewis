import { describe, expect, test } from "vitest";

import {
  FEATURED_COMING_SOON_CONDITION_SLUG,
  FEATURED_CONDITION_SLUGS,
} from "./featured-conditions";

// Drift detection — the FeaturedConditions homepage carousel slug list
// (slice 4 § 11.4) must stay in sync with the conditions seeded in
// packages/db/migrations/0018_directory_public_search.sql. The four PN
// conditions are LIVE and seeded as published+state='live'. PTSD is the
// muted "coming soon" card — seeded as published+state='coming_soon'.

// Slugs seeded as state='live' in 0018.
const DB_SEEDED_LIVE_CONDITION_SLUGS = [
  "diabetic-peripheral-neuropathy",
  "chemotherapy-induced-peripheral-neuropathy",
  "hiv-induced-peripheral-neuropathy",
  "idiopathic-peripheral-neuropathy",
] as const;

// Slug seeded as state='coming_soon' in 0018.
const DB_SEEDED_COMING_SOON_CONDITION_SLUG = "ptsd";

describe("FEATURED_CONDITION_SLUGS drift detection", () => {
  test("every featured slug exists in the DB seed as a live condition", () => {
    for (const slug of FEATURED_CONDITION_SLUGS) {
      expect(
        DB_SEEDED_LIVE_CONDITION_SLUGS,
        `featured slug "${slug}" is not seeded as a live condition`,
      ).toContain(slug);
    }
  });

  test("FEATURED_CONDITION_SLUGS has exactly 4 entries (slice 4 § 11.4 launch state)", () => {
    expect(FEATURED_CONDITION_SLUGS).toHaveLength(4);
  });

  test("featured coming-soon slug exists in the DB seed as state=coming_soon", () => {
    expect(FEATURED_COMING_SOON_CONDITION_SLUG).toBe(DB_SEEDED_COMING_SOON_CONDITION_SLUG);
  });

  test("featured slugs do not collide with the coming-soon slug", () => {
    expect(FEATURED_CONDITION_SLUGS as readonly string[]).not.toContain(
      FEATURED_COMING_SOON_CONDITION_SLUG,
    );
  });
});
