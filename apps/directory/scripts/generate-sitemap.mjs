// Sitemap generator. Run via `pnpm --filter directory build:sitemap` (chained
// after `tsc` and before `vite build` in the directory `build` script).
// Programs + ETCs are still extracted by regex from the static seed in
// src/data/catalog.tsx; conditions are kept here as the canonical list since
// catalog.tsx no longer carries CONDITIONS post-Slice-2 (the runtime reads
// from /v1/public/conditions). See plans/immutable-squishing-sprout.md
// architecture decision 1.
//
// When a new condition lands: add a migration (DB seed), add a content entry
// in src/data/conditions-content.ts, and add the slug below. The
// conditions-content drift test catches missing content; this generator
// catches missing sitemap entries (a missing slug here ships a 0-priority
// gap on the SEO surface, which is what we're trying to prevent).
//
// Output: apps/directory/public/sitemap.xml — Vite copies it verbatim into
// the build output so Vercel serves it from lewis.health/sitemap.xml.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const CATALOG_PATH = resolve(ROOT, "src/data/catalog.tsx");
const OUT = resolve(ROOT, "public/sitemap.xml");

const SITE = "https://lewis.health";

const STATIC_PATHS = [
  "/",
  "/browse",
  "/conditions",
  "/etcs",
  "/how-it-works",
  "/about",
  "/faq",
  "/for-clinicians",
  "/for-etcs",
  "/for-manufacturers",
  "/platform",
  "/privacy",
  "/terms",
  "/cookies",
];

// Condition slugs grouped by state. Priority follows the directoryprd.md § 26.2
// SEO weighting: live > coming_soon > not_offered. Live PN indications carry
// 0.8 (the patient-facing destinations from Google SERP arrivals), coming_soon
// 0.7, not_offered 0.5.
const CONDITION_SLUGS_BY_STATE = {
  live: [
    "diabetic-peripheral-neuropathy",
    "chemotherapy-induced-peripheral-neuropathy",
    "hiv-induced-peripheral-neuropathy",
    "idiopathic-peripheral-neuropathy",
  ],
  coming_soon: ["ptsd"],
  not_offered: ["als", "multiple-sclerosis", "rare-cancers", "autoimmune-diseases"],
};

const STATE_PRIORITY = {
  live: "0.8",
  coming_soon: "0.7",
  not_offered: "0.5",
};

const catalog = readFileSync(CATALOG_PATH, "utf8");

// CATALOG and ETCS are both arrays with `slug:` fields, so a flat regex
// can't tell them apart. Extract by section: each section starts at the
// `export const NAME` declaration and ends at the closing `];`.
function extractSlugs(source, declName) {
  const start = source.indexOf(`export const ${declName}`);
  if (start === -1) return [];
  // Find the array close — first `];` after a `[`. Good enough for our
  // hand-authored fixture file. Don't reach for an AST parser yet.
  const arrStart = source.indexOf("[", start);
  const arrEnd = source.indexOf("];", arrStart);
  const block = source.slice(arrStart, arrEnd);
  const slugs = new Set();
  const re = /slug:\s*"([a-z0-9-]+)"/g;
  let m;
  while ((m = re.exec(block)) !== null) slugs.add(m[1]);
  return [...slugs];
}

const programSlugs = extractSlugs(catalog, "CATALOG").filter((s) => !s.startsWith("soon-"));
const etcSlugs = extractSlugs(catalog, "ETCS");

const today = new Date().toISOString().slice(0, 10);

function urlEntry(path, priority) {
  const priorityLine = priority ? `\n    <priority>${priority}</priority>` : "";
  return `  <url>\n    <loc>${SITE}${path}</loc>\n    <lastmod>${today}</lastmod>${priorityLine}\n  </url>`;
}

const conditionEntries = Object.entries(CONDITION_SLUGS_BY_STATE).flatMap(([state, slugs]) =>
  slugs.map((slug) => urlEntry(`/conditions/${slug}`, STATE_PRIORITY[state])),
);

const lines = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ...STATIC_PATHS.map((p) => urlEntry(p)),
  ...programSlugs.map((s) => urlEntry(`/programs/${s}`)),
  ...etcSlugs.map((s) => urlEntry(`/etcs/${s}`)),
  ...conditionEntries,
  `</urlset>`,
];

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, lines.join("\n"), "utf8");
console.log(`wrote ${OUT}`);
