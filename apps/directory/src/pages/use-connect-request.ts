import type { ConnectRequestPayload, ConnectRequestResponse } from "@lewis/shared/api/public";
import { useCallback, useRef, useState } from "react";

import { ApiNetworkError, ApiSchemaError, publicApi } from "../api/client";

// Slice 5 § 18.2 — drives ConnectPage's onSubmit. Same shape as
// use-marketing-subscription: a phase state machine with i18n message
// IDs / defaults instead of inline English strings so the EmailSignupForm
// + ConnectPage render via <FormattedMessage> at the call site.
//
// In-flight guard prevents duplicate POSTs if the user double-clicks
// submit. The guard is a ref (not state) so it survives React
// StrictMode's double-invoke in dev without spurious second submits.

export type ConnectRequestPhase =
  | { phase: "idle" }
  | { phase: "submitting" }
  | {
      phase: "success";
      connectRequestId: string;
      messageId: string;
      messageDefault: string;
    }
  | { phase: "error"; messageId: string; messageDefault: string };

const ERROR_FRIENDLY = {
  id: "directory.connect.error.friendly",
  defaultMessage: "We couldn't submit your request. Try again, or come back later.",
} as const;

const ERROR_VALIDATION = {
  id: "directory.connect.error.validation",
  defaultMessage: "Some fields look invalid. Check your email and name, then try again.",
} as const;

const ERROR_RATE_LIMIT = {
  id: "directory.connect.error.rate_limit",
  defaultMessage: "Too many submissions from this network. Try again in a minute.",
} as const;

const SUCCESS_MESSAGE = {
  id: "directory.connect.success",
  defaultMessage:
    "We've passed your inquiry to the licensed ETC. They'll reach out within two business days.",
} as const;

export function useConnectRequest() {
  const [state, setState] = useState<ConnectRequestPhase>({ phase: "idle" });
  const inFlightRef = useRef(false);

  const submit = useCallback(async (payload: ConnectRequestPayload) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setState({ phase: "submitting" });
    try {
      const response: ConnectRequestResponse = await publicApi.submitConnectRequest(payload);
      setState({
        phase: "success",
        connectRequestId: response.connectRequestId,
        messageId: SUCCESS_MESSAGE.id,
        messageDefault: SUCCESS_MESSAGE.defaultMessage,
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
