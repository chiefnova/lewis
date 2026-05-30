import type {
  EligibilityCompleteResponse,
  EligibilityResumeResponse,
  EligibilityStartResponse,
} from "@lewis/shared/api/public";
import { useCallback, useEffect, useRef, useState } from "react";

import { ApiNetworkError, ApiSchemaError, publicApi } from "../api/client";

// Slice 5 § 17 — server-bootstrapped eligibility-screen session.
//
// State machine:
//   idle           — first render before mount-effect resolves localStorage
//   resuming       — calling /sessions/:token to revive an existing token
//   starting       — calling /start to mint a fresh token
//   ready          — session is live (in_progress) and we have answers + token
//   completing     — calling /sessions/:token/complete
//   completed      — session closed with pass/fail outcome
//   expired        — stored token expired or unknown to the server
//   error          — transient network or schema error; retry permitted
//
// localStorage key: `lewis:eligibility:<programSlug>`. We store ONLY the
// session token there; the canonical answers + status live on the server.
// On mount we check localStorage; if a token exists, /sessions/:token
// resumes it; if it 404s (expired), we mint a fresh one. On a brand-new
// screen we /start immediately.
//
// Caveat: the question manifest itself stays client-side (see
// apps/directory/src/data/eligibility.ts) — slice 5 doesn't push it to
// the API. The server only audits the token, answers, and final
// outcome.

const TOKEN_KEY_PREFIX = "lewis:eligibility:";

function tokenKey(slug: string): string {
  return `${TOKEN_KEY_PREFIX}${slug}`;
}

function readStoredToken(slug: string): string | null {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(tokenKey(slug)) : null;
  } catch {
    return null;
  }
}

/**
 * Public reader for the eligibility session token. Used by the connect-form
 * to attach the token to a connect_request submission (so the ETC can join
 * the session's audit row to the request, per § 18.2).
 *
 * Returns the raw UUID string the API minted via /start, or null if the
 * patient never ran the self-screen on this device.
 */
export function readEligibilityToken(slug: string): string | null {
  return readStoredToken(slug);
}

function writeStoredToken(slug: string, token: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(tokenKey(slug), token);
  } catch {
    /* localStorage is best-effort; private windows in Safari throw on set */
  }
}

function clearStoredToken(slug: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(tokenKey(slug));
  } catch {
    /* same as write */
  }
}

export type EligibilitySessionPhase =
  | { phase: "idle" }
  | { phase: "resuming" }
  | { phase: "starting" }
  | {
      phase: "ready";
      sessionToken: string;
      answers: Record<string, string>;
      expiresAt: string;
    }
  | { phase: "completing"; sessionToken: string }
  | {
      phase: "completed";
      sessionToken: string;
      result: "passed" | "failed";
      failedCriterion: string | null;
    }
  | { phase: "expired" }
  | { phase: "error"; message: string };

export type UseEligibilitySession = {
  state: EligibilitySessionPhase;
  /** Append + persist a single answer. Returns false if the session is no longer in_progress. */
  submitAnswer: (questionId: string, value: string) => Promise<boolean>;
  /** Close the session with a pass/fail outcome. */
  complete: (input: { passed: boolean; failedCriterion: string | null }) => Promise<void>;
  /** Forget the local token and re-mint a new session. */
  restart: () => Promise<void>;
};

export function useEligibilitySession(programSlug: string): UseEligibilitySession {
  const [state, setState] = useState<EligibilitySessionPhase>({ phase: "idle" });
  // Hold the live answers in a ref alongside the state object so the
  // submitAnswer closure can read + merge without re-creating itself on
  // every state transition.
  const answersRef = useRef<Record<string, string>>({});
  const ctrlRef = useRef<AbortController | null>(null);

  // Mount: resume from localStorage if a token exists; else start fresh.
  useEffect(() => {
    const ctrl = new AbortController();
    ctrlRef.current?.abort();
    ctrlRef.current = ctrl;

    const stored = readStoredToken(programSlug);

    const startFresh = async () => {
      setState({ phase: "starting" });
      try {
        const fresh: EligibilityStartResponse = await publicApi.startEligibility(programSlug, {
          signal: ctrl.signal,
        });
        if (ctrl.signal.aborted) return;
        writeStoredToken(programSlug, fresh.sessionToken);
        answersRef.current = {};
        setState({
          phase: "ready",
          sessionToken: fresh.sessionToken,
          answers: {},
          expiresAt: fresh.expiresAt,
        });
      } catch (err: unknown) {
        if (ctrl.signal.aborted) return;
        if (err instanceof Error && err.name === "AbortError") return;
        setState({ phase: "error", message: friendlyMessage(err) });
      }
    };

    const resume = async (token: string) => {
      setState({ phase: "resuming" });
      try {
        const resumed: EligibilityResumeResponse = await publicApi.resumeEligibility(token, {
          signal: ctrl.signal,
        });
        if (ctrl.signal.aborted) return;

        // The server may resume into a completed state — surface it
        // directly rather than walking back through the question flow.
        if (resumed.status === "passed" || resumed.status === "failed") {
          answersRef.current = resumed.answers;
          setState({
            phase: "completed",
            sessionToken: token,
            result: resumed.status,
            failedCriterion: resumed.failedCriterion,
          });
          return;
        }

        answersRef.current = resumed.answers;
        setState({
          phase: "ready",
          sessionToken: token,
          answers: resumed.answers,
          expiresAt: resumed.expiresAt,
        });
      } catch (err: unknown) {
        if (ctrl.signal.aborted) return;
        if (err instanceof Error && err.name === "AbortError") return;
        if (err instanceof ApiNetworkError && err.status === 404) {
          // Expired / unknown token — clear local + start fresh. The UI
          // can render an "expired" toast briefly, but the right
          // pragmatic posture is to silently re-mint so the patient
          // doesn't lose their flow.
          clearStoredToken(programSlug);
          await startFresh();
          return;
        }
        setState({ phase: "error", message: friendlyMessage(err) });
      }
    };

    if (stored) {
      void resume(stored);
    } else {
      void startFresh();
    }

    return () => {
      ctrl.abort();
    };
  }, [programSlug]);

  const submitAnswer = useCallback(
    async (questionId: string, value: string): Promise<boolean> => {
      // Read the current sessionToken from state via a ref-ish closure —
      // we re-create the callback on programSlug changes, but the
      // sessionToken comes from the most recent state.
      const cur = state;
      if (cur.phase !== "ready") return false;

      try {
        const res = await publicApi.submitEligibilityAnswer(cur.sessionToken, {
          questionId,
          value,
        });
        if (!res.accepted) {
          clearStoredToken(programSlug);
          setState({ phase: "expired" });
          return false;
        }
        answersRef.current = { ...answersRef.current, [questionId]: value };
        setState({
          phase: "ready",
          sessionToken: cur.sessionToken,
          answers: answersRef.current,
          expiresAt: cur.expiresAt,
        });
        return true;
      } catch (err: unknown) {
        if (err instanceof ApiNetworkError && err.status === 404) {
          clearStoredToken(programSlug);
          setState({ phase: "expired" });
          return false;
        }
        setState({ phase: "error", message: friendlyMessage(err) });
        return false;
      }
    },
    [state, programSlug],
  );

  const complete = useCallback(
    async (input: { passed: boolean; failedCriterion: string | null }): Promise<void> => {
      const cur = state;
      if (cur.phase !== "ready") return;
      setState({ phase: "completing", sessionToken: cur.sessionToken });
      try {
        const res: EligibilityCompleteResponse = await publicApi.completeEligibility(
          cur.sessionToken,
          input,
        );
        setState({
          phase: "completed",
          sessionToken: cur.sessionToken,
          result: res.result,
          failedCriterion: res.failedCriterion,
        });
      } catch (err: unknown) {
        if (err instanceof ApiNetworkError && err.status === 404) {
          clearStoredToken(programSlug);
          setState({ phase: "expired" });
          return;
        }
        setState({ phase: "error", message: friendlyMessage(err) });
      }
    },
    [state, programSlug],
  );

  const restart = useCallback(async (): Promise<void> => {
    clearStoredToken(programSlug);
    answersRef.current = {};
    setState({ phase: "starting" });
    try {
      const fresh = await publicApi.startEligibility(programSlug);
      writeStoredToken(programSlug, fresh.sessionToken);
      setState({
        phase: "ready",
        sessionToken: fresh.sessionToken,
        answers: {},
        expiresAt: fresh.expiresAt,
      });
    } catch (err: unknown) {
      setState({ phase: "error", message: friendlyMessage(err) });
    }
  }, [programSlug]);

  return { state, submitAnswer, complete, restart };
}

function friendlyMessage(err: unknown): string {
  if (err instanceof ApiNetworkError) {
    return `Network error (${err.status}). Try again.`;
  }
  if (err instanceof ApiSchemaError) {
    return "We got an unexpected response from the server. Try refreshing.";
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Try refreshing.";
}
