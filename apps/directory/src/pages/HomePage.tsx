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
import { ArrowRight } from "../components/icons";
import { EmailSignupForm } from "../components/EmailSignupForm";
import { FeaturedConditions } from "../components/FeaturedConditions";
import { FeaturedTreatments as FeaturedTreatmentsCarousel } from "../components/FeaturedTreatments";
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
        style={{ top: "23%", left: "3%", "--rot": "rotate(-30deg)" } as CSS}
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
            className="serif hero-headline"
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
            <span className="hero-headline__lead">A new medical</span>{" "}
            <span
              className="serif hero-headline__accent italic"
              style={{
                fontWeight: 300,
                fontStyle: "italic",
                letterSpacing: "-0.025em",
                color: "var(--accent)",
              }}
            >
              frontier
            </span>
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
          Lewis is the connecting tissue between you, your clinician, and the manufacturers and ETCs
          running investigational treatments at Montana's licensed Experimental Treatment Centers.
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
    <section className="ed-section">
      <div className="ed-section__container">
        <div className="ed-label">I · Why this exists</div>
        <h2 className="ed-h2">
          Some treatments don't <i>exist</i> anywhere else.
        </h2>
        {/* Aesop-style two-column split: eyebrow + H2 above span the
            container's full natural width; below, the section divides
            into a 2-col grid with the Montana landscape photo on the
            left (~45% — visual anchor that hooks the eye before the
            text explains) and the body paragraphs stacked on the right
            (~55% — comfortable reading column). Photo + caption + body
            all start at the same top baseline (align-items: start). On
            mobile (≤720px) the grid collapses to a single column with
            the photo above the body. Photo is decorative (aria-hidden)
            with an italic Fraunces caption that anchors it into the
            page's typographic voice. */}
        <div className="problem-split">
          <figure className="problem-split__photo" aria-hidden="true">
            {/* Museum print mat treatment (/design-shotgun Round 8 winner:
                variant B). 14px cream-paper mat (#faf5e8 — slightly warmer
                than --paper) with a 1px hairline at the outer edge for
                definition; the photo sits inside with 4px rounded corners.
                Reads as a fine-art print mounted on archival board —
                directly matches Lewis's "careful record / documented
                specimen" brand metaphor (Lewis & Clark catalogued
                Montana's plants in exactly this register). */}
            <span className="problem-split__photo-mat">
              <img
                src="/images/montana/glacier-beargrass.jpeg"
                alt=""
                loading="lazy"
                decoding="async"
                width={540}
                height={360}
              />
            </span>
            <figcaption>Glacier National Park, Montana</figcaption>
          </figure>
          <div className="problem-split__body">
            <p>
              In 2025, Montana enacted the country's most expansive Right to Try framework.
              Investigational drugs that have completed Phase 1 — and passed safety review by a
              licensed Experimental Treatment Review Board (ETRB) — can be delivered through
              Experimental Treatment Centers to patients who have evaluated standard-of-care options
              and chosen to try something else.
            </p>
            <p>
              For patients, Lewis is the public directory of every Montana program — what's
              available, what's coming, and where to begin. Beneath it is the operating platform
              connecting manufacturers, ETCs, treating clinicians, and patients in one place:
              coordinating ETRB review, informed consent, treatment delivery, and adverse-event
              reporting so a Right to Try program can move from a manufacturer's IND to a patient's
              first dose under one compliant workflow.
            </p>
          </div>
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
    },
    {
      title: "Connect with a licensed ETC.",
      body: "When you find a program that fits, request a connection. The Experimental Treatment Center reaches out directly to begin a clinical conversation.",
    },
    {
      title: "Work with their clinical team to enroll.",
      body: "The ETC reviews your treating clinician's recommendation, walks you through informed consent, and schedules your first visit.",
    },
  ];
  const numerals = ["i", "ii", "iii"];
  return (
    <section className="ed-section">
      <div className="ed-section__container">
        <div className="ed-label">IV · How it works</div>
        <h2 className="ed-h2">
          How Montana's program <i>actually</i> works.
        </h2>
        <div className="how-grid">
          {steps.map((s, i) => (
            <div key={s.title} className="how-item">
              <div className="how-num">{numerals[i] ?? `${i + 1}`}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Slice 4 § 11.4b — local FeaturedTreatments deleted. Replaced by the
// editorial inline-list component in apps/directory/src/components/
// FeaturedTreatments.tsx (imported above as FeaturedTreatmentsCarousel)
// per locked Variant B from /design-shotgun Round 1.

function ForClinicians() {
  return (
    <section className="ed-section">
      <div className="ed-section__container">
        <div className="ed-label">V · For clinicians</div>
        <div className="for-phys-grid">
          <div>
            <h2>
              For treating clinicians researching options for a <i>patient</i>.
            </h2>
            <p>
              Each program page includes the full eligibility criteria, current trial phase and
              published evidence, ETC contact for clinical inquiry, and a downloadable program
              one-pager for chart review.
            </p>
            {/* Slice 4 § 11.7 — disabled CTA wired to /for-clinicians (P1 page).
                The route ships as a StaticShell placeholder until the P1 content
                draft per § 32.2 lands; the CTA being live-but-stubbed is honest
                and removes the slice-3 credibility tax of a disabled button. */}
            <Link to="/for-clinicians" className="pill pill-outline">
              Browse the clinical reference <ArrowRight />
            </Link>
          </div>
          {/* Right column — museum-mat scholarly plate replacing the
              previous faded ℞ ornament. Cajal's 1899 ink drawing of a
              giant pyramidal cell from the hippocampus (Ammon's horn),
              scanned by the Wellcome Collection (CC BY 4.0). The
              hand-drawn single-specimen register matches AboutPage's
              1836 Hooker bitterroot plate — both speak the visual
              language of "careful clinical record," which is exactly
              what this section promises clinicians. */}
          <figure className="for-phys__plate" aria-hidden="true">
            <span className="for-phys__plate-mat">
              <img
                src="/images/cajal/pyramidal-ammon-1899.webp"
                alt=""
                loading="lazy"
                decoding="async"
                width={1200}
                height={1608}
              />
            </span>
            <figcaption>
              Santiago Ramón y Cajal — giant pyramidal cell, Ammon's horn. (1899 · Wellcome
              Collection)
            </figcaption>
          </figure>
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
    "In 2025 Montana enacted a framework allowing licensed facilities to deliver investigational drugs (Phase 1 and beyond, pre-FDA-approval) to patients who have evaluated standard-of-care options. Treatments are administered under a treating clinician's supervision after informed consent.",
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
    "ETCs are required by Montana law to monitor adverse events and report them to the state. Each program page lists known risks. Your treating clinician and the ETC clinical team are the right people to ask program-specific questions.",
  ],
];

const FAQS_PHYS: ReadonlyArray<readonly [string, string]> = [
  [
    "How does my patient get enrolled at an ETC?",
    "Your patient submits a connect request from a treatment page. The ETC reviews their situation, requests your referral letter and a current H&P, and schedules informed consent before any treatment is delivered.",
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
    "ETCs are required to report adverse events to the Montana DPHHS and to the program's manufacturer. Annual safety summaries are published on each ETC's profile.",
  ],
  [
    "Is Lewis affiliated with any specific manufacturer or ETC?",
    "No. Lewis is operated independently. We do not receive payment from manufacturers based on patient enrollment.",
  ],
];

interface FaqRowProps {
  q: string;
  a: string;
  isOpen: boolean;
  onClick: () => void;
  rowId: string;
}

function FaqRow({ q, a, isOpen, onClick, rowId }: FaqRowProps) {
  const panelId = `${rowId}-panel`;
  return (
    <div className="faq-row">
      <button
        type="button"
        className="faq-q"
        onClick={onClick}
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <span>{q}</span>
        <span className="faq-q__icon" aria-hidden="true">
          {isOpen ? "−" : "+"}
        </span>
      </button>
      {isOpen && (
        <div id={panelId} className="faq-a">
          {a}
        </div>
      )}
    </div>
  );
}

function FaqSection() {
  // User override of § 11.8: keep the full 15-question FAQ on the homepage at
  // the bottom (not abridged to 5). Editorial chrome from locked Variant B
  // applied — Roman-numeral label, ed-h2 lighter weight, sub-group ed-h3
  // markers, hairline rows.
  const [open, setOpen] = useState<{ patient: number; phys: number }>({ patient: 0, phys: -1 });
  return (
    <section className="ed-section">
      <div className="ed-section__container">
        <div className="ed-label">VI · Frequently asked</div>
        <h2 className="ed-h2">
          Frequently <i>asked</i>.
        </h2>

        <h3 className="ed-h3">For patients.</h3>
        <div className="faq-list">
          {FAQS_PATIENT.map(([q, a], i) => (
            <FaqRow
              key={q}
              rowId={`faq-patient-${i}`}
              q={q}
              a={a}
              isOpen={open.patient === i}
              onClick={() => setOpen((o) => ({ ...o, patient: o.patient === i ? -1 : i }))}
            />
          ))}
        </div>

        <h3 className="ed-h3" style={{ marginTop: 64 }}>
          For clinicians and ETCs.
        </h3>
        <div className="faq-list">
          {FAQS_PHYS.map(([q, a], i) => (
            <FaqRow
              key={q}
              rowId={`faq-phys-${i}`}
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

/* Transitional photo between FaqSection and BeginningSection ("VII ·
 * Coming soon" — the newsletter signup). Wide panoramic Montana big sky
 * over native prairie. The unbroken horizon and active cumulus give the
 * page its visual exhale before the ask — friction (FAQ) resolved, then
 * a quiet Montana beat, then "more is coming, get notified." Museum-mat
 * treatment matches ProblemSection's Glacier photo (slot #1) and
 * AboutPage's founding plate (slot #4). Photo is decorative
 * (aria-hidden); the italic Fraunces caption anchors it into the
 * typographic voice and credits the public-domain USFWS source. */
function PrairieTransition() {
  return (
    <section className="home-prairie" aria-label="Montana big sky">
      <figure className="home-prairie__figure" aria-hidden="true">
        <span className="home-prairie__mat">
          <img
            src="/images/montana/bowdoin-bigsky.webp"
            alt=""
            loading="lazy"
            decoding="async"
            width={1600}
            height={451}
          />
        </span>
        <figcaption>
          Native prairie under big sky, Bowdoin National Wildlife Refuge, Phillips County. (USFWS ·
          Public Domain)
        </figcaption>
      </figure>
    </section>
  );
}

function BeginningSection() {
  const items = [
    { el: <TopicalTube size={64} />, faded: false },
    { el: <Pen size={80} />, faded: true },
    { el: <Vial size={64} />, faded: true },
    { el: <Capsule size={72} rotate={-18} />, faded: true },
    { el: <RoundTablet size={50} color="#D9A4A4" />, faded: true },
    { el: <Tablet size={72} color="#D9CAB0" />, faded: true },
    { el: <IVBag size={66} />, faded: true },
  ];
  return (
    <section className="ed-section">
      <div className="ed-section__container">
        <div className="ed-label" style={{ justifyContent: "center" }}>
          VII · Coming soon
        </div>
        <div
          className="beginning-inner"
          /* The decorative pill row preserves the existing "future programs"
             motif from slice 1; it's a quiet visual run-in, not a hero. */
          style={{ marginBottom: 16 }}
          aria-hidden="true"
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-end",
              gap: 6,
              minHeight: 88,
              flexWrap: "wrap",
            }}
          >
            {items.map((it, i) => (
              <div
                key={i}
                style={{
                  opacity: it.faded ? 0.36 : 0.78,
                  filter: it.faded ? "saturate(0.6)" : "saturate(0.85)",
                }}
              >
                {it.el}
              </div>
            ))}
          </div>
        </div>
        <div className="beginning-inner">
          <h2>
            More treatments are <i>coming</i>.
          </h2>
          <p>
            Get notified when new programs and ETCs are added in Montana. We'll only email you about
            new directory listings.
          </p>
          {/* Slice 4 § 11.9 — disabled email form replaced with real wired
              EmailSignupForm. Submits to POST /v1/public/marketing-subscriptions
              via useMarketingSubscription. */}
          <div className="beginning__form-wrap">
            <EmailSignupForm source="homepage_beginning" variant="banner" />
          </div>
          <div className="beginning__hint">Unsubscribe any time. We'll never share your email.</div>
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  useSeo({
    title: "Lewis — A new medical frontier in Montana",
    description:
      "Lewis is the connecting tissue between patients, clinicians, manufacturers, and Montana's licensed Experimental Treatment Centers — the country's first state-licensed Right to Try regime under SB 535. Search investigational treatments by your condition. Anonymous to browse.",
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

  // Homepage section order. AnnouncementStrip renders globally in
  // DirectoryLayout (homepage-only). Hero internals UNTOUCHED per user lock.
  //
  // Order is a user override of PRD § 11.1: ProblemSection ("Why this
  // exists") lifts to the FIRST below-hero position so the SB 535 framing is
  // the first thing a SERP arrival reads when scrolling down. The PRD's
  // recommended order put FeaturedConditions there; user judgment is that
  // the framing context lands the legitimacy signal before the catalog.
  // FaqSection preserved (full 15 questions) per user override of § 11.8.
  return (
    <div className="fade-up">
      <Hero onSearch={(q) => navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/browse")} />
      <ProblemSection />
      <FeaturedConditions />
      <FeaturedTreatmentsCarousel />
      <HowItWorks />
      <ForClinicians />
      <FaqSection />
      <PrairieTransition />
      <BeginningSection />
    </div>
  );
}
