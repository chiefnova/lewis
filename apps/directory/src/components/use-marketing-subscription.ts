import type {
  MarketingSubscriptionRequest,
  MarketingSubscriptionResponse,
} from "@lewis/shared/api/public";
import { useCallback, useState } from "react";

import { ApiNetworkError, ApiSchemaError, publicApi } from "../api/client";

// Slice 4 § 11.2 / 11.9 — drives the EmailSignupForm component (3 call sites:
// AnnouncementStrip, BeginningSection, /browse bottom). Tracks form lifecycle
// state so the component can render submitting / success / error variants
// without per-instance state plumbing.

export type MarketingSubscriptionState =
  | { phase: "idle" }
  | { phase: "submitting" }
  | { phase: "success"; message: string }
  | { phase: "error"; message: string };

const FRIENDLY_ERROR = "We couldn't save your email. Try again, or come back later.";

const VALIDATION_ERROR = "That email address doesn't look right. Check it and try again.";

const RATE_LIMIT_ERROR = "Too many submissions from this network. Try again in a minute.";

export function useMarketingSubscription() {
  const [state, setState] = useState<MarketingSubscriptionState>({ phase: "idle" });

  const submit = useCallback(async (payload: MarketingSubscriptionRequest) => {
    setState({ phase: "submitting" });
    try {
      const response: MarketingSubscriptionResponse = await publicApi.subscribeMarketing(payload);
      setState({ phase: "success", message: response.message });
    } catch (err: unknown) {
      if (err instanceof ApiNetworkError) {
        if (err.status === 400) {
          setState({ phase: "error", message: VALIDATION_ERROR });
          return;
        }
        if (err.status === 429) {
          setState({ phase: "error", message: RATE_LIMIT_ERROR });
          return;
        }
        setState({ phase: "error", message: FRIENDLY_ERROR });
        return;
      }
      if (err instanceof ApiSchemaError) {
        setState({ phase: "error", message: FRIENDLY_ERROR });
        return;
      }
      setState({ phase: "error", message: FRIENDLY_ERROR });
    }
  }, []);

  const reset = useCallback(() => setState({ phase: "idle" }), []);

  return { state, submit, reset };
}
