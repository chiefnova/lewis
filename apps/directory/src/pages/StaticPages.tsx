import { useNavigate, useParams } from "react-router-dom";
import { useSeo, siteUrl } from "../seo/useSeo";

interface PlaceholderProps {
  title: string;
  path: string;
  body: string;
  description?: string;
}

function StaticShell({ title, path, body, description }: PlaceholderProps) {
  useSeo({
    title: `${title} — Lewis Health`,
    canonical: siteUrl(path),
    description: description ?? body,
  });
  const navigate = useNavigate();
  return (
    <div className="fade-up" style={{ padding: "120px 0 160px" }}>
      <div className="container-narrow">
        <h1
          className="serif"
          style={{
            fontSize: "clamp(2.4rem, 5vw, 3.6rem)",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            marginBottom: 28,
          }}
        >
          {title}
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 17, lineHeight: 1.65, marginBottom: 36 }}>
          {body}
        </p>
        <p
          style={{ fontSize: 13, color: "var(--ink-soft)", fontStyle: "italic", marginBottom: 36 }}
        >
          [COUNSEL REVIEW] — final copy pending. This page is a route placeholder so cross-links
          from the footer and treatment pages don't 404.
        </p>
        <button onClick={() => navigate("/")} className="pill pill-outline">
          Back to home
        </button>
      </div>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <StaticShell
      title="Privacy"
      path="/privacy"
      body="Lewis is a HIPAA Business Associate. The directory itself is anonymous to browse — no account is required and no PHI is collected on this site. PHI is only collected after you connect with a licensed ETC, on the patient.lewis.health portal."
    />
  );
}

export function TermsPage() {
  return (
    <StaticShell
      title="Terms"
      path="/terms"
      body="Use of the Lewis directory is governed by these terms. Treatments listed are investigational and delivered by licensed Montana Experimental Treatment Centers under SB 535 and MAR 2026-427.1."
    />
  );
}

export function CookiesPage() {
  return (
    <StaticShell
      title="Cookies"
      path="/cookies"
      body="The directory uses essential cookies only. We do not place advertising or third-party tracking cookies."
    />
  );
}

export function FeedbackPage() {
  return (
    <StaticShell
      title="Share feedback"
      path="/feedback"
      body="If you've worked with an ETC through Lewis, we'd like to hear how it went. We read every message."
    />
  );
}

// ForEtcsPage moved to apps/directory/src/pages/ForEtcsPage.tsx in slice 5
// — it's now a real page with the ETRB callout, RULE-by-RULE compliance
// coverage table, recurring deadlines table, and "How to get started"
// rail per directoryprd.md § 22. No longer a StaticShell stub.

// ForManufacturersPage moved to apps/directory/src/pages/ForManufacturersPage.tsx
// in slice 5 — it's now a real page with the two-paths analytical
// comparison table per directoryprd.md § 21. No longer a StaticShell stub.

export function HowItWorksPage() {
  return (
    <StaticShell
      title="How it works"
      path="/how-it-works"
      body="Three steps: find a treatment for your condition, connect with the licensed ETC offering it, and work with their clinical team to enroll. No account required to browse."
    />
  );
}

// AboutPage moved to apps/directory/src/pages/AboutPage.tsx in slice 5 —
// it's now a real page with the Corps of Discovery + Lewisia rediviva
// founding story, the team-collective voice, and contacts surfaced
// twice (in-letter strip + sticky-rail card). /design-shotgun Round 7
// winner: variant C · Letter from the team.

// PlatformPage moved to apps/directory/src/pages/ForPlatformPage.tsx in
// slice 5 — it's now a real page with the connecting-tissue narrative,
// 12-row handoffs table, compliance mapping, and security posture per
// /design-shotgun Round 6.

// ForCliniciansPage moved to apps/directory/src/pages/ForCliniciansPage.tsx
// in slice 5 — it's now a real page with counsel-grade legal copy per
// directoryprd.md § 20. No longer a StaticShell stub.

export function FaqPage() {
  return (
    <StaticShell
      title="Frequently asked questions"
      path="/faq"
      body="Common questions from patients, treating clinicians, and ETC staff. The homepage FAQ section is the canonical source; this dedicated page is for direct linking and longer-form answers."
    />
  );
}

export function NotFoundPage() {
  return (
    <StaticShell
      title="Page not found"
      path="/404"
      body="The page you're looking for isn't here. The directory is intentionally narrow — most useful routes start at the homepage or the browse catalog."
    />
  );
}

// ConditionsIndexPage now lives at apps/directory/src/pages/conditions/ConditionsIndexPage.tsx
// (replaced the StaticShell placeholder in Slice 2 — directoryprd.md § 14).

// EtcsIndexPage moved to its own module (apps/directory/src/pages/EtcsIndexPage.tsx)
// in slice 4 — it's now a real API-driven page, no longer a StaticShell stub.

// § 16.4 — `ae-summary` removed; folded into the ETRB annual report. Only the
// manual + etrb-report documents remain.
export function EtcDocumentPage({ kind }: { kind: "manual" | "etrb-report" }) {
  const { slug = "" } = useParams<{ slug: string }>();
  const titles: Record<typeof kind, string> = {
    manual: "Policy & Procedures Manual",
    "etrb-report": "ETRB Annual Report",
  };
  return (
    <StaticShell
      title={titles[kind]}
      path={`/etcs/${slug}/${kind}`}
      body="ETC public documents are surfaced here in HTML and downloadable PDF form once auto-rendered from app.lewis.health. Versions are immutable; new revisions create a new version, never overwrite."
    />
  );
}
