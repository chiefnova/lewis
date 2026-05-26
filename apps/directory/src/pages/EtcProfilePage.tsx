import { Link, useNavigate, useParams } from "react-router-dom";
import { FormattedMessage } from "react-intl";

import { useEtcDetail } from "./use-etc-detail";
import { ArrowLeft } from "../components/icons";
import { ETC_CONTENT, formatEtcName } from "../data/etcs-content";
import { buildMedicalClinicJsonLd } from "../seo/medical-clinic-json-ld";
import { useSeo, siteUrl } from "../seo/useSeo";
import type { PublicEtcOfferedProgram } from "@lewis/shared/api/public";

/**
 * Slice 4 § 16.2 — /etcs/:slug profile. Round 5 locked the C+A hybrid:
 *   - C's split: prose in the main column, a sticky clinician-priority rail
 *     (license, accepting, claim, medical-director clinical contact, location)
 *     that carries a persistent Inquire button — visible from the first screen.
 *   - A's large closing Inquire panel after the body, for the reader who
 *     scrolls all the way down.
 * Two CTAs at deliberately different weights (quiet-persistent vs big-close).
 *
 * API-driven via useEtcDetail. The § 16.4 `ae-summary` document is gone; only
 * manual + etrb-report remain. No live map here (deferred to 2+ ETCs).
 */

const FORM_LABEL: Record<string, string> = {
  topical: "Topical",
  oral: "Oral",
  injection: "Injection",
  infusion: "Infusion",
};
function prettyForm(form: string | null): string | null {
  if (!form) return null;
  return FORM_LABEL[form] ?? form;
}
function prettyPhase(phase: string | null): string | null {
  if (!phase) return null;
  const m = /^phase_(\d)$/.exec(phase);
  return m ? `Phase ${m[1]}` : phase;
}
function programMeta(p: PublicEtcOfferedProgram): string {
  return [p.indication, prettyForm(p.form), prettyPhase(p.phase)]
    .filter((v): v is string => Boolean(v))
    .join(" · ");
}

export function EtcProfilePage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { etc, loading, error, notFound, retry } = useEtcDetail(slug);

  const displayName = etc ? formatEtcName(etc.name) : "";

  // Go back to wherever the user came from (the /etcs list, search, a
  // condition page, etc.). React Router tracks an `idx` in history.state; when
  // it's > 0 there's an in-app entry to return to. On a cold/direct/external
  // landing (idx 0 or absent) fall back to the centers index so we never
  // dead-end or bounce off-site.
  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate("/etcs");
  };

  useSeo({
    title: etc ? `${displayName} — Lewis Health` : "Experimental Treatment Center — Lewis Health",
    description: etc
      ? `${displayName} is a licensed Montana Experimental Treatment Center in ${etc.city}, Montana. License #${etc.licenseNumber}.`
      : undefined,
    canonical: siteUrl(`/etcs/${slug}`),
    jsonLd: etc ? (buildMedicalClinicJsonLd(etc) as unknown as Record<string, unknown>) : undefined,
    noIndex: notFound ? true : undefined,
  });

  if (loading) {
    return (
      <div className="etcp-wrap" aria-busy="true">
        <div className="etcp-head">
          <div className="etcs-skel etcs-skel--line" style={{ width: 220, height: 40 }} />
          <div className="etcs-skel etcs-skel--line" style={{ width: 140 }} />
        </div>
        <div className="etcp-cols">
          <div className="etcs-skel etcs-skel--block" style={{ height: 320 }} />
          <div className="etcs-skel etcs-skel--block" style={{ height: 260 }} />
        </div>
      </div>
    );
  }

  if (notFound || !etc) {
    return (
      <div className="etcp-wrap etcp-notfound">
        <h1 className="etcp-h1">
          <FormattedMessage id="directory.etc.notfound.title" defaultMessage="Center not found" />
        </h1>
        <p className="etcp-prose">
          <FormattedMessage
            id="directory.etc.notfound.body"
            defaultMessage="We couldn't find that Experimental Treatment Center."
          />
        </p>
        <Link to="/etcs" className="etcp-rail-cta">
          <FormattedMessage id="directory.etc.notfound.back" defaultMessage="See all centers" />
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="etcp-wrap">
        <div className="etcs-error" role="alert">
          <p className="etcs-error__msg">
            <FormattedMessage
              id="directory.etc.error"
              defaultMessage="We couldn't load this center just now."
            />
          </p>
          <button type="button" className="etcs-error__retry" onClick={retry}>
            <FormattedMessage id="directory.etc.retry" defaultMessage="Try again" />
          </button>
        </div>
      </div>
    );
  }

  const primary = etc.programs[0];
  const connectHref = primary ? `/connect/${primary.slug}?via=etc:${etc.slug}` : "/browse";
  const aboutParagraphs = ETC_CONTENT[etc.slug]?.aboutParagraphs ?? [etc.about];

  return (
    <div className="etcp-wrap">
      <button type="button" className="etcp-back" onClick={goBack}>
        <ArrowLeft />
        <FormattedMessage id="directory.etc.back" defaultMessage="Back to ETCs" />
      </button>

      <header className="etcp-head">
        <h1 className="etcp-h1">{displayName}</h1>
        <div className="etcp-sub">{etc.city}, Montana</div>
      </header>

      <div className="etcp-cols">
        <main className="etcp-main">
          <section className="etcp-sec">
            <div className="ed-label">
              <FormattedMessage id="directory.etc.about" defaultMessage="About this center" />
            </div>
            {aboutParagraphs.map((para, i) => (
              <p key={i} className="etcp-prose">
                {para}
              </p>
            ))}
          </section>

          <section className="etcp-sec">
            <div className="ed-label">
              <FormattedMessage id="directory.etc.treatments" defaultMessage="Treatments offered" />
            </div>
            {etc.programs.length > 0 ? (
              etc.programs.map((p) => (
                <Link key={p.slug} to={`/programs/${p.slug}`} className="etcp-prog">
                  <div>
                    <div className="etcp-prog__name">{p.name}</div>
                    <div className="etcp-prog__meta">{programMeta(p)}</div>
                  </div>
                  <span className="etcp-prog__go">
                    <FormattedMessage
                      id="directory.etc.view_treatment"
                      defaultMessage="View treatment →"
                    />
                  </span>
                </Link>
              ))
            ) : (
              <p className="etcp-prose">
                <FormattedMessage
                  id="directory.etc.no_programs"
                  defaultMessage="No active treatment programs at this time."
                />
              </p>
            )}
          </section>

          <section className="etcp-sec">
            <div className="ed-label">
              <FormattedMessage id="directory.etc.documents" defaultMessage="Public documents" />
            </div>
            <div className="etcp-docs">
              <Link to={`/etcs/${etc.slug}/manual`} className="etcp-doc">
                <span className="etcp-doc__t">
                  <FormattedMessage
                    id="directory.etc.doc.manual"
                    defaultMessage="Policy & Procedures Manual"
                  />
                </span>
                <span className="etcp-doc__s">
                  <FormattedMessage id="directory.etc.doc.soon" defaultMessage="Coming soon →" />
                </span>
              </Link>
              <Link to={`/etcs/${etc.slug}/etrb-report`} className="etcp-doc">
                <span className="etcp-doc__t">
                  <FormattedMessage
                    id="directory.etc.doc.etrb"
                    defaultMessage="ETRB Annual Report"
                  />
                </span>
                <span className="etcp-doc__s">
                  <FormattedMessage id="directory.etc.doc.soon" defaultMessage="Coming soon →" />
                </span>
              </Link>
            </div>
          </section>

          {/* Large closing Inquire (A's component) */}
          <div className="etcp-inquire">
            <p className="etcp-inquire__note">
              <FormattedMessage
                id="directory.etc.inquire.note"
                defaultMessage="Eligibility is decided by the treating physician and the {name} team — not by Lewis or the program sponsor."
                values={{ name: displayName }}
              />
            </p>
            <Link to={connectHref} className="etcp-inquire__btn">
              <FormattedMessage
                id="directory.etc.inquire.cta"
                defaultMessage="Inquire about treatment at this ETC →"
              />
            </Link>
          </div>
        </main>

        {/* Sticky clinician-priority rail */}
        <aside className="etcp-side">
          <div className="etcp-rail">
            <div className="etcp-panel etcp-panel--key">
              <span className="etcp-lic">
                <FormattedMessage
                  id="directory.etc.license"
                  defaultMessage="License #{number}"
                  values={{ number: etc.licenseNumber }}
                />
              </span>
              {etc.acceptingPatients && (
                <div className="etcp-accepting">
                  <span className="etc-card__dot" aria-hidden="true" />
                  <FormattedMessage
                    id="directory.etc.accepting"
                    defaultMessage="Currently accepting new patients"
                  />
                </div>
              )}
              <div className="etcp-claim">
                <FormattedMessage
                  id="directory.etc.claimed"
                  defaultMessage="✓ Claimed by operator"
                />
              </div>
              <Link to={connectHref} className="etcp-rail-cta">
                <FormattedMessage
                  id="directory.etc.inquire.short"
                  defaultMessage="Inquire about treatment →"
                />
              </Link>
            </div>

            <div className="etcp-panel">
              <div className="etcp-panel__lab">
                <FormattedMessage id="directory.etc.md" defaultMessage="Medical director" />
              </div>
              <div className="etcp-md__name">{etc.medicalDirector.name}</div>
              {etc.medicalDirector.credentials && (
                <div className="etcp-md__cred">{etc.medicalDirector.credentials}</div>
              )}
              {etc.medicalDirector.clinicalEmail && (
                <div className="etcp-md__box">
                  <div className="etcp-md__box-l">
                    <FormattedMessage
                      id="directory.etc.md.inquiries"
                      defaultMessage="For physicians — clinical inquiries"
                    />
                  </div>
                  <a
                    href={`mailto:${etc.medicalDirector.clinicalEmail}`}
                    className="etcp-md__email"
                  >
                    {etc.medicalDirector.clinicalEmail}
                  </a>
                </div>
              )}
              {etc.medicalDirector.clinicalPhone && (
                <div className="etcp-md__phone">{etc.medicalDirector.clinicalPhone}</div>
              )}
            </div>

            <div className="etcp-panel">
              <div className="etcp-panel__lab">
                <FormattedMessage id="directory.etc.location" defaultMessage="Location & contact" />
              </div>
              <address className="etcp-loc">
                {etc.address.map((line) => (
                  <div key={line}>{line}</div>
                ))}
                {etc.phone && (
                  <div className="etcp-loc__phone">
                    <a href={`tel:${etc.phone.replace(/[^+0-9]/g, "")}`}>{etc.phone}</a>
                  </div>
                )}
                {etc.hours && <div className="etcp-loc__hours">{etc.hours}</div>}
              </address>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
