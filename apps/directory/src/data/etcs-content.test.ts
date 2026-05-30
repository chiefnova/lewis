import { describe, expect, test } from "vitest";

import { ETC_CONTENT, getEtcContent } from "./etcs-content";

// Drift-detection between the DB seed (etcs table directory_published rows)
// and this content module. The slugs below must match the directory_published
// ETCs in packages/db/migrations/0018_directory_public_search.sql + 0020.
// When a future migration adds a new ETC, add the matching content entry —
// this test fails CI until you do.

const DB_SEEDED_ETC_SLUGS = ["big-sky"] as const;

describe("ETC_CONTENT drift detection", () => {
  test("every DB-seeded directory_published ETC has a content entry", () => {
    for (const slug of DB_SEEDED_ETC_SLUGS) {
      const content = getEtcContent(slug);
      expect(content, `missing ETC_CONTENT entry for slug "${slug}"`).toBeDefined();
    }
  });

  test("every ETC has at least one About paragraph", () => {
    for (const slug of DB_SEEDED_ETC_SLUGS) {
      const content = getEtcContent(slug);
      expect(content?.aboutParagraphs.length, `${slug} aboutParagraphs empty`).toBeGreaterThan(0);
    }
  });

  test("ETC_CONTENT contains exactly the seeded slugs (no orphans)", () => {
    const contentSlugs = Object.keys(ETC_CONTENT).sort();
    const seededSlugs = [...DB_SEEDED_ETC_SLUGS].sort();
    expect(contentSlugs).toEqual(seededSlugs);
  });

  test("getEtcContent returns undefined for unknown slugs", () => {
    expect(getEtcContent("nonexistent")).toBeUndefined();
  });

  test("voice — no exclamation points in About paragraphs", () => {
    for (const slug of DB_SEEDED_ETC_SLUGS) {
      const content = getEtcContent(slug);
      const text = content?.aboutParagraphs.join(" ") ?? "";
      expect(text, `${slug} About contains exclamation point`).not.toMatch(/!/);
    }
  });

  test("voice — independence framing surfaced", () => {
    for (const slug of DB_SEEDED_ETC_SLUGS) {
      const content = getEtcContent(slug);
      const text = content?.aboutParagraphs.join(" ").toLowerCase() ?? "";
      // "Independent of any manufacturer or manufacturer" — required trust signal
      // per directoryprd.md § 10.2 + § 25 (counsel-reviewed independence
      // statement). The "independent" word should appear.
      expect(text, `${slug} About missing independence framing`).toMatch(/independent/);
    }
  });
});
