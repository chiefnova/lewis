import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FormattedMessage } from "react-intl";

import { ApiNetworkError, ApiSchemaError, publicApi } from "../api/client";
import { useSeo } from "../seo/useSeo";

/**
 * Slice 4 § 11.9 — landing page for the unsubscribe token URL.
 *
 * Reads ?token=<uuid> and calls the SECURITY DEFINER unsubscribe helper via
 * the API. Token URLs are noIndex. The success/failed paths both return 200
 * + a boolean so the page never confirms whether the token existed before.
 */

type Phase = "loading" | "unsubscribed" | "already" | "invalid" | "error";

export function MarketingUnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [phase, setPhase] = useState<Phase>("loading");

  useSeo({
    title: "Unsubscribe — Lewis Health",
    noIndex: true,
  });

  useEffect(() => {
    if (!token) {
      setPhase("invalid");
      return;
    }
    const ctrl = new AbortController();
    publicApi
      .unsubscribeMarketing(token, { signal: ctrl.signal })
      .then((res) => {
        if (ctrl.signal.aborted) return;
        setPhase(res.unsubscribed ? "unsubscribed" : "already");
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
  }, [token]);

  return (
    <div className="mkt-wrap">
      {phase === "loading" && (
        <>
          <div className="mkt-spinner" aria-hidden="true" />
          <p className="mkt-loading">
            <FormattedMessage
              id="directory.marketing.unsub.loading"
              defaultMessage="Unsubscribing…"
            />
          </p>
        </>
      )}

      {phase === "unsubscribed" && (
        <>
          <div className="mkt-mark mkt-mark--good" aria-hidden="true">
            ✓
          </div>
          <h1 className="mkt-h1">
            <FormattedMessage
              id="directory.marketing.unsub.title"
              defaultMessage="You've been unsubscribed."
            />
          </h1>
          <p className="mkt-body">
            <FormattedMessage
              id="directory.marketing.unsub.body"
              defaultMessage="We won't email you about new programs or ETCs again. You can always re-subscribe from the signup at lewis.health."
            />
          </p>
          <Link to="/" className="mkt-cta">
            <FormattedMessage
              id="directory.marketing.unsub.home"
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
              id="directory.marketing.unsub.already.title"
              defaultMessage="You're not on the list."
            />
          </h1>
          <p className="mkt-body">
            <FormattedMessage
              id="directory.marketing.unsub.already.body"
              defaultMessage="This unsubscribe link has already been used, or the address it points to is not currently subscribed. Either way, we won't email you."
            />
          </p>
          <Link to="/" className="mkt-cta">
            <FormattedMessage
              id="directory.marketing.unsub.home"
              defaultMessage="Back to lewis.health"
            />
          </Link>
        </>
      )}

      {phase === "invalid" && (
        <>
          <h1 className="mkt-h1">
            <FormattedMessage
              id="directory.marketing.unsub.invalid.title"
              defaultMessage="That link is missing a token."
            />
          </h1>
          <p className="mkt-body">
            <FormattedMessage
              id="directory.marketing.unsub.invalid.body"
              defaultMessage="The unsubscribe link in your email contains a token after ?token=. Try opening the link directly from the email."
            />
          </p>
          <Link to="/" className="mkt-cta">
            <FormattedMessage
              id="directory.marketing.unsub.home"
              defaultMessage="Back to lewis.health"
            />
          </Link>
        </>
      )}

      {phase === "error" && (
        <>
          <h1 className="mkt-h1">
            <FormattedMessage
              id="directory.marketing.unsub.error.title"
              defaultMessage="Something went wrong."
            />
          </h1>
          <p className="mkt-body">
            <FormattedMessage
              id="directory.marketing.unsub.error.body"
              defaultMessage="We couldn't reach the unsubscribe service. Try refreshing in a moment, or open the link again from your email."
            />
          </p>
          <Link to="/" className="mkt-cta">
            <FormattedMessage
              id="directory.marketing.unsub.home"
              defaultMessage="Back to lewis.health"
            />
          </Link>
        </>
      )}
    </div>
  );
}
