import type {
  MarketingSubscriptionRequest,
  MarketingSubscriptionResponse,
} from "@lewis/shared/api/public";
import { useCallback, useRef, useState } from "react";

import { ApiNetworkError, ApiSchemaError, publicApi } from "../api/client";

// Slice 4 § 11.2 / 11.9 — drives the EmailSignupForm component (3 call sites:
// AnnouncementStrip, BeginningSection, /browse bottom). Tracks form lifecycle
// state so the component can render submitting / success / error variants
// without per-instance state plumbing.
//
// User-facing copy lives as i18n message descriptors below. The hook returns
// `messageId` + `messageDefault` instead of a pre-formatted string so the
// EmailSignupForm consumer can render via <FormattedMessage> at the call
// site (preserves SSR/CSR locale parity and lets the message catalog be the
// single source of truth for the English wording).

export type MarketingSubscriptionPhase =
  | { phase: "idle" }
  | { phase: "submitting" }
  | {
      phase: "success";
      messageId: string;
      messageDefault: string;
      apiMessage: string;
    }
  | { phase: "error"; messageId: string; messageDefault: string };

const ERROR_FRIENDLY = {
  id: "directory.marketing.error.friendly",
  defaultMessage: "We couldn't save your email. Try again, or come back later.",
} as const;

const ERROR_VALIDATION = {
  id: "directory.marketing.error.validation",
  defaultMessage: "That email address doesn't look right. Check it and try again.",
} as const;

const ERROR_RATE_LIMIT = {
  id: "directory.marketing.error.rate_limit",
  defaultMessage: "Too many submissions from this network. Try again in a minute.",
} as const;

const SUCCESS_MESSAGE = {
  id: "directory.marketing.success",
  defaultMessage: "Check your email to confirm. We won't email you again unless you confirm.",
} as const;

export function useMarketingSubscription() {
  const [state, setState] = useState<MarketingSubscriptionPhase>({ phase: "idle" });
  // In-flight guard: prevents duplicate POSTs when a user double-clicks the
  // submit button or the form fires onSubmit twice. Survives React StrictMode
  // double-invocation in dev because it's a ref (not state).
  const inFlightRef = useRef(false);

  const submit = useCallback(async (payload: MarketingSubscriptionRequest) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setState({ phase: "submitting" });
    try {
      const response: MarketingSubscriptionResponse = await publicApi.subscribeMarketing(payload);
      setState({
        phase: "success",
        messageId: SUCCESS_MESSAGE.id,
        messageDefault: SUCCESS_MESSAGE.defaultMessage,
        // The API also returns its own message — pass it through so callers
        // that prefer the server-side wording (counsel-reviewed) can opt in.
        // The default render path uses the i18n message; consumers can
        // choose apiMessage if they specifically want the canonical server
        // copy. EmailSignupForm uses the i18n message.
        apiMessage: response.message,
      });
    } catch (err: unknown) {
      if (err instanceof ApiNetworkError) {
        if (err.status === 400) {
          setState({
            phase: "error",
            messageId: ERROR_VALIDATION.id,
            messageDefault: ERROR_VALIDATION.defaultMessage,
          });
          return;
        }
        if (err.status === 429) {
          setState({
            phase: "error",
            messageId: ERROR_RATE_LIMIT.id,
            messageDefault: ERROR_RATE_LIMIT.defaultMessage,
          });
          return;
        }
        setState({
          phase: "error",
          messageId: ERROR_FRIENDLY.id,
          messageDefault: ERROR_FRIENDLY.defaultMessage,
        });
        return;
      }
      if (err instanceof ApiSchemaError) {
        setState({
          phase: "error",
          messageId: ERROR_FRIENDLY.id,
          messageDefault: ERROR_FRIENDLY.defaultMessage,
        });
        return;
      }
      setState({
        phase: "error",
        messageId: ERROR_FRIENDLY.id,
        messageDefault: ERROR_FRIENDLY.defaultMessage,
      });
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  const reset = useCallback(() => {
    inFlightRef.current = false;
    setState({ phase: "idle" });
  }, []);

  return { state, submit, reset };
}
