import { Suspense, lazy, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";

import { EtcCard } from "../components/EtcCard";
import { EtcsFilters, type EtcFilterState } from "../components/EtcsFilters";
import { EmailSignupForm } from "../components/EmailSignupForm";
import { useEtcsList } from "./use-etcs-list";

// Mapbox SDK rides in this lazily-loaded chunk only — it never touches the
// homepage above-the-fold budget (slice 4 plan + directoryprd.md § 16.1).
const EtcMap = lazy(() => import("../components/EtcMap").then((m) => ({ default: m.EtcMap })));

/**
 * Slice 4 § 16.1 — /etcs index. Round 4 locked Variant A (list-first): a
 * filter rail + full-width ETC cards lead, with a quiet sticky map sidekick.
 * Chosen as the trust/verification surface — leads with license + accepting +
 * programs, map confirms location without dominating, degrades cleanly if
 * Mapbox is unavailable, and scales to a 50/50 layout once enough centers
 * license to justify geography-first scanning.
 */
export function EtcsIndexPage() {
  const intl = useIntl();
  const { data, loading, error, retry } = useEtcsList();
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    document.title = intl.formatMessage({
      id: "directory.etcs.title",
      defaultMessage: "Licensed Experimental Treatment Centers in Montana · Lewis",
    });
  }, [intl]);

  const filter: EtcFilterState = {
    regions: params.getAll("region"),
    acceptingOnly: params.get("accepting") === "true",
  };

  const all = useMemo(() => data?.etcs ?? [], [data]);
  const shown = useMemo(
    () =>
      all.filter(
        (e) =>
          (filter.regions.length === 0 || filter.regions.includes(e.city)) &&
          (!filter.acceptingOnly || e.acceptingPatients),
      ),
    [all, filter.regions, filter.acceptingOnly],
  );

  const toggleRegion = (city: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const current = next.getAll("region");
        next.delete("region");
        const updated = current.includes(city)
          ? current.filter((c) => c !== city)
          : [...current, city];
        for (const c of updated) next.append("region", c);
        return next;
      },
      { replace: true },
    );
  };

  const toggleAccepting = () => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (next.get("accepting") === "true") next.delete("accepting");
        else next.set("accepting", "true");
        return next;
      },
      { replace: true },
    );
  };

  const clearFilters = () => setParams(new URLSearchParams(), { replace: true });
  const hasFilters = filter.regions.length > 0 || filter.acceptingOnly;

  return (
    <>
      <div className="etcs-wrap etcs-head">
        <div className="ed-label">
          <FormattedMessage id="directory.etcs.label" defaultMessage="Licensed centers" />
        </div>
        <h1 className="etcs-h1">
          <FormattedMessage
            id="directory.etcs.h1"
            defaultMessage="Licensed Experimental Treatment Centers in Montana."
          />
        </h1>
        <p className="etcs-intro">
          <FormattedMessage
            id="directory.etcs.intro"
            defaultMessage="Montana's ETC licensure is rolling out. Check back as more centers come online — every center here is verified against Montana DPHHS public records."
          />
        </p>
      </div>

      <div className="etcs-wrap etcs-cols">
        {/* Filter rail */}
        {loading ? (
          <div className="etc-filters etc-filters--skeleton" aria-hidden="true">
            <div className="etcs-skel etcs-skel--line" style={{ width: "60%" }} />
            <div className="etcs-skel etcs-skel--line" style={{ width: "80%" }} />
            <div className="etcs-skel etcs-skel--line" style={{ width: "70%" }} />
          </div>
        ) : (
          <EtcsFilters
            all={all}
            state={filter}
            onToggleRegion={toggleRegion}
            onToggleAccepting={toggleAccepting}
          />
        )}

        {/* List */}
        <main className="etcs-list">
          {loading && (
            <>
              <p className="etcs-count etcs-skel etcs-skel--line" style={{ width: 120 }} />
              <div className="etc-card etc-card--skeleton" aria-hidden="true">
                <div className="etcs-skel etcs-skel--line" style={{ width: "50%", height: 26 }} />
                <div className="etcs-skel etcs-skel--line" style={{ width: "30%" }} />
                <div className="etcs-skel etcs-skel--block" />
              </div>
            </>
          )}

          {!loading && error && (
            <div className="etcs-error" role="alert">
              <p className="etcs-error__msg">
                <FormattedMessage
                  id="directory.etcs.error"
                  defaultMessage="We couldn't load the centers just now."
                />
              </p>
              <button type="button" className="etcs-error__retry" onClick={retry}>
                <FormattedMessage id="directory.etcs.retry" defaultMessage="Try again" />
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              <p className="etcs-count">
                <FormattedMessage
                  id="directory.etcs.count"
                  defaultMessage="{count, plural, =0 {No centers match} one {1 licensed center} other {# licensed centers}}"
                  values={{ count: shown.length }}
                />
              </p>

              {shown.length === 0 ? (
                <div className="etcs-empty">
                  <p>
                    <FormattedMessage
                      id="directory.etcs.empty"
                      defaultMessage="No centers match these filters yet."
                    />
                  </p>
                  {hasFilters && (
                    <button type="button" className="etc-card__pill" onClick={clearFilters}>
                      <FormattedMessage id="directory.etcs.clear" defaultMessage="Clear filters" />
                    </button>
                  )}
                </div>
              ) : (
                shown.map((etc) => <EtcCard key={etc.slug} etc={etc} />)
              )}

              <div className="etcs-more">
                <p className="etcs-more__note">
                  <FormattedMessage
                    id="directory.etcs.more"
                    defaultMessage="More centers are added here as Montana licenses them."
                  />
                </p>
                <EmailSignupForm source="browse_bottom" variant="card" />
                <p className="etcs-more__back">
                  <Link to="/browse" className="etc-card__pill">
                    <FormattedMessage
                      id="directory.etcs.browse_link"
                      defaultMessage="Browse treatments instead"
                    />
                  </Link>
                </p>
              </div>
            </>
          )}
        </main>

        {/* Map sidekick */}
        <aside className="etcs-mapcol">
          {!loading && !error && shown.length > 0 && (
            <div className="etcs-mapcol__sticky">
              <Suspense fallback={<div className="etc-map etc-map--loading" aria-hidden="true" />}>
                <EtcMap etcs={shown} />
              </Suspense>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
