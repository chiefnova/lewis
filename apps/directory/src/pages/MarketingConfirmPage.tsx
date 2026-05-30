import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";

import { ApiNetworkError, ApiSchemaError, publicApi } from "../api/client";
import { useSeo } from "../seo/useSeo";

/**
 * Slice 4 § 11.9 — landing page for the Resend confirmation email link.
 *
 * The worker sends `https://lewis.health/marketing/confirm?token=<uuid>`;
 * this page reads the token, calls the SECURITY DEFINER confirm helper via
 * the API, and renders a calm status screen. Token URLs are never indexed
 * (noIndex), and the success/failed responses both return 200 + a boolean
 * so the page never leaks whether a specific token previously existed.
 *
 * After capturing the token we strip it from the visible URL so it does
 * not persist in browser history or get exposed if the user shares their
 * screen on the success page.
 */

type Phase = "loading" | "confirmed" | "already" | "invalid" | "error";

export function MarketingConfirmPage() {
  const [params] = useSearchParams();
  const tokenRef = useRef<string>(params.get("token") ?? "");
  const [phase, setPhase] = useState<Phase>("loading");
  const intl = useIntl();

  useSeo({
    title: intl.formatMessage({
      id: "directory.marketing.confirm.seo_title",
      defaultMessage: "Subscription confirmation — Lewis Health",
    }),
    noIndex: true,
  });

  useEffect(() => {
    const token = tokenRef.current;
    if (token && typeof window !== "undefined" && window.history?.replaceState) {
      try {
        window.history.replaceState({}, "", "/marketing/confirm");
      } catch {
        // SecurityError in sandbox — leave the URL as-is; the call below
        // still runs and the result is unaffected.
      }
    }
    if (!token) {
      setPhase("invalid");
      return;
    }
    const ctrl = new AbortController();
    publicApi
      .confirmMarketing(token, { signal: ctrl.signal })
      .then((res) => {
        if (ctrl.signal.aborted) return;
        setPhase(res.confirmed ? "confirmed" : "already");
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        if (err instanceof Error && err.name === "AbortError") return;
        if (err instanceof ApiNetworkError || err instanceof ApiSchemaError) {
          setPhase("error");
          return;
        }
        setPhase("error");
      });
    return () => ctrl.abort();
  }, []);

  return (
    <div className="mkt-wrap">
      {phase === "loading" && (
        <>
          <div className="mkt-spinner" aria-hidden="true" />
          <p className="mkt-loading">
            <FormattedMessage
              id="directory.marketing.confirm.loading"
              defaultMessage="Confirming your subscription…"
            />
          </p>
        </>
      )}

      {phase === "confirmed" && (
        <>
          <div className="mkt-mark mkt-mark--good" aria-hidden="true">
            ✓
          </div>
          <h1 className="mkt-h1">
            <FormattedMessage
              id="directory.marketing.confirm.title"
              defaultMessage="Subscription confirmed."
            />
          </h1>
          <p className="mkt-body">
            <FormattedMessage
              id="directory.marketing.confirm.body"
              defaultMessage="You'll hear from us when new programs or ETCs are added in Montana. We'll only email you about new directory listings, and you can unsubscribe from any message."
            />
          </p>
          <Link to="/" className="mkt-cta">
            <FormattedMessage
              id="directory.marketing.confirm.home"
              defaultMessage="Back to lewis.health"
            />
          </Link>
        </>
      )}

      {phase === "already" && (
        <>
          <div className="mkt-mark mkt-mark--quiet" aria-hidden="true">
            ✓
          </div>
          <h1 className="mkt-h1">
            <FormattedMessage
              id="directory.marketing.confirm.already.title"
              defaultMessage="You're all set."
            />
          </h1>
          <p className="mkt-body">
            <FormattedMessage
              id="directory.marketing.confirm.already.body"
              defaultMessage="This confirmation link has already been used or has expired. If you signed up recently, your subscription is already active."
            />
          </p>
          <Link to="/" className="mkt-cta">
            <FormattedMessage
              id="directory.marketing.confirm.home"
              defaultMessage="Back to lewis.health"
            />
          </Link>
        </>
      )}

      {phase === "invalid" && (
        <>
          <h1 className="mkt-h1">
            <FormattedMessage
              id="directory.marketing.confirm.invalid.title"
              defaultMessage="That link is missing a token."
            />
          </h1>
          <p className="mkt-body">
            <FormattedMessage
              id="directory.marketing.confirm.invalid.body"
              defaultMessage="The confirmation link in your email contains a token after ?token=. Try opening the link from the email directly."
            />
          </p>
          <Link to="/" className="mkt-cta">
            <FormattedMessage
              id="directory.marketing.confirm.home"
              defaultMessage="Back to lewis.health"
            />
          </Link>
        </>
      )}

      {phase === "error" && (
        <>
          <h1 className="mkt-h1">
            <FormattedMessage
              id="directory.marketing.confirm.error.title"
              defaultMessage="Something went wrong."
            />
          </h1>
          <p className="mkt-body">
            <FormattedMessage
              id="directory.marketing.confirm.error.body"
              defaultMessage="We couldn't reach the confirmation service. Try refreshing in a moment, or open the link again from your email."
            />
          </p>
          <Link to="/" className="mkt-cta">
            <FormattedMessage
              id="directory.marketing.confirm.home"
              defaultMessage="Back to lewis.health"
            />
          </Link>
        </>
      )}
    </div>
  );
}
