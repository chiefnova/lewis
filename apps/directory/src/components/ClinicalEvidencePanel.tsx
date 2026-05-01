import { useIntl } from "react-intl";

import type { PublicProgramDetail } from "@lewis/shared/api/public";

// Slice 3 — directoryprd.md § 15.3.
// Renders the Clinical evidence card that lives INSIDE the Clinical-evidence
// section. The section's h2 is rendered by the parent (TreatmentDetailPage)
// so the panel-title visual rhythm matches the surrounding flat sections;
// this component just renders the .evidence-block card body with the
// 4-field grid + mechanism prose + key safety findings + DOI citation.
//
// Every sub-section gates on data presence so future programs that ship
// with partial evidence still render — the panel just hides what it
// doesn't have. This is the graceful-degradation contract documented in
// the slice 3 plan (architecture decision 1).
//
// Approved 2026-04-30 in /design-shotgun Round 1 (Variant C). See
// ~/.gstack/projects/chiefnova-lewis/designs/programs-detail-composition-20260430/approved.json

interface ClinicalEvidencePanelProps {
  program: PublicProgramDetail;
}

export function ClinicalEvidencePanel({ program }: ClinicalEvidencePanelProps) {
  const intl = useIntl();

  const hasGrid =
    Boolean(program.clinicalTrialsGovId) ||
    Boolean(program.indNumber) ||
    Boolean(program.phase) ||
    Boolean(program.etrb);
  const hasProse =
    Boolean(program.mechanismSummary) ||
    Boolean(program.keySafetyFindings) ||
    Boolean(program.publishedPaper);

  // No evidence at all → render nothing rather than an empty card. The
  // page composition still flows; the next panel slides into the slot.
  if (!hasGrid && !hasProse) return null;

  const trialUrl = program.clinicalTrialsGovId
    ? `https://clinicaltrials.gov/study/${encodeURIComponent(program.clinicalTrialsGovId)}`
    : null;
  // DOIs are intentionally NOT URL-encoded because the embedded `/` is
  // path-significant in the doi.org resolver convention (e.g. for
  // 10.1016/j.ebiom.2023.104525, doi.org/10.1016/... is the canonical
  // form; encoded `%2F` works but breaks pretty URLs after click).
  // DOI values flow from the DB (counsel-reviewed at write time), not
  // anonymous user input, so trust-on-write is the right tradeoff.
  const doiUrl = program.publishedPaper ? `https://doi.org/${program.publishedPaper.doi}` : null;

  return (
    <div className="evidence-block">
      {hasGrid && (
        <dl className="ev-grid">
          {trialUrl && (
            <div className="ev-field">
              <dt className="ev-lbl">
                {intl.formatMessage({
                  id: "directory.program.evidence.trial-registration",
                  defaultMessage: "Trial registration",
                })}
              </dt>
              <dd className="ev-val" style={{ margin: 0 }}>
                <a href={trialUrl} target="_blank" rel="noopener noreferrer">
                  {program.clinicalTrialsGovId}
                </a>
              </dd>
            </div>
          )}
          {program.indNumber && (
            <div className="ev-field">
              <dt className="ev-lbl">
                {intl.formatMessage({
                  id: "directory.program.evidence.ind-number",
                  defaultMessage: "IND number",
                })}
              </dt>
              <dd className="ev-val" style={{ margin: 0 }}>
                {program.indNumber}
              </dd>
            </div>
          )}
          {program.phase && (
            <div className="ev-field">
              <dt className="ev-lbl">
                {intl.formatMessage({
                  id: "directory.program.evidence.phase",
                  defaultMessage: "Phase",
                })}
              </dt>
              <dd className="ev-val" style={{ margin: 0 }}>
                {program.phase}
              </dd>
            </div>
          )}
          {program.etrb && (
            <div className="ev-field">
              <dt className="ev-lbl">
                {intl.formatMessage({
                  id: "directory.program.evidence.etrb-approval",
                  defaultMessage: "ETRB approval",
                })}
              </dt>
              <dd className="ev-val" style={{ margin: 0 }}>
                {program.etrb.boardName} · {formatLongDate(program.etrb.approvalDate, intl.locale)}
              </dd>
            </div>
          )}
        </dl>
      )}

      {hasProse && (
        <div className="ev-prose">
          {program.mechanismSummary && (
            <>
              <div className="ev-prose-label">
                {intl.formatMessage({
                  id: "directory.program.evidence.mechanism",
                  defaultMessage: "Mechanism",
                })}
              </div>
              {splitParagraphs(program.mechanismSummary).map((paragraph, i) => (
                <p key={`mech-${i}`}>{paragraph}</p>
              ))}
            </>
          )}

          {program.keySafetyFindings && (
            <>
              <div className="ev-prose-label">
                {intl.formatMessage({
                  id: "directory.program.evidence.safety",
                  defaultMessage: "Key safety findings",
                })}
              </div>
              <p>{program.keySafetyFindings}</p>
            </>
          )}

          {program.publishedPaper && doiUrl && (
            <div className="ev-citation">
              {program.publishedPaper.citation}
              {" — "}
              <a href={doiUrl} target="_blank" rel="noopener noreferrer">
                doi.org/{program.publishedPaper.doi}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Mechanism prose in the DB is stored with double-newline paragraph
// breaks (see migration 0019 backfill). Split on blank lines and trim
// so the panel renders one <p> per paragraph.
function splitParagraphs(prose: string): ReadonlyArray<string> {
  return prose
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

// Format ISO YYYY-MM-DD as "September 15, 2025". Pure (no Date timezone
// risk for date-only values).
function formatLongDate(iso: string, locale: string): string {
  const [yearStr, monthStr, dayStr] = iso.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return iso;
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, day)));
  } catch {
    return iso;
  }
}
