import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { ETCS, getProgramBySlug } from "../data/catalog";
import { ArrowLeft, ArrowRight, PinIcon } from "../components/icons";
import { TopicalTube } from "../components/Products";
import { Panel } from "../components/Panel";
import { useSeo, siteUrl } from "../seo/useSeo";

export function TreatmentDetailPage() {
  const navigate = useNavigate();
  const { slug = "wst-057" } = useParams<{ slug: string }>();
  const program = getProgramBySlug(slug);
  const offeringEtc = ETCS.find((e) => e.programs.includes(slug));
  const renderable = program && program.available;

  useSeo({
    title: program
      ? `${program.name} in Montana — Corridor Health`
      : "Treatment not found — Corridor Health",
    description: program
      ? `${program.name} ${program.indication}. Investigational topical treatment from WinSanTor available at a licensed Montana Experimental Treatment Center under SB 535.`
      : undefined,
    canonical: program ? siteUrl(`/programs/${program.slug}`) : siteUrl("/browse"),
    jsonLd: program
      ? {
          "@context": "https://schema.org",
          "@type": "Drug",
          name: program.name,
          manufacturer: program.manufacturer
            ? { "@type": "Organization", name: program.manufacturer }
            : undefined,
          description: `${program.name} ${program.indication}.`,
          clinicalPharmacology: "Phase 2 investigational small-molecule, topical formulation.",
          availableStrength: { "@type": "DrugStrength", description: "Topical formulation" },
        }
      : undefined,
  });

  // Worked example for WST-057 — additional programs will arrive once they're
  // licensed by Montana DPHHS. Until then, navigating to a not-found slug bounces
  // back to /browse rather than rendering a half-formed page.
  useEffect(() => {
    if (!renderable) navigate("/browse", { replace: true });
  }, [renderable, navigate]);

  if (!program || !program.available) {
    return null;
  }

  return (
    <div className="fade-up split-detail">
      <div className="split-detail-art" style={{ flexDirection: "column", position: "relative" }}>
        <TopicalTube size={420} />
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 32,
            fontStyle: "italic",
            fontFamily: "var(--serif)",
            color: "var(--ink-soft)",
            fontSize: 13,
          }}
        >
          Actual product appearance may vary.
        </div>
      </div>
      <div className="split-detail-body">
        <button
          onClick={() => navigate("/browse")}
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
          Back to browse
        </button>
        <h1
          className="serif"
          style={{
            fontSize: 56,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            marginBottom: 8,
            fontWeight: 400,
          }}
        >
          WST-057<sup style={{ fontSize: 24, top: "-1em" }}>®</sup>
        </h1>
        <div
          className="serif"
          style={{
            fontSize: 36,
            color: "var(--accent)",
            letterSpacing: "-0.015em",
            marginBottom: 14,
            fontWeight: 400,
          }}
        >
          Available{" "}
          <span className="italic" style={{ fontWeight: 300 }}>
            now
          </span>{" "}
          in Montana
        </div>
        <div style={{ color: "var(--ink-soft)", fontSize: 15, marginBottom: 40 }}>
          Topical investigational treatment for diabetic peripheral neuropathy from{" "}
          <span style={{ color: "var(--ink)" }}>WinSanTor®</span>
        </div>

        <Panel title="About this treatment.">
          <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.65, marginBottom: 14 }}>
            WST-057 is a topical small-molecule formulation in development for the treatment of
            painful diabetic peripheral neuropathy. It targets a peripheral nerve regeneration
            pathway that has not been addressed by current standard-of-care.
          </p>
          <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.65 }}>
            Currently in <span style={{ color: "var(--ink)" }}>Phase 2</span> clinical evaluation.{" "}
            <span style={{ color: "var(--ink-soft)", fontStyle: "italic" }}>
              [COUNSEL REVIEW] — published-evidence link pending source URL.
            </span>
          </p>
        </Panel>

        <Panel title="Who this is for.">
          <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.65, marginBottom: 22 }}>
            Adults with confirmed diabetic peripheral neuropathy who have evaluated standard-of-care
            options including gabapentinoids, SNRIs, and topical agents, and have discussed
            experimental options with their treating physician.
          </p>
          <button
            className="pill pill-primary"
            style={{ width: "100%", padding: "16px 28px" }}
            onClick={() => navigate(`/eligibility/${program.slug}`)}
          >
            Check my eligibility <ArrowRight />
          </button>
        </Panel>

        <Panel title="Where to access this treatment.">
          {offeringEtc ? (
            <>
              <p style={{ color: "var(--ink-soft)", fontSize: 15, marginBottom: 20 }}>
                {program.name} is currently available at the following Montana Experimental
                Treatment Center:
              </p>
              <div
                style={{
                  border: "1px solid var(--rule)",
                  borderRadius: 4,
                  padding: 24,
                  background: "var(--paper)",
                }}
              >
                <div className="serif" style={{ fontSize: 19, marginBottom: 6 }}>
                  {offeringEtc.name}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: "var(--ink-soft)",
                    fontSize: 13.5,
                    marginBottom: 14,
                  }}
                >
                  <PinIcon /> {offeringEtc.city}, {offeringEtc.state}
                </div>
                <p
                  style={{
                    color: "var(--ink-soft)",
                    fontSize: 14.5,
                    lineHeight: 1.6,
                    marginBottom: 16,
                  }}
                >
                  An outpatient specialty clinic licensed under Montana's ETC framework. Focus on
                  neurology and pain medicine; staffed by a multidisciplinary clinical team.
                </p>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: "var(--accent)",
                    background: "var(--accent-bg)",
                    padding: "6px 12px",
                    borderRadius: 9999,
                    fontSize: 12.5,
                    fontWeight: 500,
                    marginBottom: 18,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--accent)",
                    }}
                  />{" "}
                  Currently accepting new patients
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link to={`/etcs/${offeringEtc.slug}`} className="pill pill-outline pill-sm">
                    View ETC profile <ArrowRight size={12} />
                  </Link>
                  <button
                    onClick={() => navigate(`/connect/${program.slug}`)}
                    className="pill pill-primary pill-sm"
                  >
                    Connect about this treatment <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p style={{ color: "var(--ink-soft)", fontSize: 15 }}>
              No licensed ETC is currently offering this program.
            </p>
          )}
        </Panel>

        <Panel title="How enrollment works.">
          <ol
            style={{
              color: "var(--ink-soft)",
              fontSize: 15,
              lineHeight: 1.7,
              paddingLeft: 22,
              marginBottom: 18,
            }}
          >
            <li>Connect with the ETC. They review your situation.</li>
            <li>Provide your treating physician's recommendation and a current H&P.</li>
            <li>Complete informed consent and the patient agreement before your first visit.</li>
          </ol>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", fontStyle: "italic" }}>
            Corridor never charges patients. You'll pay the ETC directly for the treatment.
          </div>
        </Panel>

        <Panel title="What this typically costs.">
          <div
            className="serif"
            style={{
              fontSize: 36,
              color: "var(--accent)",
              letterSpacing: "-0.015em",
              marginBottom: 10,
              fontWeight: 400,
            }}
          >
            Typically $2,400–$3,800 per course
          </div>
          <div style={{ color: "var(--ink-soft)", fontSize: 13.5, lineHeight: 1.6 }}>
            Costs are set by the ETC. Final pricing is confirmed during enrollment. Insurance does
            not currently cover experimental treatments under Montana RTT.{" "}
            <span style={{ fontStyle: "italic" }}>
              [COUNSEL REVIEW: confirm cost-display copy.]
            </span>
          </div>
        </Panel>

        <div style={{ marginTop: 32, paddingTop: 28, borderTop: "1px solid var(--rule)" }}>
          <div className="serif" style={{ fontSize: 19, marginBottom: 8 }}>
            Used Corridor?
          </div>
          <div style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 14 }}>
            If you've worked with an ETC through this directory, please share your story.
          </div>
          <button
            type="button"
            disabled
            className="pill pill-outline pill-sm"
            style={{ opacity: 0.55, cursor: "not-allowed" }}
          >
            Share Feedback
          </button>
        </div>
      </div>
    </div>
  );
}
