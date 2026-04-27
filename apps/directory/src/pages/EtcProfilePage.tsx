import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { getEtcBySlug, getProgramBySlug } from "../data/catalog";
import { ArrowLeft, ArrowRight, PinIcon } from "../components/icons";
import { TopicalTube } from "../components/Products";
import { Panel } from "../components/Panel";
import { useSeo, siteUrl } from "../seo/useSeo";

function MapPlaceholder({ city }: { city: string }) {
  return (
    <svg viewBox="0 0 400 300" width="80%" style={{ maxWidth: 480 }} aria-hidden="true">
      <rect x="40" y="40" width="320" height="220" fill="var(--paper-card)" stroke="var(--rule)" />
      <path
        d="M40 80 L360 80 M40 130 L360 130 M40 180 L360 180 M40 230 L360 230"
        stroke="var(--rule)"
        strokeDasharray="2 4"
        strokeWidth="0.5"
      />
      <path
        d="M100 40 L100 260 M180 40 L180 260 M260 40 L260 260"
        stroke="var(--rule)"
        strokeDasharray="2 4"
        strokeWidth="0.5"
      />
      <path
        d="M60 120 Q120 100 180 130 T340 140 L360 145 L360 220 L40 220 L40 130 Z"
        fill="var(--paper-deep)"
        stroke="var(--rule)"
        strokeWidth="0.8"
        opacity="0.6"
      />
      <text
        x="200"
        y="280"
        textAnchor="middle"
        fontFamily="var(--serif)"
        fontSize="11"
        fill="var(--ink-soft)"
        fontStyle="italic"
      >
        {city}, Montana
      </text>
      <circle cx="200" cy="160" r="5" fill="var(--accent)" />
      <circle
        cx="200"
        cy="160"
        r="14"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1"
        opacity="0.4"
      />
    </svg>
  );
}

export function EtcProfilePage() {
  const { slug = "big-sky" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const etc = getEtcBySlug(slug);
  const offeredProgram = etc ? getProgramBySlug(etc.programs[0] ?? "") : undefined;

  useSeo({
    title: etc ? `${etc.name} — Lewis Health` : "ETC not found — Lewis Health",
    description: etc
      ? `${etc.name} is a licensed Montana Experimental Treatment Center in ${etc.city}, ${etc.state}. License #${etc.licenseNumber}.`
      : undefined,
    canonical: etc ? siteUrl(`/etcs/${etc.slug}`) : siteUrl("/etcs"),
    jsonLd: etc
      ? {
          "@context": "https://schema.org",
          "@type": "MedicalClinic",
          name: etc.name,
          address: {
            "@type": "PostalAddress",
            streetAddress: etc.address[0],
            addressLocality: etc.city,
            addressRegion: etc.state,
          },
          telephone: etc.phone,
          medicalSpecialty: ["Neurology", "Pain Medicine"],
        }
      : undefined,
  });

  useEffect(() => {
    if (!etc) navigate("/etcs", { replace: true });
  }, [etc, navigate]);

  if (!etc) return null;

  return (
    <div className="fade-up split-detail">
      <div className="split-detail-art">
        <MapPlaceholder city={etc.city} />
      </div>
      <div className="split-detail-body">
        {offeredProgram && (
          <button
            onClick={() => navigate(`/programs/${offeredProgram.slug}`)}
            style={{
              fontSize: 13,
              color: "var(--ink-soft)",
              marginBottom: 28,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <ArrowLeft />
            Back to {offeredProgram.name}
          </button>
        )}
        <h1
          className="serif"
          style={{
            fontSize: 48,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            marginBottom: 10,
            fontWeight: 400,
          }}
        >
          {etc.name}
        </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "var(--ink-soft)",
            fontSize: 14,
            marginBottom: 18,
          }}
        >
          <PinIcon /> {etc.city}, {etc.state}
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "var(--accent)",
            background: "var(--accent-bg)",
            padding: "7px 14px",
            borderRadius: 9999,
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 36,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />{" "}
          Licensed by Montana DPHHS · License #{etc.licenseNumber}
        </div>

        <Panel title="About.">
          <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.65 }}>{etc.about}</p>
        </Panel>

        <Panel title="Treatments offered.">
          {offeredProgram ? (
            <Link
              to={`/programs/${offeredProgram.slug}`}
              style={{
                display: "flex",
                gap: 16,
                padding: 16,
                background: "var(--paper)",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 100,
                  height: 100,
                  background: "var(--paper-deep)",
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <TopicalTube size={80} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="serif" style={{ fontSize: 19, marginBottom: 4 }}>
                  {offeredProgram.name}
                </div>
                <div style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 10 }}>
                  {offeredProgram.indication}
                </div>
                <div style={{ color: "var(--accent)", fontSize: 12.5, fontWeight: 500 }}>
                  ● Currently accepting new patients
                </div>
              </div>
            </Link>
          ) : (
            <p style={{ color: "var(--ink-soft)", fontSize: 14.5 }}>
              No active treatment programs at this time.
            </p>
          )}
        </Panel>

        <Panel title="Location and contact.">
          <address
            style={{ color: "var(--ink)", fontSize: 14.5, lineHeight: 1.7, fontStyle: "normal" }}
          >
            {etc.address.map((line) => (
              <div key={line}>{line}</div>
            ))}
            <div style={{ marginTop: 10 }}>
              <a className="link" href={`tel:${etc.phone.replace(/[^+0-9]/g, "")}`}>
                {etc.phone}
              </a>
            </div>
            <div style={{ color: "var(--ink-soft)", marginTop: 10, fontSize: 13.5 }}>
              {etc.hours}
            </div>
          </address>
        </Panel>

        <Panel title="Public documents.">
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14.5 }}>
            <Link
              to={`/etcs/${etc.slug}/manual`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid var(--rule)",
              }}
            >
              <span>
                Policy &amp; Procedures Manual{" "}
                <span style={{ color: "var(--ink-soft)" }}>· PDF</span>
              </span>
              <ArrowRight />
            </Link>
            <Link
              to={`/etcs/${etc.slug}/etrb-report`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid var(--rule)",
              }}
            >
              <span>
                ETRB Annual Report 2025 <span style={{ color: "var(--ink-soft)" }}>· PDF</span>
              </span>
              <ArrowRight />
            </Link>
            <Link
              to={`/etcs/${etc.slug}/ae-summary`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
              }}
            >
              <span>
                Adverse Event Summary 2025 <span style={{ color: "var(--ink-soft)" }}>· PDF</span>
              </span>
              <ArrowRight />
            </Link>
          </div>
        </Panel>

        <Panel title="Medical Director.">
          <div style={{ fontSize: 15 }}>{etc.medicalDirector.name}</div>
          <div style={{ color: "var(--ink-soft)", fontSize: 13.5, marginTop: 4 }}>
            {etc.medicalDirector.credentials}
          </div>
        </Panel>

        <button
          type="button"
          onClick={() => navigate(offeredProgram ? `/connect/${offeredProgram.slug}` : "/browse")}
          disabled={!offeredProgram}
          className="pill pill-primary"
          style={{
            width: "100%",
            padding: "18px 28px",
            marginTop: 12,
            opacity: offeredProgram ? 1 : 0.5,
            cursor: offeredProgram ? "pointer" : "not-allowed",
          }}
        >
          Inquire about treatment at this ETC <ArrowRight />
        </button>
      </div>
    </div>
  );
}
