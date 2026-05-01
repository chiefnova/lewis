import { describe, expect, test } from "vitest";

import { PROGRAM_CONTENT, getProgramContent } from "./programs-content";

// Drift-detection between the DB seed (programs table) and this content
// module. The slugs below must match the directory_published programs in
// packages/db/migrations/0018_directory_public_search.sql + 0019. When a
// future migration adds a new program, add the matching content entry —
// this test fails CI until you do.

const DB_SEEDED_PROGRAM_SLUGS = ["wst-057"] as const;

describe("PROGRAM_CONTENT drift detection", () => {
  test("every DB-seeded directory_published program has a content entry", () => {
    for (const slug of DB_SEEDED_PROGRAM_SLUGS) {
      const content = getProgramContent(slug);
      expect(content, `missing PROGRAM_CONTENT entry for slug "${slug}"`).toBeDefined();
    }
  });

  test("every program has the required prose blocks", () => {
    for (const slug of DB_SEEDED_PROGRAM_SLUGS) {
      const content = getProgramContent(slug);
      expect(content?.aboutSummary, `${slug} missing aboutSummary`).toBeTruthy();
      expect(content?.aboutParagraphs.length, `${slug} aboutParagraphs empty`).toBeGreaterThan(0);
      expect(content?.whoThisIsForIntro, `${slug} missing whoThisIsForIntro`).toBeTruthy();
    }
  });

  test("PROGRAM_CONTENT contains exactly the seeded slugs (no orphans)", () => {
    const contentSlugs = Object.keys(PROGRAM_CONTENT).sort();
    const seededSlugs = [...DB_SEEDED_PROGRAM_SLUGS].sort();
    expect(contentSlugs).toEqual(seededSlugs);
  });

  test("getProgramContent returns undefined for unknown slugs", () => {
    expect(getProgramContent("nonexistent")).toBeUndefined();
  });
});
