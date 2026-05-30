import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import { ArrowRight } from "../components/icons";
import { getEligibilityForProgram } from "../data/eligibility";
import { getProgramBySlug } from "../data/catalog";
import { evaluate } from "../eligibility/evaluate";
import { useSeo, siteUrl } from "../seo/useSeo";
import { useEligibilitySession } from "./use-eligibility-session";

// Stable question IDs sent to the API. The question manifest is
// array-positional and stays client-side (see use-eligibility-session.ts
// docstring), so deriving a stable id from the index is correct — the
// server just stores opaque {questionId → value} pairs.
function questionId(index: number): string {
  return `q-${index}`;
}

export function EligibilityPage() {
  const navigate = useNavigate();
  const { programSlug = "wst-057" } = useParams<{ programSlug: string }>();
  const program = getProgramBySlug(programSlug);
  const questions = getEligibilityForProgram(programSlug);
  const session = useEligibilitySession(programSlug);

  // `step` is local UI state (which question is shown). `answers` is held
  // locally too — the radio click sets it synchronously so the Next
  // button enables on the same tick, and the hook's submitAnswer fires
  // in the background. The hook is the server-sync boundary; this
  // local state is the optimistic UI mirror. On a resumed session the
  // hook's "ready" payload hydrates this state once.
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [hydrated, setHydrated] = useState(false);

  useSeo({
    title: program
      ? `Eligibility self-screen — ${program.name} — Lewis Health`
      : "Eligibility self-screen — Lewis Health",
    description:
      "Anonymous eligibility self-screen. Your answers are an informational starting point. Final eligibility is determined by the ETC clinical team.",
    canonical: siteUrl(`/eligibility/${programSlug}`),
  });

  useEffect(() => {
    if (!program || !questions) navigate("/browse", { replace: true });
  }, [program, questions, navigate]);

  // When the hook hands us a "ready" session that already has answers
  // (resumed), hydrate the local answers + jump `step` to the first
  // unanswered question so the patient picks up where they left. Run
  // once per mount; the optimistic local state owns updates after that.
  useEffect(() => {
    if (hydrated) return;
    if (session.state.phase !== "ready" || !questions) return;
    const src = session.state.answers;
    const indexed: Record<number, string> = {};
    let firstUnanswered = 0;
    let stillContiguous = true;
    for (let i = 0; i < questions.length; i++) {
      const v = src[questionId(i)];
      if (typeof v === "string") {
        indexed[i] = v;
        if (stillContiguous) firstUnanswered = i + 1;
      } else {
        stillContiguous = false;
      }
    }
    setAnswers(indexed);
    setStep(Math.min(firstUnanswered, questions.length - 1));
    setHydrated(true);
  }, [session.state, questions, hydrated]);

  if (!program || !questions) return null;

  // --- Loading / bootstrap states -------------------------------------
  if (
    session.state.phase === "idle" ||
    session.state.phase === "starting" ||
    session.state.phase === "resuming"
  ) {
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
        role="status"
        aria-live="polite"
      >
        <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>
          <FormattedMessage
            id="directory.eligibility.bootstrap"
            defaultMessage="Preparing your self-screen…"
          />
        </p>
      </div>
    );
  }

  // --- Error / expired states -----------------------------------------
  if (session.state.phase === "error" || session.state.phase === "expired") {
    const isExpired = session.state.phase === "expired";
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
        <div style={{ maxWidth: 520, textAlign: "center" }} role="alert">
          <h2 className="serif" style={{ fontSize: 28, marginBottom: 16, fontWeight: 400 }}>
            {isExpired ? (
              <FormattedMessage
                id="directory.eligibility.expired.h2"
                defaultMessage="This screen expired. Start a fresh one?"
              />
            ) : (
              <FormattedMessage
                id="directory.eligibility.error.h2"
                defaultMessage="Something went wrong loading the self-screen."
              />
            )}
          </h2>
          <p style={{ color: "var(--ink-soft)", fontSize: 15, marginBottom: 28 }}>
            {isExpired ? (
              <FormattedMessage
                id="directory.eligibility.expired.body"
                defaultMessage="Sessions are kept for 24 hours. Your previous answers are gone, but starting again only takes a minute."
              />
            ) : session.state.phase === "error" ? (
              session.state.message
            ) : null}
          </p>
          <button
            type="button"
            onClick={() => {
              setStep(0);
              setAnswers({});
              setHydrated(false);
              void session.restart();
            }}
            className="pill pill-primary"
          >
            <FormattedMessage
              id="directory.eligibility.error.restart"
              defaultMessage="Start over"
            />
          </button>
        </div>
      </div>
    );
  }

  // --- Result states (completed via server, or completing-in-flight) --
  if (session.state.phase === "completed") {
    const completed = session.state;
    const passing = completed.result === "passed";

    // Pass branch — kept calm + centered per the existing pattern. The user
    // got a "yes, you may be a fit" result; the page's job is to point them
    // at /connect, not over-explain.
    if (passing) {
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
              <FormattedMessage
                id="directory.eligibility.result.pass.tag"
                defaultMessage="You appear to be eligible"
              />
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
              <FormattedMessage
                id="directory.eligibility.result.pass.h2"
                defaultMessage="Based on your answers, you may be a fit for {italic}."
                values={{
                  italic: (
                    <span className="italic" style={{ fontWeight: 300 }}>
                      {program.name}
                    </span>
                  ),
                }}
              />
            </h2>
            <p
              style={{ color: "var(--ink-soft)", fontSize: 16, lineHeight: 1.6, marginBottom: 40 }}
            >
              <FormattedMessage
                id="directory.eligibility.result.pass.body"
                defaultMessage="This is a starting point. Final eligibility is determined by the ETC's clinical team after reviewing your treating clinician's recommendation and history."
              />
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => navigate(`/connect/${program.slug}`)}
                className="pill pill-primary"
              >
                <FormattedMessage
                  id="directory.eligibility.result.pass.connect"
                  defaultMessage="Connect with the ETC"
                />{" "}
                <ArrowRight />
              </button>
              <button
                onClick={() => navigate(`/programs/${program.slug}`)}
                className="pill pill-outline"
              >
                <FormattedMessage
                  id="directory.eligibility.result.back"
                  defaultMessage="Back to treatment"
                />
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Fail branch — § 17.4 hybrid: B's letter-prose left + B's i./ii./iii.
    // letter-row stack right (sized for the 380px rail). H1 names the
    // program in italic ink-soft; the italic-inline failedCriterion clause
    // is the server-canonical version (mirrors back what the client posted
    // at /complete; on resume it's whatever the row was stamped with then).
    const programName = program.name;
    const failedCriterion =
      completed.failedCriterion ?? "may not match what you shared in the self-screen.";

    return (
      <div className="elig-fail fade-up" role="status" aria-live="polite">
        <div className="elig-fail__grid">
          <div className="elig-fail__prose">
            <p className="elig-fail__eyebrow">
              <span className="elig-fail__dot" aria-hidden="true" />
              <FormattedMessage
                id="directory.eligibility.fail.eyebrow"
                defaultMessage="Self-screen · Step {step} of {total} · Result"
                values={{ step: questions.length, total: questions.length }}
              />
            </p>

            <h1 className="elig-fail__h1 serif">
              <FormattedMessage
                id="directory.eligibility.fail.h1"
                defaultMessage="Based on what you shared, {program} may not be a fit."
                values={{
                  program: <em className="elig-fail__program">{programName}</em>,
                }}
              />
            </h1>

            <p className="elig-fail__reason">
              <FormattedMessage
                id="directory.eligibility.fail.reason"
                defaultMessage="This program may not be the right fit because it {italic}"
                values={{
                  italic: <em className="elig-fail__reason-em">{failedCriterion}</em>,
                }}
              />
            </p>

            <p className="elig-fail__lede">
              <FormattedMessage
                id="directory.eligibility.fail.lede1"
                defaultMessage="{strong} This self-screen is informational. The ETC's clinical team — not these four questions — makes the actual eligibility decision after reviewing your treating clinician's recommendation and current H&P."
                values={{
                  strong: <strong>That isn't the final word.</strong>,
                }}
              />
            </p>
            <p className="elig-fail__lede">
              <FormattedMessage
                id="directory.eligibility.fail.lede2"
                defaultMessage="If your situation has nuance the questions didn't capture, the first path on the right stays open. If they got it right and the program isn't a fit, the two below give you somewhere honest to go."
              />
            </p>

            <p className="elig-fail__footnote">
              <FormattedMessage
                id="directory.eligibility.fail.footnote"
                defaultMessage="Your answers are stored anonymously on this device. Lewis is an independent directory; we do not sell or share contact information and we are not affiliated with any manufacturer or ETC."
              />
            </p>
          </div>

          <aside className="elig-fail__rail" aria-label="Three ways forward">
            <p className="elig-fail__rail-label">
              <FormattedMessage
                id="directory.eligibility.fail.ways_label"
                defaultMessage="Three ways forward"
              />
            </p>

            <Link className="elig-fail__path" to={`/connect/${program.slug}`}>
              <span className="elig-fail__path-num" aria-hidden="true">
                i.
              </span>
              <div>
                <h2 className="elig-fail__path-title serif">
                  <FormattedMessage
                    id="directory.eligibility.fail.path1.title"
                    defaultMessage="Reach out anyway"
                  />
                </h2>
                <p className="elig-fail__path-desc">
                  <FormattedMessage
                    id="directory.eligibility.fail.path1.desc"
                    defaultMessage="The ETC's clinical team makes the final eligibility determination, not this self-screen. They may still want to talk to you."
                  />
                </p>
                <span className="elig-fail__path-cta">
                  <FormattedMessage
                    id="directory.eligibility.fail.path1.cta"
                    defaultMessage="Connect with the ETC"
                  />
                </span>
              </div>
            </Link>

            <Link className="elig-fail__path" to="/browse">
              <span className="elig-fail__path-num" aria-hidden="true">
                ii.
              </span>
              <div>
                <h2 className="elig-fail__path-title serif">
                  <FormattedMessage
                    id="directory.eligibility.fail.path2.title"
                    defaultMessage="Browse other treatments"
                  />
                </h2>
                <p className="elig-fail__path-desc">
                  <FormattedMessage
                    id="directory.eligibility.fail.path2.desc"
                    defaultMessage="See if another Montana program may be a fit for your situation."
                  />
                </p>
                <span className="elig-fail__path-cta">
                  <FormattedMessage
                    id="directory.eligibility.fail.path2.cta"
                    defaultMessage="All treatments"
                  />
                </span>
              </div>
            </Link>

            {/*
              Path iii is an outbound link to clinicaltrials.gov per § 17.4.
              target=_blank with rel=noopener so we don't leak the
              eligibility-result referrer to NIH (the .lewis.health origin
              never appears in their analytics).
            */}
            <a
              className="elig-fail__path"
              href="https://clinicaltrials.gov/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="elig-fail__path-num" aria-hidden="true">
                iii.
              </span>
              <div>
                <h2 className="elig-fail__path-title serif">
                  <FormattedMessage
                    id="directory.eligibility.fail.path3.title"
                    defaultMessage="Look for clinical trials elsewhere"
                  />
                </h2>
                <p className="elig-fail__path-desc">
                  <FormattedMessage
                    id="directory.eligibility.fail.path3.desc"
                    defaultMessage="Search ClinicalTrials.gov for trials related to your condition, outside Montana's experimental-treatment regime."
                  />
                </p>
                <span className="elig-fail__path-cta">
                  <FormattedMessage
                    id="directory.eligibility.fail.path3.cta"
                    defaultMessage="ClinicalTrials.gov"
                  />
                </span>
              </div>
            </a>
          </aside>
        </div>
      </div>
    );
  }

  // --- Question step ---------------------------------------------------
  // session.state.phase is "ready" or "completing" here.
  const total = questions.length;
  const safeStep = Math.min(step, total - 1);
  const cur = questions[safeStep];
  if (!cur) return null;
  const completing = session.state.phase === "completing";

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
          aria-valuenow={safeStep + 1}
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
                background: i <= safeStep ? "var(--ink)" : "var(--rule)",
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
            Question {safeStep + 1} of {total} · {program.name}
          </div>
          <h2
            id={`q-${safeStep}-prompt`}
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
            aria-labelledby={`q-${safeStep}-prompt`}
            style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 36 }}
          >
            {cur.opts.map((o) => {
              const selected = answers[safeStep] === o;
              return (
                <button
                  key={o}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={completing}
                  onClick={() => {
                    // Optimistic local update — Next enables synchronously.
                    // submitAnswer fires in the background; the hook will
                    // transition us to "expired" if the server rejects.
                    // Auto-advance was removed in slice 3 per WCAG 2.2.1 /
                    // 3.2.2 — the user still has to press Next.
                    setAnswers((a) => ({ ...a, [safeStep]: o }));
                    void session.submitAnswer(questionId(safeStep), o);
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
                    cursor: completing ? "wait" : "pointer",
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
                safeStep > 0 ? setStep((s) => s - 1) : navigate(`/programs/${program.slug}`)
              }
              className="pill pill-outline pill-sm"
              disabled={completing}
            >
              Back
            </button>
            <button
              type="button"
              disabled={!answers[safeStep] || completing}
              onClick={() => {
                if (safeStep + 1 < total) {
                  setStep((s) => s + 1);
                  return;
                }
                // Final step → evaluate locally + close the server session.
                // The hook stamps server-canonical result + failedCriterion
                // back into state which the completed branch reads from.
                const result = evaluate(questions, answers);
                void session.complete({
                  passed: result.passing,
                  failedCriterion: result.failedCriterion,
                });
              }}
              className="pill pill-primary pill-sm"
              style={{
                opacity: answers[safeStep] && !completing ? 1 : 0.5,
                cursor: answers[safeStep] && !completing ? "pointer" : "not-allowed",
              }}
            >
              {completing ? "Submitting…" : safeStep + 1 === total ? "See result" : "Next"}
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
