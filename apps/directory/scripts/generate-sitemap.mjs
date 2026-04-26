// Sitemap generator. Run via `pnpm --filter directory build:sitemap` once the
// public catalog endpoint is live so the slug list comes from the API; until
// then it reads the static seed in src/data/catalog.tsx via a regex (we don't
// want to pull TSX into a Node script).
//
// Output: apps/directory/public/sitemap.xml — Vite copies it verbatim into the
// build output so Vercel serves it from corridor.health/sitemap.xml.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const CATALOG_PATH = resolve(ROOT, "src/data/catalog.tsx");
const OUT = resolve(ROOT, "public/sitemap.xml");

const SITE = "https://corridor.health";

const STATIC_PATHS = [
  "/",
  "/browse",
  "/conditions",
  "/etcs",
  "/how-it-works",
  "/faq",
  "/for-etcs",
  "/for-sponsors",
  "/privacy",
  "/terms",
  "/cookies",
];

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

function urlEntry(path) {
  return `  <url>\n    <loc>${SITE}${path}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`;
}

const lines = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ...STATIC_PATHS.map(urlEntry),
  ...programSlugs.map((s) => urlEntry(`/programs/${s}`)),
  ...etcSlugs.map((s) => urlEntry(`/etcs/${s}`)),
  `</urlset>`,
];

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, lines.join("\n"), "utf8");
console.log(`wrote ${OUT}`);
