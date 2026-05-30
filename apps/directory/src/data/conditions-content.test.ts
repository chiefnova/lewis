import { describe, expect, test } from "vitest";

import { CONDITION_CONTENT, getConditionContent } from "./conditions-content";

// Drift-detection between the DB seed (conditions table) and this content
// module. The slugs below must match packages/db/migrations/0018_directory_public_search.sql
// § 7f exactly. When a future migration adds a new condition, add the matching
// content entry — this test will fail CI until you do.

const DB_SEEDED_SLUGS = [
  // 4 PN indications (live)
  "diabetic-peripheral-neuropathy",
  "chemotherapy-induced-peripheral-neuropathy",
  "hiv-induced-peripheral-neuropathy",
  "idiopathic-peripheral-neuropathy",
  // PTSD (coming_soon)
  "ptsd",
  // 4 long-tail (not_offered)
  "als",
  "multiple-sclerosis",
  "rare-cancers",
  "autoimmune-diseases",
] as const;

const LIVE_OR_COMING_SOON_SLUGS = [
  "diabetic-peripheral-neuropathy",
  "chemotherapy-induced-peripheral-neuropathy",
  "hiv-induced-peripheral-neuropathy",
  "idiopathic-peripheral-neuropathy",
  "ptsd",
] as const;

describe("CONDITION_CONTENT drift detection", () => {
  test("every DB-seeded slug has a content entry", () => {
    for (const slug of DB_SEEDED_SLUGS) {
      const content = getConditionContent(slug);
      expect(content, `missing CONDITION_CONTENT entry for slug "${slug}"`).toBeDefined();
    }
  });

  test("every live + coming_soon condition has explainer + standardOfCare", () => {
    for (const slug of LIVE_OR_COMING_SOON_SLUGS) {
      const content = getConditionContent(slug);
      expect(content?.explainer, `${slug} missing explainer`).toBeDefined();
      expect(content?.standardOfCare, `${slug} missing standardOfCare`).toBeDefined();
    }
  });

  test("explainer source URLs are valid absolute URLs", () => {
    for (const slug of DB_SEEDED_SLUGS) {
      const content = getConditionContent(slug);
      if (!content?.explainer) continue;
      const { sourceUrl, sourceLabel } = content.explainer;
      expect(sourceUrl, `${slug} explainer missing sourceUrl`).toBeTruthy();
      expect(sourceLabel, `${slug} explainer missing sourceLabel`).toBeTruthy();
      expect(() => new URL(sourceUrl)).not.toThrow();
    }
  });

  test("standard-of-care source URLs are valid absolute URLs", () => {
    for (const slug of LIVE_OR_COMING_SOON_SLUGS) {
      const content = getConditionContent(slug);
      const soc = content?.standardOfCare;
      expect(soc, `${slug} missing standardOfCare`).toBeDefined();
      if (!soc) continue;
      expect(() => new URL(soc.sourceUrl)).not.toThrow();
      expect(soc.sourceLabel).toBeTruthy();
      expect(soc.intro).toBeTruthy();
      expect(soc.closing).toBeTruthy();
      expect(soc.treatments.length).toBeGreaterThan(0);
    }
  });

  test("standard-of-care closing always references RULE 12(2)(f) and § 50-12-104", () => {
    for (const slug of LIVE_OR_COMING_SOON_SLUGS) {
      const content = getConditionContent(slug);
      const soc = content?.standardOfCare;
      if (!soc) continue;
      expect(soc.closing, `${slug} closing missing RULE 12(2)(f) reference`).toContain(
        "RULE 12(2)(f)",
      );
      expect(soc.closing, `${slug} closing missing § 50-12-104 reference`).toContain("§ 50-12-104");
    }
  });

  test("sidebar advocacyOrgs urls (when present) are valid absolute URLs", () => {
    for (const slug of DB_SEEDED_SLUGS) {
      const content = getConditionContent(slug);
      const orgs = content?.sidebar?.advocacyOrgs;
      if (!orgs) continue;
      for (const org of orgs) {
        expect(() => new URL(org.url)).not.toThrow();
        expect(org.name).toBeTruthy();
      }
    }
  });

  test("CONDITION_CONTENT contains exactly the 9 seeded slugs (no orphans)", () => {
    const contentSlugs = Object.keys(CONDITION_CONTENT).sort();
    const seededSlugs = [...DB_SEEDED_SLUGS].sort();
    expect(contentSlugs).toEqual(seededSlugs);
  });
});
