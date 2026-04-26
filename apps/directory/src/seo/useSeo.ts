import { useEffect } from "react";

interface SeoOptions {
  title: string;
  description?: string | undefined;
  canonical?: string | undefined;
  jsonLd?: Record<string, unknown> | undefined;
  ogImage?: string | undefined;
}

const JSON_LD_ID = "lewis-jsonld";

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  const selector = `meta[${attr}="${name}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

/**
 * Mutates document.head with SEO metadata for the active route. SSR/SSG can
 * be added later; for now this is a runtime hook that keeps tags in sync as
 * the user navigates. Crawlers that execute JS (Googlebot, Bingbot) read these
 * just fine — the SSG follow-up (vite-plugin-ssr or similar) will pre-bake
 * them into the static HTML for crawlers that don't.
 */
export function useSeo({ title, description, canonical, jsonLd, ogImage }: SeoOptions) {
  useEffect(() => {
    document.title = title;
    if (description) {
      setMeta("description", description);
      setMeta("og:description", description, "property");
      setMeta("twitter:description", description);
    }
    setMeta("og:title", title, "property");
    setMeta("twitter:title", title);
    setMeta("twitter:card", "summary_large_image");
    setMeta("og:site_name", "Lewis Health", "property");
    setMeta("og:locale", "en_US", "property");
    if (canonical) setLink("canonical", canonical);
    if (canonical) setMeta("og:url", canonical, "property");
    if (ogImage) {
      setMeta("og:image", ogImage, "property");
      setMeta("twitter:image", ogImage);
    }

    if (jsonLd) {
      let el = document.head.querySelector<HTMLScriptElement>(`script#${JSON_LD_ID}`);
      if (!el) {
        el = document.createElement("script");
        el.id = JSON_LD_ID;
        el.type = "application/ld+json";
        document.head.appendChild(el);
      }
      el.textContent = JSON.stringify(jsonLd);
    } else {
      const existing = document.head.querySelector(`script#${JSON_LD_ID}`);
      if (existing) existing.remove();
    }
  }, [title, description, canonical, jsonLd, ogImage]);
}

export const SITE_URL = "https://lewis.health";

export function siteUrl(path: string) {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
