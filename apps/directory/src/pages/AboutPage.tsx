import { FormattedMessage } from "react-intl";

import { useSeo, siteUrl } from "../seo/useSeo";

/**
 * Slice 5 § 24 — /about — Lewis company page.
 *
 * Round 7 winner: Variant C · Letter from the team. The page reads as a
 * single sustained letter from "The Lewis team" — no individual founders
 * named, no card grids, no H2 sections. Section transitions are italic
 * Fraunces "markers" that carry the same editorial weight as the bitterroot
 * story without breaking the prose flow.
 *
 * Section order:
 *   1. H1 ("About Lewis.")
 *   2. Founding story (3 paragraphs, PRD § 24.2 rev 2 verbatim):
 *      - Expedition setup (Meriwether Lewis + William Clark + Corps of
 *        Discovery + Thomas Jefferson, 1804–1806, St. Louis to Pacific)
 *      - Bitterroot stanza (Lewisia rediviva + taproot revival
 *        etymology — the rediviva-revival mechanism closes the metaphor
 *        loop: "brought back to life" → platform brings treatments
 *        within reach)
 *      - Metaphor turn (we built it to be the same kind of careful
 *        record for a new frontier)
 *   3. Marker "Our mission." + Mission paragraph
 *   4. Marker "Why this exists." + 2 regime-context paragraphs
 *   5. Marker "Who we work with." + design-partner paragraph (Big Sky
 *      ETC + WinSanTor — institutional partners only, no individual
 *      staff named)
 *   6. Marker "What Lewis is — and isn't." + independence paragraph
 *   7. Marker "What's next." + roadmap paragraph
 *   8. Team signoff ("Sincerely, / The Lewis team / lewis.health")
 *   9. Contacts strip (3 emails: press@, investors@, hello@)
 *   10. Independence statement (verbatim shipped across /for-clinicians,
 *       /for-manufacturers, /for-etcs, /platform footers)
 *
 * Sticky rail (right):
 *   - 1 primary CTA "Talk to the team" → mailto:hello@lewis.health
 *   - "Reach us" card with the same 3 emails as the in-letter contacts
 *     strip (intentional duplication — reachable from anywhere on the
 *     page, both above and below the fold)
 *
 * Voice: collective ("we" / "The Lewis team"), peer-level, calm. The
 * bitterroot stanza is the only place the typography breaks rhythm with
 * mild literary tone. No marketing copy. No urgency.
 *
 * Locked decisions (user override of PRD § 24.1 leadership bullet):
 *   - Leadership section DEFERRED past MVP-0. Page surfaces only the
 *     "Lewis team" collective voice. Individual leadership names (founder
 *     + manufacturer lead) stay internal context until v1.
 *   - Stanley Kim's name (manufacturer lead) does NOT appear here. WinSanTor
 *     and Big Sky ETC do appear — institutional partners, not internal
 *     team members.
 *
 * Same chrome as /for-clinicians, /for-manufacturers, /for-etcs, /platform:
 *   - 1180px wrap, 756px letter column, 320px rail, 40px gap
 *   - 65ch readability cap on prose paragraphs
 *
 * Email: hello@lewis.health, press@lewis.health, investors@lewis.health
 * — all to be provisioned before launch per slice 5 posture.
 */
export function AboutPage() {
  useSeo({
    title: "About Lewis — Lewis Health",
    description:
      "Lewis is independent infrastructure for Montana's SB 535 access. Named for Meriwether Lewis and the Corps of Discovery — built to be the same kind of careful record for Montana's experimental treatment program.",
    canonical: siteUrl("/about"),
  });

  return (
    <div className="about fade-up">
      <div className="about__grid">
        {/* LEFT: letter prose. Same chrome convention as /for-clinicians,
            /for-manufacturers, /for-etcs, /platform. No max-width cap on
            .about__letter; prose paragraphs get a 65ch readability cap
            via .about__letter p. */}
        <div className="about__letter-col">
          <h1 className="about__h1 serif">
            <FormattedMessage
              id="directory.about.h1"
              defaultMessage="About {em}"
              values={{
                em: (
                  <em className="about__h1-em">
                    <FormattedMessage id="directory.about.h1.em" defaultMessage="Lewis." />
                  </em>
                ),
              }}
            />
          </h1>

          <div className="about__letter">
            {/* PRD § 24.2 (rev 2) founding story — three paragraphs. The
                expedition setup + bitterroot stanza + metaphor turn each
                get their own beat. Bitterroot earns italic accent on the
                taxonomic name + the translation; the taproot etymology
                closes the rediviva-revival metaphor loop so "brought
                back to life" reads as a literal parallel, not a
                translation. */}
            <div className="about__founding">
              <p>
                <FormattedMessage
                  id="directory.about.founding.p1"
                  defaultMessage="Lewis is named for Meriwether Lewis, who together with {clark} led the {corps} — Thomas Jefferson's 1804–1806 expedition to document the plants, animals, peoples, and geography of an unknown American frontier. They traveled from St. Louis to the Pacific and back, returning with thousands of pages of journals, hundreds of specimens, and one of the most thorough records of unmapped territory in American history."
                  values={{
                    clark: <strong>William Clark</strong>,
                    corps: <strong>Corps of Discovery</strong>,
                  }}
                />
              </p>
              <p>
                <FormattedMessage
                  id="directory.about.founding.p2"
                  defaultMessage="Lewis catalogued the bitterroot, Montana's state flower, whose scientific name {rediviva} honors him and means {meaning} — a reference to the plant's taproot, which revives after being pressed and dried."
                  values={{
                    rediviva: <em className="about__accent">Lewisia rediviva</em>,
                    meaning: <em className="about__accent">brought back to life</em>,
                  }}
                />
              </p>

              {/* /design-shotgun Round 9 winner: the 1836 Hooker plate from
                  Curtis's Botanical Magazine — the original published
                  botanical illustration that named Lewisia rediviva and
                  printed the description of the taproot revival. Museum-mat
                  treatment (Round 8 winner) matching the Glacier photo on
                  the homepage. Public domain (1836). Decorative
                  (aria-hidden) — the citation under the figure is the only
                  on-page visible attribution. */}
              <figure className="about__founding-photo" aria-hidden="true">
                <span className="about__founding-photo-mat">
                  <img
                    src="/images/montana/bitterroot-hooker-1836.webp"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={800}
                    height={600}
                  />
                </span>
                <figcaption>
                  <FormattedMessage
                    id="directory.about.founding.photo.caption"
                    defaultMessage="Hooker's illustrated article in Curtis's Botanical Magazine on the extraordinary revival of {rediviva}. (1836 · Public Domain)"
                    values={{
                      rediviva: <em>Lewisia rediviva</em>,
                    }}
                  />
                </figcaption>
              </figure>

              <p>
                <FormattedMessage
                  id="directory.about.founding.p3"
                  defaultMessage="We named the platform Lewis because we built it to be the same kind of careful record for a new frontier: Montana's experimental treatment program, the first of its kind in the country, and the patients whose treatments it brings within reach."
                />
              </p>
            </div>

            <p className="about__marker">
              <FormattedMessage id="directory.about.mission.marker" defaultMessage="Our mission." />
            </p>
            <p>
              <FormattedMessage
                id="directory.about.mission.body"
                defaultMessage="Lewis exists to bring experimental treatments within reach of patients who cannot find them anywhere else. Montana's regime made these treatments legally available; our job is to make them findable, verifiable, and reachable — so a patient out of options can see what exists, confirm it is real, and contact the people offering it in days, not months."
              />
            </p>

            <p className="about__marker">
              <FormattedMessage
                id="directory.about.exists.marker"
                defaultMessage="Why this exists."
              />
            </p>
            <p>
              <FormattedMessage
                id="directory.about.exists.p1"
                defaultMessage="Montana's SB 535 was signed in May 2025 and operationalized through MAR 2026-427.1 in April 2026. The regime is, on paper, the most expansive Right-to-Try framework in the country — and the first to license a new class of clinic (the Experimental Treatment Center) to actually administer investigational treatments under state supervision. {accent} Manufacturers and ETC operators looking to stand up Montana programs in 2026 had three options: build it themselves, glue together SaaS that was never designed for SB 535, or wait."
                values={{
                  accent: (
                    <em className="about__accent">
                      <FormattedMessage
                        id="directory.about.exists.p1.accent"
                        defaultMessage="No fit-for-purpose software existed."
                      />
                    </em>
                  ),
                }}
              />
            </p>
            <p>
              <FormattedMessage
                id="directory.about.exists.p2"
                defaultMessage="We built Lewis because none of those orchestrate the actual handoffs the regime requires. Right-to-Try in Montana is a four-actor system — manufacturers, ETCs, clinicians, and patients — and every meaningful action is one party handing a regulated artifact to another on a statutory clock. The directory is the door for patients. The platform streamlines and guides those handoffs end to end — RULE-by-RULE compliance coverage, ETRB workflow, adverse-event reporting on the 5-day clock, the annual DPHHS report, the HFAR contribution — and records each one as it happens. One platform, one connected workflow, one audit trail."
              />
            </p>

            <p className="about__marker">
              <FormattedMessage
                id="directory.about.partners.marker"
                defaultMessage="Who we work with."
              />
            </p>
            <p>
              <FormattedMessage
                id="directory.about.partners.body"
                defaultMessage="Our first program in the directory is {wst} from {winsantor} — a topical Phase 2 investigational treatment for diabetic peripheral neuropathy, available at {bigsky} in Bozeman. Big Sky is the first Experimental Treatment Center licensed under SB 535 and our launch design partner on the platform; their clinical and operational input shaped every module that ships in MVP 0."
                values={{
                  wst: (
                    <strong>
                      WST-057<sup>®</sup>
                    </strong>
                  ),
                  winsantor: <strong>WinSanTor</strong>,
                  bigsky: <strong>Big Sky ETC</strong>,
                }}
              />
            </p>

            <p className="about__marker">
              <FormattedMessage
                id="directory.about.independence.marker"
                defaultMessage="What Lewis is — and isn't."
              />
            </p>
            <p>
              <FormattedMessage
                id="directory.about.independence.body"
                defaultMessage="Lewis is independent. We are not a manufacturer. We are not a clinic. We do not take equity in manufacturers or ETCs and we do not bill patients. Manufacturers and ETCs pay for the platform; the directory is free for patients to use. Listings come from Montana DPHHS public records and the licensed program operators themselves. {accent} neutral connecting tissue has to be trusted by every side of the regime, and that trust only holds if we don't have a stake in the outcomes."
                values={{
                  accent: (
                    <em className="about__accent">
                      <FormattedMessage
                        id="directory.about.independence.body.accent"
                        defaultMessage="That independence is the entire point —"
                      />
                    </em>
                  ),
                }}
              />
            </p>

            <p className="about__marker">
              <FormattedMessage id="directory.about.next.marker" defaultMessage="What's next." />
            </p>
            <p>
              <FormattedMessage
                id="directory.about.next.body"
                defaultMessage="We're pre-launch as of this writing — staged at Big Sky, with WST-057® as the first listed program. As more Montana ETCs license under SB 535 and more manufacturers sign on, they appear in the directory and on the platform. If you're a manufacturer, an ETC operator, a clinician, a patient, or a journalist trying to understand what's happening in Montana, the emails below reach us."
              />
            </p>

            {/* Team signoff — italic Fraunces flourish on "The Lewis team"
                in the spot where the original founder-letter framing put
                the founder's name. Collective voice, no individual surfaced. */}
            <div className="about__team-signoff">
              <p>
                <FormattedMessage
                  id="directory.about.signoff.sincerely"
                  defaultMessage="Sincerely,"
                />
              </p>
              <span className="about__team-signoff-name">
                <FormattedMessage
                  id="directory.about.signoff.name"
                  defaultMessage="The Lewis team"
                />
              </span>
              <span className="about__team-signoff-title">
                <FormattedMessage
                  id="directory.about.signoff.title"
                  defaultMessage="lewis.health"
                />
              </span>
            </div>

            {/* In-letter contacts strip — three labeled emails as a
                horizontal row beneath the signoff. Mirrors the rail's
                "Reach us" card so the page is reachable from any
                scroll position. Press / investors / general. */}
            <div className="about__contacts-strip">
              <ul className="about__contacts-strip-list">
                <li>
                  <span className="about__contacts-strip-label">
                    <FormattedMessage
                      id="directory.about.contacts.press.label"
                      defaultMessage="Press"
                    />
                  </span>
                  <a className="about__contacts-strip-email" href="mailto:press@lewis.health">
                    press@lewis.health
                  </a>
                </li>
                <li>
                  <span className="about__contacts-strip-label">
                    <FormattedMessage
                      id="directory.about.contacts.investors.label"
                      defaultMessage="Investors"
                    />
                  </span>
                  <a className="about__contacts-strip-email" href="mailto:investors@lewis.health">
                    investors@lewis.health
                  </a>
                </li>
                <li>
                  <span className="about__contacts-strip-label">
                    <FormattedMessage
                      id="directory.about.contacts.general.label"
                      defaultMessage="General"
                    />
                  </span>
                  <a className="about__contacts-strip-email" href="mailto:hello@lewis.health">
                    hello@lewis.health
                  </a>
                </li>
              </ul>
            </div>

            <p className="about__independence">
              <FormattedMessage
                id="directory.about.independence.footer"
                defaultMessage="Lewis is an independent directory and operating platform. We are not a manufacturer, manufacturer, or clinic. Information sourced from Montana DPHHS public records and licensed program operators."
              />
            </p>
          </div>
        </div>

        {/* RIGHT: sticky reference rail. One primary CTA + a "Reach us"
            card surfacing the same three emails as the in-letter contacts
            strip. Intentional duplication — a journalist or manufacturer
            scanning above the fold gets the press/investors emails
            immediately, without scrolling to the bottom of the letter. */}
        <aside className="about__rail" aria-label="Reference">
          <a className="about__cta about__cta--primary" href="mailto:hello@lewis.health">
            <FormattedMessage id="directory.about.rail.cta" defaultMessage="Talk to the team" />
          </a>
          <div className="about__rail-card">
            <p className="about__rail-label">
              <FormattedMessage id="directory.about.rail.reach.label" defaultMessage="Reach us" />
            </p>
            <ul className="about__reach">
              <li>
                <span className="about__reach-t">
                  <FormattedMessage id="directory.about.rail.reach.press" defaultMessage="Press" />
                </span>
                <a className="about__reach-email" href="mailto:press@lewis.health">
                  press@lewis.health
                </a>
              </li>
              <li>
                <span className="about__reach-t">
                  <FormattedMessage
                    id="directory.about.rail.reach.investors"
                    defaultMessage="Investors"
                  />
                </span>
                <a className="about__reach-email" href="mailto:investors@lewis.health">
                  investors@lewis.health
                </a>
              </li>
              <li>
                <span className="about__reach-t">
                  <FormattedMessage
                    id="directory.about.rail.reach.general"
                    defaultMessage="General"
                  />
                </span>
                <a className="about__reach-email" href="mailto:hello@lewis.health">
                  hello@lewis.health
                </a>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
