import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight } from "../components/icons";
import { getEligibilityForProgram } from "../data/eligibility";
import { getProgramBySlug } from "../data/catalog";
import {
  generateLocalToken,
  getStoredScreen,
  saveStoredScreen,
} from "../eligibility/anonymousSession";
import { evaluate } from "../eligibility/evaluate";
import { useSeo, siteUrl } from "../seo/useSeo";

export function EligibilityPage() {
  const navigate = useNavigate();
  const { programSlug = "wst-057" } = useParams<{ programSlug: string }>();
  const program = getProgramBySlug(programSlug);
  const questions = getEligibilityForProgram(programSlug);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  useSeo({
    title: program
      ? `Eligibility self-screen — ${program.name} — Corridor Health`
      : "Eligibility self-screen — Corridor Health",
    description:
      "Anonymous eligibility self-screen. Your answers are an informational starting point. Final eligibility is determined by the ETC clinical team.",
    canonical: siteUrl(`/eligibility/${programSlug}`),
  });

  // Bootstrap or resume the anonymous session. Once the API is live this will
  // call POST /v1/public/eligibility/:slug/start; for now we mint a local token
  // so the localStorage round-trip is exercised end-to-end. The token is the
  // source of truth in localStorage — no need to mirror it into React state.
  useEffect(() => {
    const existing = getStoredScreen(programSlug);
    if (existing) {
      setAnswers(existing.answers);
    } else {
      saveStoredScreen(programSlug, {
        token: generateLocalToken(),
        startedAt: new Date().toISOString(),
        answers: {},
      });
    }
  }, [programSlug]);

  useEffect(() => {
    if (!program || !questions) navigate("/browse", { replace: true });
  }, [program, questions, navigate]);

  const total = questions?.length ?? 0;
  const done = step >= total;
  const result = useMemo(
    () => (questions ? evaluate(questions, answers) : null),
    [questions, answers],
  );

  if (!program || !questions) return null;

  if (done && result) {
    return (
      <div
        className="fade-up"
        style={{
          minHeight: "calc(100vh - 130px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "64px 32px",
        }}
      >
        <div style={{ maxWidth: 620, textAlign: "center" }} role="status" aria-live="polite">
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
              marginBottom: 24,
            }}
          >
            <span
              style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }}
            />{" "}
            {result.passing ? "You appear to be eligible" : "This program may not be the right fit"}
          </div>
          <h2
            className="serif"
            style={{
              fontSize: "clamp(2.4rem, 5vw, 3.6rem)",
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              marginBottom: 24,
            }}
          >
            {result.passing ? (
              <>
                Based on your answers, you may be a fit for{" "}
                <span className="italic" style={{ fontWeight: 300 }}>
                  {program.name}.
                </span>
              </>
            ) : (
              <>
                Based on your answers,{" "}
                <span className="italic" style={{ fontWeight: 300 }}>
                  {program.name}
                </span>{" "}
                may not be the right fit.
              </>
            )}
          </h2>
          <p style={{ color: "var(--ink-soft)", fontSize: 16, lineHeight: 1.6, marginBottom: 40 }}>
            {result.passing
              ? "This is a starting point. Final eligibility is determined by the ETC's clinical team after reviewing your treating physician's recommendation and history."
              : "Eligibility is determined by the ETC clinical team. You may still reach out to discuss your situation, or browse other programs."}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate(`/connect/${program.slug}`)}
              className="pill pill-primary"
            >
              {result.passing ? "Connect with the ETC" : "Reach out anyway"} <ArrowRight />
            </button>
            <button
              onClick={() => navigate(`/programs/${program.slug}`)}
              className="pill pill-outline"
            >
              Back to treatment
            </button>
          </div>
        </div>
      </div>
    );
  }

  const cur = questions[step];
  if (!cur) return null;

  return (
    <div
      className="fade-up"
      style={{
        minHeight: "calc(100vh - 130px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 32px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 640 }}>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={step + 1}
          aria-label="Eligibility self-screen progress"
          style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 40 }}
        >
          {questions.map((_, i) => (
            <span
              key={i}
              aria-hidden="true"
              style={{
                width: 28,
                height: 3,
                borderRadius: 2,
                background: i <= step ? "var(--ink)" : "var(--rule)",
              }}
            />
          ))}
        </div>
        <div style={{ background: "var(--paper-card)", borderRadius: 6, padding: 48 }}>
          <div
            style={{
              fontSize: 12.5,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-soft)",
              marginBottom: 18,
            }}
          >
            Question {step + 1} of {total} · {program.name}
          </div>
          <h2
            id={`q-${step}-prompt`}
            className="serif"
            style={{
              fontSize: 28,
              letterSpacing: "-0.015em",
              lineHeight: 1.15,
              marginBottom: 32,
              fontWeight: 400,
            }}
          >
            {cur.q}
          </h2>
          <div
            role="radiogroup"
            aria-labelledby={`q-${step}-prompt`}
            style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 36 }}
          >
            {cur.opts.map((o) => {
              const selected = answers[step] === o;
              return (
                <button
                  key={o}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    const next = { ...answers, [step]: o };
                    setAnswers(next);
                    saveStoredScreen(programSlug, {
                      token: getStoredScreen(programSlug)?.token ?? generateLocalToken(),
                      startedAt:
                        getStoredScreen(programSlug)?.startedAt ?? new Date().toISOString(),
                      answers: next,
                    });
                    // Auto-advance was removed: it created a WCAG 2.2.1 / 3.2.2
                    // problem (change of context on input) for screen-reader and
                    // motor-impaired users. Users must press Next to advance now.
                  }}
                  style={{
                    textAlign: "left",
                    padding: "16px 22px",
                    border: "1px solid " + (selected ? "var(--ink)" : "var(--rule)"),
                    background: selected ? "var(--paper)" : "transparent",
                    borderRadius: 9999,
                    fontSize: 15,
                    color: "var(--ink)",
                    transition: "all 160ms",
                  }}
                >
                  {o}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              type="button"
              onClick={() =>
                step > 0 ? setStep((s) => s - 1) : navigate(`/programs/${program.slug}`)
              }
              className="pill pill-outline pill-sm"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!answers[step]}
              onClick={() => setStep((s) => s + 1)}
              className="pill pill-primary pill-sm"
              style={{
                opacity: answers[step] ? 1 : 0.5,
                cursor: answers[step] ? "pointer" : "not-allowed",
              }}
            >
              {step + 1 === total ? "See result" : "Next"}
            </button>
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: "var(--ink-soft)",
              marginTop: 16,
              textAlign: "center",
            }}
          >
            Answers are saved anonymously to this device.
          </div>
        </div>
      </div>
    </div>
  );
}
