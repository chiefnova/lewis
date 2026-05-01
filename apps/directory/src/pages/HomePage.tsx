import { Link, useNavigate } from "react-router-dom";
import { useState, type CSSProperties } from "react";
import {
  Capsule,
  IVBag,
  Pen,
  RoundTablet,
  Tablet,
  TopicalTube,
  Vial,
} from "../components/Products";
import { ArrowRight, PlusIcon } from "../components/icons";
import { FEATURED_HOMEPAGE } from "../data/catalog";
import { HeroSearchTypeahead } from "../search/HeroSearchTypeahead";
import { useSeo, siteUrl } from "../seo/useSeo";

function HeroPillScatter() {
  // 8-pill picasso scatter, tuned in /design-shotgun rounds 2026-04-30.
  // Positions are % of the .hero-section so they spread proportionally with
  // viewport. Asymmetric weight: 4 left (anchored by the cream/olive capsule),
  // 3 right (one statement piece), 1 top-center outlier. depth-far + depth-
  // anchor classes vary opacity + shadow weight to imply z-depth.
  type CSS = CSSProperties & { "--rot"?: string };
  return (
    <div className="pill-scatter" aria-hidden="true">
      {/* p1 — tiny rose tablet, near the H1's upper-left edge */}
      <div
        className="pill p1 depth-far"
        style={{ top: "5%", left: "18%", "--rot": "rotate(-32deg)" } as CSS}
      >
        <svg width={32} height={32} viewBox="0 0 50 50" aria-hidden="true">
          <circle cx={25} cy={25} r={20} fill="#D9A4A4" />
          <ellipse cx={20} cy={20} rx={9} ry={3} fill="rgba(255,255,255,0.45)" />
        </svg>
      </div>

      {/* p2 — BIG cream/olive capsule, anchor weight, mid-left */}
      <div
        className="pill p2 depth-anchor"
        style={{ top: "23%", left: "9%", "--rot": "rotate(-30deg)" } as CSS}
      >
        <svg width={118} height={46} viewBox="0 0 80 32" aria-hidden="true">
          <rect x={2} y={6} width={76} height={20} rx={10} fill="#E8DCC0" />
          <rect x={2} y={6} width={38} height={20} rx={10} fill="#7A6B52" />
          <rect x={2} y={6} width={76} height={6} rx={3} fill="rgba(255,255,255,0.20)" />
          <rect x={6} y={10} width={22} height={2} rx={1} fill="rgba(255,255,255,0.45)" />
          <rect x={46} y={10} width={22} height={2} rx={1} fill="rgba(255,255,255,0.55)" />
        </svg>
      </div>

      {/* p3 — small amber round tablet, clusters with the capsule */}
      <div className="pill p3" style={{ top: "51%", left: "12%", "--rot": "rotate(18deg)" } as CSS}>
        <svg width={44} height={44} viewBox="0 0 50 50" aria-hidden="true">
          <ellipse cx={25} cy={29} rx={20} ry={4} fill="rgba(40,30,20,0.10)" />
          <circle cx={25} cy={25} r={20} fill="#E89B6E" />
          <ellipse cx={20} cy={20} rx={9} ry={3} fill="rgba(255,255,255,0.40)" />
        </svg>
      </div>

      {/* p4 — tiny rose oval pill, lower-left edge outlier */}
      <div
        className="pill p4 depth-far"
        style={{ top: "66%", left: "5%", "--rot": "rotate(-12deg)" } as CSS}
      >
        <svg width={40} height={22} viewBox="0 0 60 34" aria-hidden="true">
          <ellipse cx={30} cy={17} rx={28} ry={14} fill="#D9A4A4" />
          <ellipse cx={22} cy={11} rx={9} ry={2.5} fill="rgba(255,255,255,0.55)" />
        </svg>
      </div>

      {/* p5 — BIG sage oval pill, statement piece, upper-right */}
      <div className="pill p5" style={{ top: "14%", right: "5%", "--rot": "rotate(16deg)" } as CSS}>
        <svg width={100} height={56} viewBox="0 0 60 34" aria-hidden="true">
          <ellipse cx={30} cy={17} rx={28} ry={14} fill="#A4B8A8" />
          <ellipse cx={30} cy={14} rx={22} ry={3} fill="rgba(255,255,255,0.30)" />
          <ellipse cx={22} cy={11} rx={9} ry={2.5} fill="rgba(255,255,255,0.55)" />
        </svg>
      </div>

      {/* p6 — medium amber oval pill, mid-right, isolated */}
      <div
        className="pill p6"
        style={{ top: "42%", right: "11%", "--rot": "rotate(32deg)" } as CSS}
      >
        <svg width={60} height={34} viewBox="0 0 60 34" aria-hidden="true">
          <ellipse cx={30} cy={17} rx={28} ry={14} fill="#C8956A" />
          <ellipse cx={30} cy={14} rx={22} ry={3} fill="rgba(255,255,255,0.30)" />
          <ellipse cx={22} cy={11} rx={9} ry={2.5} fill="rgba(255,255,255,0.55)" />
        </svg>
      </div>

      {/* p7 — small deep-rose round tablet, lower-right */}
      <div
        className="pill p7"
        style={{ top: "64%", right: "6%", "--rot": "rotate(-22deg)" } as CSS}
      >
        <svg width={42} height={42} viewBox="0 0 50 50" aria-hidden="true">
          <ellipse cx={25} cy={29} rx={20} ry={4} fill="rgba(40,30,20,0.10)" />
          <circle cx={25} cy={25} r={20} fill="#C68A8A" />
          <ellipse cx={20} cy={20} rx={9} ry={3} fill="rgba(255,255,255,0.40)" />
        </svg>
      </div>

      {/* p8 — tiny sage tablet, top-center outlier breaking the L/R divide */}
      <div
        className="pill p8 depth-far"
        style={{ top: "5%", left: "64%", "--rot": "rotate(8deg)" } as CSS}
      >
        <svg width={30} height={30} viewBox="0 0 50 50" aria-hidden="true">
          <circle cx={25} cy={25} r={20} fill="#A4B8A8" />
          <ellipse cx={20} cy={20} rx={9} ry={3} fill="rgba(255,255,255,0.45)" />
        </svg>
      </div>
    </div>
  );
}

function Hero({ onSearch }: { onSearch: (q: string) => void }) {
  return (
    <section
      className="hero-section"
      style={{
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <HeroPillScatter />
      <div
        className="container"
        style={{ textAlign: "center", position: "relative", width: "100%", zIndex: 2 }}
      >
        <div style={{ position: "relative", maxWidth: 1100, margin: "0 auto" }}>
          <h1
            className="serif"
            style={{
              fontSize: "clamp(4.6rem, 8.2vw, 7.8rem)",
              lineHeight: 1.02,
              letterSpacing: "-0.025em",
              fontWeight: 400,
              color: "var(--ink)",
              textWrap: "balance",
              margin: 0,
            }}
          >
            Find experimental{" "}
            <span
              className="serif italic"
              style={{
                fontWeight: 300,
                fontStyle: "italic",
                letterSpacing: "-0.025em",
                color: "var(--accent)",
              }}
            >
              treatments
            </span>
            .
          </h1>
        </div>

        <p
          style={{
            maxWidth: 620,
            margin: "36px auto 0",
            color: "var(--ink-soft)",
            fontSize: 16.5,
            lineHeight: 1.55,
          }}
        >
          Lewis Health connects patients to Montana's licensed Experimental Treatment Centers
          offering investigational treatments under the state's Right to Try framework.
        </p>

        <div style={{ maxWidth: 620, margin: "40px auto 0" }}>
          <HeroSearchTypeahead onSearch={onSearch} />
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section style={{ padding: "100px 0" }}>
      <div className="container-narrow">
        <h2
          className="serif"
          style={{
            fontSize: "clamp(2.4rem, 4.8vw, 4rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            textWrap: "balance",
            marginBottom: 40,
          }}
        >
          Some treatments don't{" "}
          <span className="italic" style={{ fontWeight: 300, color: "var(--accent)" }}>
            exist
          </span>{" "}
          anywhere else.
        </h2>
        <div
          className="grid-stack-mobile"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 56,
            fontSize: 17,
            lineHeight: 1.65,
            color: "var(--ink)",
          }}
        >
          <p>
            In 2025, Montana enacted the country's most expansive Right to Try framework.
            Investigational drugs that have completed Phase 1 — and passed safety review by a
            licensed Experimental Treatment Review Board (ETRB) — can be delivered through
            Experimental Treatment Centers to patients who have evaluated standard-of-care options
            and chosen to try something else.
          </p>
          <p>
            For patients, Lewis is the public directory of every Montana program — what's available,
            what's coming, and where to begin. Beneath it is the operating platform connecting
            sponsors, ETCs, treating physicians, and patients in one place: coordinating ETRB
            review, informed consent, treatment delivery, and adverse-event reporting so a Right to
            Try program can move from a sponsor's IND to a patient's first dose under one compliant
            workflow.
          </p>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      title: "Find a treatment for your condition.",
      body: "Browse the directory or search by condition, manufacturer, or trial phase. Every listing shows the dosage form, eligibility summary, and where it is offered.",
      el: <RoundTablet size={220} color="#D9A4A4" />,
    },
    {
      title: "Connect with a licensed ETC.",
      body: "When you find a program that fits, request a connection. The Experimental Treatment Center reaches out directly to begin a clinical conversation.",
      el: <Vial size={220} />,
    },
    {
      title: "Work with their clinical team to enroll.",
      body: "The ETC reviews your treating physician's recommendation, walks you through informed consent, and schedules your first visit.",
      el: <Capsule size={220} rotate={-22} />,
    },
  ];
  return (
    <section style={{ padding: "100px 0", background: "transparent" }}>
      <div className="container">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 64,
            flexWrap: "wrap",
            gap: 24,
          }}
        >
          <h2
            className="serif"
            style={{
              fontSize: "clamp(2.2rem, 4.2vw, 3.4rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              maxWidth: 720,
            }}
          >
            How Montana's program{" "}
            <span className="italic" style={{ fontWeight: 300, color: "var(--accent)" }}>
              actually
            </span>{" "}
            works.
          </h2>
          <div
            style={{
              fontSize: 12.5,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--ink-soft)",
            }}
          >
            Three steps · No account required to browse
          </div>
        </div>
        <div
          className="grid-carousel-mobile"
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}
        >
          {steps.map((s, i) => (
            <div key={s.title}>
              <div
                className="card-art"
                style={{
                  background: "var(--paper-deep)",
                  borderRadius: 4,
                  height: 280,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {s.el}
              </div>
              <div style={{ marginTop: 28 }}>
                <div
                  className="serif"
                  style={{
                    fontSize: 13,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--ink-soft)",
                    marginBottom: 14,
                  }}
                >
                  Step {i + 1}
                </div>
                <h3
                  className="serif"
                  style={{
                    fontSize: 22,
                    lineHeight: 1.2,
                    letterSpacing: "-0.01em",
                    marginBottom: 12,
                    fontWeight: 400,
                  }}
                >
                  {s.title}
                </h3>
                <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.6 }}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedTreatments() {
  return (
    <section style={{ padding: "100px 0" }}>
      <div className="container">
        <div style={{ marginBottom: 56, maxWidth: 760 }}>
          <h2
            className="serif"
            style={{
              fontSize: "clamp(2.2rem, 4.2vw, 3.4rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              marginBottom: 20,
            }}
          >
            Treatments available now in Montana.
          </h2>
          <p style={{ color: "var(--ink-soft)", fontSize: 16, lineHeight: 1.6 }}>
            These investigational treatments are available through licensed Montana Experimental
            Treatment Centers. Browse the full catalog or search by your condition.
          </p>
        </div>
        <div
          className="grid-carousel-mobile"
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}
        >
          {FEATURED_HOMEPAGE.map((p, i) => {
            const cardBody = (
              <>
                <div
                  className="card-art"
                  style={{
                    background: "var(--paper-deep)",
                    borderRadius: 4,
                    height: 280,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {p.art}
                </div>
                <div style={{ padding: "20px 4px 4px" }}>
                  <div
                    className="serif"
                    style={{ fontSize: 22, letterSpacing: "-0.01em", marginBottom: 6 }}
                  >
                    {p.name}
                  </div>
                  <div style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 14 }}>
                    {p.indication}
                  </div>
                  {!p.muted && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: "var(--accent)",
                        fontSize: 13.5,
                        fontWeight: 500,
                        marginBottom: 14,
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: "var(--accent)",
                        }}
                      />
                      Available at {p.etcs} ETC
                    </div>
                  )}
                </div>
              </>
            );
            return p.slug ? (
              <Link
                key={p.slug}
                to={`/programs/${p.slug}`}
                className="card-lift"
                style={{ display: "block", opacity: p.muted ? 0.5 : 1 }}
              >
                {cardBody}
              </Link>
            ) : (
              <div
                key={`placeholder-${i}`}
                aria-hidden="true"
                style={{ opacity: p.muted ? 0.5 : 1, cursor: "default" }}
              >
                {cardBody}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 48, display: "flex", justifyContent: "center" }}>
          <Link to="/browse" className="pill pill-outline">
            Browse all treatments
          </Link>
        </div>
      </div>
    </section>
  );
}

function ForPhysicians() {
  return (
    <section style={{ padding: "100px 0" }}>
      <div
        className="container-narrow grid-stack-mobile"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}
      >
        <div>
          <div
            style={{
              fontSize: 12.5,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-soft)",
              marginBottom: 18,
            }}
          >
            For Clinicians
          </div>
          <h2
            className="serif"
            style={{
              fontSize: "clamp(1.9rem, 3.2vw, 2.6rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.015em",
              marginBottom: 20,
            }}
          >
            For treating physicians researching options for a patient.
          </h2>
        </div>
        <div>
          <p
            style={{
              color: "var(--ink-soft)",
              fontSize: 16,
              lineHeight: 1.65,
              marginBottom: 28,
            }}
          >
            Each program page includes the full eligibility criteria, current trial phase and
            published evidence, ETC contact for clinical inquiry, and a downloadable program
            one-pager for chart review.
          </p>
          <button
            type="button"
            disabled
            className="pill pill-outline"
            style={{ opacity: 0.55, cursor: "not-allowed" }}
          >
            Browse the clinical reference <ArrowRight />
          </button>
        </div>
      </div>
    </section>
  );
}

const FAQS_PATIENT: ReadonlyArray<readonly [string, string]> = [
  [
    "What is Lewis?",
    "Lewis is the public directory of investigational treatments available at licensed Montana Experimental Treatment Centers. We are independent of any manufacturer or ETC and do not bill patients.",
  ],
  [
    "What is a Right to Try program in Montana?",
    "In 2025 Montana enacted a framework allowing licensed facilities to deliver investigational drugs (Phase 1 and beyond, pre-FDA-approval) to patients who have evaluated standard-of-care options. Treatments are administered under a treating physician's supervision after informed consent.",
  ],
  [
    "Do I need an account to browse?",
    "No. Browsing the directory and reading program detail pages is fully anonymous. An account is only required when you choose to connect with an ETC.",
  ],
  [
    "How much do these treatments cost?",
    "Costs are set by the ETC and confirmed during enrollment. Each program page lists a typical range. Insurance does not currently cover treatments delivered under Montana's RTT framework.",
  ],
  [
    "Does Lewis charge me anything?",
    "No. Lewis never charges patients. You pay the ETC directly for the treatment.",
  ],
  [
    "Can I use insurance?",
    "Insurance does not currently cover experimental treatments under Montana's Right to Try framework. Some ETCs offer financial assistance — ask during your initial conversation.",
  ],
  [
    "Where are the ETCs located?",
    "Licensed Experimental Treatment Centers are located in Montana. The first launch ETC is in Bozeman; additional centers will appear in the directory as they are licensed.",
  ],
  [
    "What if I'm not in Montana?",
    "Treatment must be delivered in person at a licensed Montana ETC. The ETC clinical team will discuss travel, lodging, and follow-up requirements with you.",
  ],
  [
    "How do I know if I'm eligible?",
    "Each program offers an anonymous eligibility self-screen on its page. The result is a starting point — final eligibility is determined by the ETC clinical team.",
  ],
  [
    "What happens if I have a bad reaction?",
    "ETCs are required by Montana law to monitor adverse events and report them to the state. Each program page lists known risks. Your treating physician and the ETC clinical team are the right people to ask program-specific questions.",
  ],
];

const FAQS_PHYS: ReadonlyArray<readonly [string, string]> = [
  [
    "How does my patient get enrolled at an ETC?",
    "Your patient submits a connect request from a treatment page. The ETC reviews their situation, requests your physician recommendation and a current H&P, and schedules informed consent before any treatment is delivered.",
  ],
  [
    "Can I refer patients to a specific ETC?",
    "Yes. ETC profile pages include direct clinical inquiry contacts. Referrals are not required to use Lewis — patients may also self-refer.",
  ],
  [
    "How does the ETC review work?",
    "Each ETC operates under its Experimental Treatment Review Board (ETRB), as required by Montana law. The ETRB reviews the patient's case, the proposed treatment, and consent procedures.",
  ],
  [
    "How are adverse events reported?",
    "ETCs are required to report adverse events to the Montana DPHHS and to the program's sponsor. Annual safety summaries are published on each ETC's profile.",
  ],
  [
    "Is Lewis affiliated with any specific manufacturer or ETC?",
    "No. Lewis is operated independently. We do not receive payment from manufacturers based on patient enrollment.",
  ],
];

interface AccordionRowProps {
  q: string;
  a: string;
  isOpen: boolean;
  onClick: () => void;
}

function AccordionRow({ q, a, isOpen, onClick }: AccordionRowProps) {
  return (
    <div className="acc-row" data-open={isOpen}>
      <button className="acc-q acc-q-mono" onClick={onClick} aria-expanded={isOpen}>
        <span>{q}</span>
        <span className="acc-chev">
          <PlusIcon />
        </span>
      </button>
      {isOpen && <div className="acc-a">{a}</div>}
    </div>
  );
}

function FaqSection() {
  const [open, setOpen] = useState<{ patient: number; phys: number }>({ patient: 0, phys: -1 });
  return (
    <section style={{ padding: "120px 0", background: "var(--paper-deep)" }}>
      <div className="container-narrow">
        <h2
          className="serif"
          style={{
            fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
            textAlign: "center",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            marginBottom: 80,
          }}
        >
          Frequently Asked{" "}
          <span className="italic" style={{ fontWeight: 300, color: "var(--accent)" }}>
            Questions
          </span>
        </h2>
        <div
          className="serif"
          style={{ fontSize: 22, textAlign: "center", marginBottom: 28, color: "var(--ink)" }}
        >
          For Patients
        </div>
        <div>
          {FAQS_PATIENT.map(([q, a], i) => (
            <AccordionRow
              key={q}
              q={q}
              a={a}
              isOpen={open.patient === i}
              onClick={() => setOpen((o) => ({ ...o, patient: o.patient === i ? -1 : i }))}
            />
          ))}
        </div>
        <div
          className="serif"
          style={{ fontSize: 22, textAlign: "center", margin: "80px 0 28px", color: "var(--ink)" }}
        >
          For Physicians and ETCs
        </div>
        <div>
          {FAQS_PHYS.map(([q, a], i) => (
            <AccordionRow
              key={q}
              q={q}
              a={a}
              isOpen={open.phys === i}
              onClick={() => setOpen((o) => ({ ...o, phys: o.phys === i ? -1 : i }))}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function BeginningSection() {
  const items = [
    { el: <TopicalTube size={70} />, faded: false },
    { el: <Pen size={90} />, faded: true },
    { el: <Vial size={70} />, faded: true },
    { el: <Capsule size={80} rotate={-18} />, faded: true },
    { el: <RoundTablet size={56} color="#D9A4A4" />, faded: true },
    { el: <Tablet size={80} color="#D9CAB0" />, faded: true },
    { el: <IVBag size={72} />, faded: true },
  ];
  return (
    <section style={{ padding: "140px 0 100px", textAlign: "center" }}>
      <div className="container">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            gap: 8,
            marginBottom: 8,
            minHeight: 110,
            flexWrap: "wrap",
          }}
        >
          {items.map((it, i) => (
            <div
              key={i}
              style={{ opacity: it.faded ? 0.42 : 1, filter: it.faded ? "saturate(0.7)" : "none" }}
            >
              {it.el}
            </div>
          ))}
        </div>
        <h2
          className="serif"
          style={{
            fontSize: "clamp(2.8rem, 6vw, 5rem)",
            letterSpacing: "-0.025em",
            lineHeight: 1.02,
            marginBottom: 40,
            fontWeight: 400,
          }}
        >
          More treatments are{" "}
          <span className="italic" style={{ fontWeight: 300, color: "var(--accent)" }}>
            coming.
          </span>
        </h2>
        <p
          style={{
            color: "var(--ink-soft)",
            maxWidth: 460,
            margin: "0 auto 36px",
            fontSize: 15.5,
          }}
        >
          Sign up to be notified when new programs and ETCs are added.
        </p>
        <form
          style={{
            maxWidth: 480,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            background: "rgba(27,24,20,0.05)",
            borderRadius: 9999,
            padding: 5,
            opacity: 0.55,
          }}
          aria-disabled="true"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="email"
            placeholder="Email me updates"
            aria-label="Email address for program updates"
            disabled
            style={{
              flex: 1,
              padding: "12px 20px",
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: "var(--sans)",
              fontSize: 14.5,
              color: "var(--ink)",
              cursor: "not-allowed",
            }}
          />
          <button
            type="submit"
            disabled
            className="pill pill-primary"
            style={{ cursor: "not-allowed" }}
          >
            Sign up
          </button>
        </form>
        <p
          style={{
            marginTop: 12,
            fontSize: 12.5,
            color: "var(--accent)",
            fontStyle: "italic",
          }}
        >
          Signup endpoint coming soon — your email won't be saved yet.
        </p>
      </div>
    </section>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  useSeo({
    title: "Lewis Health — Patient Directory",
    description:
      "Find experimental treatments available in Montana through licensed Experimental Treatment Centers. Anonymous to browse; an account is only required to connect with an ETC.",
    canonical: siteUrl("/"),
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Lewis Health",
      url: siteUrl("/"),
      description:
        "Public directory of investigational treatments available at Montana Experimental Treatment Centers under SB 535.",
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl("/search")}?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  });

  return (
    <div className="fade-up">
      <Hero onSearch={(q) => navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/browse")} />
      <ProblemSection />
      <HowItWorks />
      <FeaturedTreatments />
      <ForPhysicians />
      <FaqSection />
      <BeginningSection />
    </div>
  );
}
