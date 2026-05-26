import { Link } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";

import type { PublicEtcSummary } from "@lewis/shared/api/public";
import { formatEtcName } from "../data/etcs-content";

/**
 * Slice 4 § 16.1 — ETC list card for the /etcs index (Round 4 locked Variant A,
 * list-first). Leads with the verification facts a patient checks first:
 * name, city, license number, programs offered, accepting status — then the
 * "View profile" CTA. Reuses the editorial paper-bright card treatment.
 */
export function EtcCard({ etc }: { etc: PublicEtcSummary }) {
  const intl = useIntl();
  return (
    <article className="etc-card">
      <div className="etc-card__top">
        <div>
          <h3 className="etc-card__name">{formatEtcName(etc.name)}</h3>
          <div className="etc-card__loc">{etc.city}, Montana</div>
        </div>
        <span className="etc-card__badge">
          <FormattedMessage
            id="directory.etcs.card.license"
            defaultMessage="License #{number}"
            values={{ number: etc.licenseNumber }}
          />
        </span>
      </div>

      <div className="etc-card__meta">
        <div className="etc-card__mi">
          <b>{etc.programCount}</b>
          <FormattedMessage
            id="directory.etcs.card.programs"
            defaultMessage="{count, plural, one {program offered} other {programs offered}}"
            values={{ count: etc.programCount }}
          />
        </div>
        {etc.acceptingPatients ? (
          <span className="etc-card__tag">
            <span className="etc-card__dot" aria-hidden="true" />
            <FormattedMessage
              id="directory.etcs.card.accepting"
              defaultMessage="Currently accepting new patients"
            />
          </span>
        ) : (
          <span className="etc-card__tag etc-card__tag--muted">
            <FormattedMessage
              id="directory.etcs.card.not_accepting"
              defaultMessage="Not currently accepting new patients"
            />
          </span>
        )}
      </div>

      <div className="etc-card__cta">
        <span className="etc-card__claim">
          <FormattedMessage id="directory.etcs.card.claimed" defaultMessage="Claimed by operator" />
        </span>
        <Link
          to={`/etcs/${etc.slug}`}
          className="etc-card__pill etc-card__open"
          aria-label={intl.formatMessage(
            { id: "directory.etcs.card.view_aria", defaultMessage: "View profile for {name}" },
            { name: formatEtcName(etc.name) },
          )}
        >
          <FormattedMessage id="directory.etcs.card.view" defaultMessage="View profile" />
        </Link>
      </div>
    </article>
  );
}
