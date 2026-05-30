import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { FormattedMessage } from "react-intl";

import type {
  PublicEtcDetail,
  PublicEtcSummary,
  PublicProgramDetail,
} from "@lewis/shared/api/public";
import { ApiNetworkError, ApiSchemaError, publicApi } from "../api/client";
import { useConnectRequest } from "./use-connect-request";
import { readEligibilityToken } from "./use-eligibility-session";
import { useSeo, siteUrl } from "../seo/useSeo";

/**
 * Slice 5 § 18.1 / 18.2 — anonymous patient → ETC connect form.
 *
 * Two-column hybrid (Round 2 winner): B's letter-prose intro on the left
 * + A/C's boxed input fields + a `i. ii. iii. iv.` letter-row "What
 * happens next" rail on the right. PRD-mandated changes:
 *   1. Explicit privacy framing block above the form (verbatim § 18.1).
 *   2. Situation textarea is OPTIONAL (was required).
 *   3. Refined textarea warning copy.
 *
 * § 18.2 critical: anonymous submission is the primary path. The API
 * always returns needsAccount=false / signupUrl=null. Account creation
 * is offered post-conversion on the success state, not pre-conversion.
 *
 * Migration from slice 1 stub: drops the local `getProgramBySlug` +
 * `ETCS.find(...)` lookups in favor of two API calls — `getProgram(slug)`
 * for the program metadata and `listEtcs() + getEtc(slug)` to resolve
 * which directory_published ETC offers this program. The server does
 * the same join in app.directory_connect_request_create when the form
 * submits; the frontend lookup here is just to surface the ETC name in
 * the H1 and privacy framing.
 */

interface ConnectFields {
  name: string;
  email: string;
  phone: string;
  situation: string;
}

const EMPTY: ConnectFields = { name: "", email: "", phone: "", situation: "" };

type OfferingEtcState =
  | { phase: "loading" }
  | { phase: "ready"; program: PublicProgramDetail; etc: PublicEtcSummary | PublicEtcDetail }
  | { phase: "not-found" }
  | { phase: "error" };

/**
 * Resolves the offering ETC for a given program slug. The API does the
 * authoritative ETC ↔ program join via active PPA inside the connect-
 * request create helper, but the form UI needs the ETC's name for the
 * privacy framing copy. We list ETCs once, then call getEtc on each in
 * parallel and pick the first whose `programs` array contains the slug.
 * At MVP-0 there's one ETC, so this is effectively two round-trips.
 */
function useOfferingEtc(programSlug: string): OfferingEtcState {
  const [state, setState] = useState<OfferingEtcState>({ phase: "loading" });

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ phase: "loading" });

    (async () => {
      try {
        const [program, etcList] = await Promise.all([
          publicApi.getProgram(programSlug, { signal: ctrl.signal }),
          publicApi.listEtcs({ signal: ctrl.signal }),
        ]);
        if (ctrl.signal.aborted) return;

        // Look up details for each etc summary, find the one offering this program.
        const details = await Promise.all(
          etcList.etcs.map((summary) =>
            publicApi
              .getEtc(summary.slug, { signal: ctrl.signal })
              .then((detail) => ({ summary, detail }))
              .catch(() => null),
          ),
        );
        if (ctrl.signal.aborted) return;

        const match = details
          .filter((d): d is { summary: PublicEtcSummary; detail: PublicEtcDetail } => d !== null)
          .find(({ detail }) => detail.programs.some((p) => p.slug === programSlug));

        if (!match) {
          // Program exists but no published ETC offers it. Surface as
          // not-found rather than error so the user sees a calm "no
          // matching center" state, not a generic 500.
          setState({ phase: "not-found" });
          return;
        }
        setState({ phase: "ready", program, etc: match.detail });
      } catch (err: unknown) {
        if (ctrl.signal.aborted) return;
        if (err instanceof Error && err.name === "AbortError") return;
        if (err instanceof ApiNetworkError && err.status === 404) {
          setState({ phase: "not-found" });
          return;
        }
        if (err instanceof ApiNetworkError || err instanceof ApiSchemaError) {
          setState({ phase: "error" });
          return;
        }
        setState({ phase: "error" });
      }
    })();

    return () => ctrl.abort();
  }, [programSlug]);

  return state;
}

export function ConnectPage() {
  const { programSlug = "wst-057" } = useParams<{ programSlug: string }>();
  const offering = useOfferingEtc(programSlug);

  const [fields, setFields] = useState<ConnectFields>(EMPTY);
  const { state: submitState, submit } = useConnectRequest();

  useSeo({
    title:
      offering.phase === "ready"
        ? `Connect about ${offering.program.name} — Lewis Health`
        : "Connect with an ETC — Lewis Health",
    description:
      "Submit a connect request to the licensed Montana ETC offering this program. The clinical coordinator will follow up directly.",
    canonical: siteUrl(`/connect/${programSlug}`),
  });

  // Snapshot the eligibility session token (if any) once on mount so the
  // submit can attach it. Re-reading on every keystroke is wasteful.
  // Reads the raw UUID minted by /v1/public/eligibility/start; null when
  // the patient never ran the self-screen on this device.
  const eligibilityTokenRef = useRef<string | null>(null);
  useEffect(() => {
    eligibilityTokenRef.current = readEligibilityToken(programSlug);
  }, [programSlug]);

  function update<K extends keyof ConnectFields>(k: K, v: ConnectFields[K]) {
    setFields((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (offering.phase !== "ready") return;
    if (submitState.phase === "submitting") return;
    const storedToken = eligibilityTokenRef.current;
    // The local eligibility token format is `lewis-eligibility-<id>` — the
    // API expects a real UUID v4. Send null when the local token isn't a
    // valid UUID; the server-side connect_request_create helper silently
    // ignores invalid tokens anyway, but this prevents zod validation
    // errors at the API client boundary.
    const isUuid = storedToken !== null && /^[0-9a-f-]{36}$/i.test(storedToken);
    await submit({
      programSlug,
      eligibilitySessionToken: isUuid ? storedToken : null,
      name: fields.name.trim(),
      email: fields.email.trim(),
      phone: fields.phone.trim() || null,
      // "Best time to contact" was in PRD § 18.1's kept-field list; user
      // override removed it as friction with no operational value (the ETC
      // coordinator will call back during business hours either way).
      bestTimeToContact: null,
      situation: fields.situation.trim() || null,
    });
  }

  if (offering.phase === "loading") {
    return (
      <div className="connect-form connect-form--state fade-up" aria-busy="true">
        <div className="connect-form__skeleton" aria-hidden="true" />
      </div>
    );
  }

  if (offering.phase === "not-found") {
    return (
      <div className="connect-form connect-form--state fade-up">
        <div className="connect-form__state-body">
          <h1 className="connect-form__h1 serif">
            <FormattedMessage
              id="directory.connect.notfound.h1"
              defaultMessage="We couldn't find a Montana ETC offering this program."
            />
          </h1>
          <p className="connect-form__state-lede">
            <FormattedMessage
              id="directory.connect.notfound.body"
              defaultMessage="The program may have ended, or the ETC may have paused new enrollments. Browse the current list of treatments to find what's available."
            />
          </p>
          <Link to="/browse" className="connect-form__state-cta">
            <FormattedMessage
              id="directory.connect.notfound.back"
              defaultMessage="Browse treatments"
            />
          </Link>
        </div>
      </div>
    );
  }

  if (offering.phase === "error") {
    return (
      <div className="connect-form connect-form--state fade-up">
        <div className="connect-form__state-body" role="alert">
          <h1 className="connect-form__h1 serif">
            <FormattedMessage
              id="directory.connect.error.h1"
              defaultMessage="We couldn't load this page just now."
            />
          </h1>
          <p className="connect-form__state-lede">
            <FormattedMessage
              id="directory.connect.error.body"
              defaultMessage="Try refreshing in a moment, or come back later. The directory itself is fine — this is a transient hiccup."
            />
          </p>
        </div>
      </div>
    );
  }

  // -- Success state ------------------------------------------------------
  // § 18.3 — calm confirmation with a checklist of what to prep. Kept
  // simple here; the dedicated /connect/confirmed route can deepen this
  // in a future slice.
  if (submitState.phase === "success") {
    return (
      <div className="connect-form connect-form--state fade-up" role="status" aria-live="polite">
        <div className="connect-form__state-body">
          <div className="connect-form__success-mark" aria-hidden="true">
            ✓
          </div>
          <h1 className="connect-form__h1 serif">
            <FormattedMessage
              id="directory.connect.success.h1"
              defaultMessage="We've connected you with {etc}."
              values={{ etc: <em className="connect-form__em">{offering.etc.name}</em> }}
            />
          </h1>
          <p className="connect-form__state-lede">
            <FormattedMessage
              id={submitState.messageId}
              defaultMessage={submitState.messageDefault}
            />
          </p>

          <h2 className="connect-form__prep-title serif">
            <FormattedMessage
              id="directory.connect.success.prep"
              defaultMessage="A few things to have ready when they reach out"
            />
          </h2>
          <ul className="connect-form__prep">
            <li>
              <FormattedMessage
                id="directory.connect.success.prep.1"
                defaultMessage="Your treating clinician's written recommendation"
              />
            </li>
            <li>
              <FormattedMessage
                id="directory.connect.success.prep.2"
                defaultMessage="A current History &amp; Physical (within the last 12 months)"
              />
            </li>
            <li>
              <FormattedMessage
                id="directory.connect.success.prep.3"
                defaultMessage="Records of any standard-of-care treatments you've already tried"
              />
            </li>
            <li>
              <FormattedMessage
                id="directory.connect.success.prep.4"
                defaultMessage="A list of your current medications and known allergies"
              />
            </li>
          </ul>

          <Link to={`/programs/${programSlug}`} className="connect-form__state-cta">
            <FormattedMessage
              id="directory.connect.success.back"
              defaultMessage="Back to the program"
            />
          </Link>
        </div>
      </div>
    );
  }

  const isSubmitting = submitState.phase === "submitting";
  const isError = submitState.phase === "error";
  const submitDisabled =
    isSubmitting || fields.name.trim().length === 0 || fields.email.trim().length === 0;

  return (
    <div className="connect-form fade-up">
      <div className="connect-form__grid">
        <div className="connect-form__prose">
          <p className="connect-form__eyebrow">
            <span className="connect-form__dot" aria-hidden="true" />
            <FormattedMessage
              id="directory.connect.eyebrow"
              defaultMessage="Connect about {program}"
              values={{
                program: <em className="connect-form__em">{offering.program.name}</em>,
              }}
            />
          </p>

          <h1 className="connect-form__h1 serif">
            <FormattedMessage
              id="directory.connect.h1"
              defaultMessage="A note to {etc}."
              values={{
                etc: <em className="connect-form__em">{offering.etc.name}</em>,
              }}
            />
          </h1>

          {/* § 18.1 — explicit privacy framing block above the form. The
              copy below is the locked verbatim text from the PRD. */}
          <p className="connect-form__privacy">
            <FormattedMessage
              id="directory.connect.privacy"
              defaultMessage="Your information goes only to {etc} Lewis does not sell or share contact information. Lewis is not a marketing company."
              values={{
                etc: <em className="connect-form__em-accent">{offering.etc.name}.</em>,
              }}
            />
          </p>
          <p className="connect-form__privacy-coda">
            <FormattedMessage
              id="directory.connect.privacy_coda"
              defaultMessage="You don't need an account to submit this. The ETC's clinical coordinator follows up within two business days."
            />
          </p>

          <form className="connect-form__fields" onSubmit={onSubmit} noValidate>
            <div className="connect-form__field">
              <label className="connect-form__label" htmlFor="cf-name">
                <FormattedMessage id="directory.connect.field.name" defaultMessage="Your name" />
              </label>
              <input
                id="cf-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                className="connect-form__input"
                value={fields.name}
                onChange={(e) => update("name", e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="connect-form__field">
              <label className="connect-form__label" htmlFor="cf-email">
                <FormattedMessage id="directory.connect.field.email" defaultMessage="Email" />
              </label>
              <input
                id="cf-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="connect-form__input"
                value={fields.email}
                onChange={(e) => update("email", e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="connect-form__field">
              <label className="connect-form__label" htmlFor="cf-phone">
                <FormattedMessage id="directory.connect.field.phone" defaultMessage="Phone" />{" "}
                <span className="connect-form__opt">
                  <FormattedMessage
                    id="directory.connect.field.optional"
                    defaultMessage="Optional"
                  />
                </span>
              </label>
              <input
                id="cf-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                className="connect-form__input"
                value={fields.phone}
                onChange={(e) => update("phone", e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="connect-form__field">
              <label className="connect-form__label" htmlFor="cf-situation">
                <FormattedMessage
                  id="directory.connect.field.situation"
                  defaultMessage="Brief situation"
                />{" "}
                <span className="connect-form__opt">
                  <FormattedMessage
                    id="directory.connect.field.optional"
                    defaultMessage="Optional"
                  />
                </span>
              </label>
              <textarea
                id="cf-situation"
                name="situation"
                rows={5}
                className="connect-form__textarea"
                value={fields.situation}
                onChange={(e) => update("situation", e.target.value)}
                disabled={isSubmitting}
                maxLength={1000}
              />
              {/* § 18.1 refined warning copy. */}
              <p className="connect-form__help">
                <FormattedMessage
                  id="directory.connect.field.situation.warning"
                  defaultMessage="Please don't share specific medical details here — your ETC clinical team will collect those securely after they reach out."
                />
              </p>
            </div>

            {isError && (
              <p className="connect-form__error" role="alert" id="cf-error">
                <FormattedMessage
                  id={submitState.messageId}
                  defaultMessage={submitState.messageDefault}
                />
              </p>
            )}

            <div className="connect-form__submit-row">
              <button
                type="submit"
                className="connect-form__submit"
                disabled={submitDisabled}
                aria-describedby={isError ? "cf-error" : undefined}
              >
                {isSubmitting ? (
                  <FormattedMessage
                    id="directory.connect.submit.submitting"
                    defaultMessage="Sending…"
                  />
                ) : (
                  <FormattedMessage
                    id="directory.connect.submit"
                    defaultMessage="Send to {etc}"
                    values={{ etc: offering.etc.name }}
                  />
                )}
              </button>
            </div>
          </form>
        </div>

        <aside className="connect-form__rail" aria-label="What happens next">
          <p className="connect-form__rail-label">
            <FormattedMessage
              id="directory.connect.next.label"
              defaultMessage="What happens next"
            />
          </p>

          <div className="connect-form__step">
            <span className="connect-form__step-num" aria-hidden="true">
              i.
            </span>
            <div>
              <h2 className="connect-form__step-title serif">
                <FormattedMessage
                  id="directory.connect.next.1.title"
                  defaultMessage="You submit this note"
                />
              </h2>
              <p className="connect-form__step-desc">
                <FormattedMessage
                  id="directory.connect.next.1.desc"
                  defaultMessage="It goes straight to {etc}'s clinical coordinator."
                  values={{ etc: offering.etc.name }}
                />
              </p>
            </div>
          </div>

          <div className="connect-form__step">
            <span className="connect-form__step-num" aria-hidden="true">
              ii.
            </span>
            <div>
              <h2 className="connect-form__step-title serif">
                <FormattedMessage
                  id="directory.connect.next.2.title"
                  defaultMessage="They reach out within two business days"
                />
              </h2>
              <p className="connect-form__step-desc">
                <FormattedMessage
                  id="directory.connect.next.2.desc"
                  defaultMessage="By email or phone — whichever you preferred."
                />
              </p>
            </div>
          </div>

          <div className="connect-form__step">
            <span className="connect-form__step-num" aria-hidden="true">
              iii.
            </span>
            <div>
              <h2 className="connect-form__step-title serif">
                <FormattedMessage
                  id="directory.connect.next.3.title"
                  defaultMessage="Clinical review"
                />
              </h2>
              <p className="connect-form__step-desc">
                <FormattedMessage
                  id="directory.connect.next.3.desc"
                  defaultMessage="They'll ask for your treating clinician's recommendation and H&P securely, on their end."
                />
              </p>
            </div>
          </div>

          <div className="connect-form__step">
            <span className="connect-form__step-num" aria-hidden="true">
              iv.
            </span>
            <div>
              <h2 className="connect-form__step-title serif">
                <FormattedMessage
                  id="directory.connect.next.4.title"
                  defaultMessage="Account, if you want one"
                />
              </h2>
              <p className="connect-form__step-desc">
                <FormattedMessage
                  id="directory.connect.next.4.desc"
                  defaultMessage="After they have your note, Lewis offers to create an account so you can track the conversation."
                />
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
