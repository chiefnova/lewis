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

export function ForEtcsPage() {
  return (
    <StaticShell
      title="For ETCs"
      path="/for-etcs"
      body="Lewis is the operating platform for Montana's Experimental Treatment Center regime. Licensed ETCs use Lewis to manage their P&P manual, ETRB, patient intake, adverse-event reporting, and annual filings."
    />
  );
}

export function ForSponsorsPage() {
  return (
    <StaticShell
      title="For Sponsors"
      path="/for-sponsors"
      body="Drug manufacturers can list their investigational programs in the Lewis directory once a licensed Montana ETC is offering them. Listing is free; Lewis charges per enrolled patient via the operating platform."
    />
  );
}

export function HowItWorksPage() {
  return (
    <StaticShell
      title="How it works"
      path="/how-it-works"
      body="Three steps: find a treatment for your condition, connect with the licensed ETC offering it, and work with their clinical team to enroll. No account required to browse."
    />
  );
}

export function FaqPage() {
  return (
    <StaticShell
      title="Frequently asked questions"
      path="/faq"
      body="Common questions from patients, treating physicians, and ETC staff. The homepage FAQ section is the canonical source; this dedicated page is for direct linking and longer-form answers."
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

export function EtcsIndexPage() {
  return (
    <StaticShell
      title="Experimental Treatment Centers"
      path="/etcs"
      body="Index of all licensed Montana Experimental Treatment Centers. The launch ETC is in Bozeman; additional centers will appear here as they are licensed by DPHHS."
    />
  );
}

export function EtcDocumentPage({ kind }: { kind: "manual" | "etrb-report" | "ae-summary" }) {
  const { slug = "" } = useParams<{ slug: string }>();
  const titles: Record<typeof kind, string> = {
    manual: "Policy & Procedures Manual",
    "etrb-report": "ETRB Annual Report",
    "ae-summary": "Adverse Event Summary",
  };
  return (
    <StaticShell
      title={titles[kind]}
      path={`/etcs/${slug}/${kind}`}
      body="ETC public documents are surfaced here in HTML and downloadable PDF form. Versions are immutable; new revisions create a new version, never overwrite. [COUNSEL REVIEW] — confirm the rendering policy for redacted patient identifiers in AE summaries (RULE 16(6)(c))."
    />
  );
}
