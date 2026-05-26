import { Link } from "react-router-dom";
import { FormattedMessage } from "react-intl";

import { useFeaturedConditions } from "./use-featured-conditions";

/**
 * Slice 4 § 11.4 — homepage FeaturedConditions block (PRIMARY, condition-first).
 *
 * Editorial table-of-contents per locked Variant B. Each row is a numbered
 * (i. ii. iii. iv.) entry: condition name + sub-line "Available now via
 * WST-057® at Big Sky ETC, Bozeman" + italic chev. The 5th row is a muted
 * "Coming soon for PTSD — Phase 2 sponsor onboarding next" entry that
 * foreshadows future expansion without overstating availability.
 *
 * Reads per-slug from /v1/public/conditions via useFeaturedConditions
 * (Promise.all over the 4 PN slugs + the 1 coming-soon slug). On per-slug
 * fetch failure, that row is silently omitted — the drift test in
 * apps/directory/src/data/featured-conditions.test.ts prevents this from
 * happening in practice by asserting every featured slug exists in the seed.
 */

const ROMAN = ["i.", "ii.", "iii.", "iv.", "v.", "vi.", "vii."];

const SUBLINE_DEFAULT = "Available now via WST-057® at Big Sky ETC, Bozeman";

interface FeaturedConditionsProps {
  /** Sub-line copy for live cards. Defaults to the WST-057 / Big Sky line. */
  subline?: string;
}

export function FeaturedConditions({ subline = SUBLINE_DEFAULT }: FeaturedConditionsProps) {
  const { live, comingSoon, loading } = useFeaturedConditions();

  return (
    <section className="featured-conditions">
      <div className="featured-conditions__container">
        <div className="featured-conditions__label">
          <FormattedMessage
            id="directory.homepage.featured_conditions.label"
            defaultMessage="II · Conditions"
          />
        </div>
        <h2 className="featured-conditions__h2">
          <FormattedMessage
            id="directory.homepage.featured_conditions.h2"
            defaultMessage="Conditions with experimental treatments in {italic}."
            values={{
              italic: <i>Montana</i>,
            }}
          />
        </h2>

        <div className="featured-conditions__toc" role="list">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="featured-conditions__row featured-conditions__row--skeleton"
                  role="listitem"
                  aria-hidden="true"
                >
                  <div className="featured-conditions__num">{ROMAN[i] ?? ""}</div>
                  <div className="featured-conditions__name shimmer" />
                  <div className="featured-conditions__sub shimmer" />
                  <div className="featured-conditions__chev shimmer" />
                </div>
              ))
            : null}

          {!loading &&
            live.map((cond, i) => (
              <Link
                key={cond.slug}
                to={`/conditions/${cond.slug}`}
                className="featured-conditions__row"
                role="listitem"
              >
                <div className="featured-conditions__num">{ROMAN[i] ?? `${i + 1}.`}</div>
                <div className="featured-conditions__name">{cond.name}</div>
                <div className="featured-conditions__sub">{subline}</div>
                <div className="featured-conditions__chev">
                  <FormattedMessage
                    id="directory.homepage.featured_conditions.read"
                    defaultMessage="Read →"
                  />
                </div>
              </Link>
            ))}

          {!loading && comingSoon ? (
            <div
              className="featured-conditions__row featured-conditions__row--muted"
              role="listitem"
            >
              <div className="featured-conditions__num">{ROMAN[live.length] ?? ""}</div>
              <div className="featured-conditions__name">
                <FormattedMessage
                  id="directory.homepage.featured_conditions.coming_soon_name"
                  defaultMessage="{name} — coming soon"
                  values={{ name: comingSoon.name }}
                />
              </div>
              <div className="featured-conditions__sub">
                <FormattedMessage
                  id="directory.homepage.featured_conditions.coming_soon_sub"
                  defaultMessage="Phase 2 sponsor onboarding next."
                />
              </div>
              <div className="featured-conditions__chev" aria-hidden="true" />
            </div>
          ) : null}
        </div>

        <div className="featured-conditions__cta">
          <Link to="/conditions" className="featured-conditions__cta-link">
            <FormattedMessage
              id="directory.homepage.featured_conditions.cta"
              defaultMessage="Browse all conditions →"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
