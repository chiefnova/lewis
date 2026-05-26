import { FormattedMessage } from "react-intl";

import type { PublicEtcSummary } from "@lewis/shared/api/public";

/**
 * Slice 4 § 16.1 — filter rail for the /etcs index (Round 4 Variant A).
 *
 * Filters run client-side over the already-loaded ETC list and keep their
 * state in the URL (handled by the page via useSearchParams) so links are
 * shareable. Two functional facets at MVP-0:
 *   - Region (derived from the distinct cities in the result set)
 *   - Accepting new patients (toggle)
 *
 * The "programs offered" facet from the design is deferred: the public ETC
 * summary carries programCount but not program identity, so a per-program
 * filter needs a backend extension (tracked for when 2+ programs exist). We
 * show a static, non-interactive line for it instead of faking a filter.
 */

export interface EtcFilterState {
  regions: string[];
  acceptingOnly: boolean;
}

interface EtcsFiltersProps {
  all: ReadonlyArray<PublicEtcSummary>;
  state: EtcFilterState;
  onToggleRegion: (city: string) => void;
  onToggleAccepting: () => void;
}

export function EtcsFilters({ all, state, onToggleRegion, onToggleAccepting }: EtcsFiltersProps) {
  // Region facet: distinct cities + how many centers each holds. Counts respect
  // the accepting toggle so the rail reflects what the list will show.
  const base = state.acceptingOnly ? all.filter((e) => e.acceptingPatients) : all;
  const regionCounts = new Map<string, number>();
  for (const etc of base) regionCounts.set(etc.city, (regionCounts.get(etc.city) ?? 0) + 1);
  const regions = [...regionCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <aside className="etc-filters" aria-label="Filter centers">
      <div className="etc-filters__grp">
        <h4 className="etc-filters__h4">
          <FormattedMessage id="directory.etcs.filters.region" defaultMessage="By region" />
        </h4>
        {regions.map(([city, count]) => {
          const on = state.regions.includes(city);
          return (
            <label key={city} className="etc-filters__opt">
              <input
                type="checkbox"
                className="etc-filters__cb"
                checked={on}
                onChange={() => onToggleRegion(city)}
              />
              <span
                className="etc-filters__box"
                data-on={on ? "true" : undefined}
                aria-hidden="true"
              />
              <span>{city}</span>
              <span className="etc-filters__ct">{count}</span>
            </label>
          );
        })}
        <p className="etc-filters__note">
          <FormattedMessage
            id="directory.etcs.filters.region_note"
            defaultMessage="More regions appear as centers license."
          />
        </p>
      </div>

      <div className="etc-filters__grp">
        <h4 className="etc-filters__h4">
          <FormattedMessage
            id="directory.etcs.filters.programs"
            defaultMessage="Programs offered"
          />
        </h4>
        <p className="etc-filters__static">
          <FormattedMessage
            id="directory.etcs.filters.programs_static"
            defaultMessage="WST-057® · offered statewide"
          />
        </p>
      </div>

      <div className="etc-filters__grp etc-filters__grp--last">
        <label className="etc-filters__toggle">
          <input
            type="checkbox"
            className="etc-filters__cb"
            checked={state.acceptingOnly}
            onChange={onToggleAccepting}
          />
          <span
            className="etc-filters__sw"
            data-on={state.acceptingOnly ? "true" : undefined}
            aria-hidden="true"
          />
          <FormattedMessage
            id="directory.etcs.filters.accepting"
            defaultMessage="Accepting new patients"
          />
        </label>
      </div>
    </aside>
  );
}
