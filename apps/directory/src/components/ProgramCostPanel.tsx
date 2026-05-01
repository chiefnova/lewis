import { useIntl } from "react-intl";

import type { PublicProgramDetail } from "@lewis/shared/api/public";

// Slice 3 — directoryprd.md § 15.2 step 7. Replaces the old inline cost
// JSX in TreatmentDetailPage, which carried an inline [COUNSEL REVIEW]
// marker. Now reads costRange (low / high / disclaimer) from the API,
// formatted as "$2,400–$3,800 per course". The disclaimer wording lives
// in the DB (programs.cost_disclaimer) so counsel can override per
// program without a code change.
//
// Renders as a flat editorial block (large serif accent number + body
// disclaimer) — NO card wrapper. The parent wraps this in a
// <section className="program-panel"> with its own h2 so the visual
// rhythm matches the surrounding flat sections per the approved
// Variant C composition.

interface ProgramCostPanelProps {
  program: PublicProgramDetail;
}

export function ProgramCostPanel({ program }: ProgramCostPanelProps) {
  const intl = useIntl();

  // Hide the panel entirely when no cost range is published. Better than
  // rendering a "TBD" placeholder which counsel would flag as a regulated
  // factual claim about pricing.
  if (!program.costRange) return null;

  const { low, high, disclaimer } = program.costRange;
  const lowDollars = formatUsdWhole(low);
  const highDollars = formatUsdWhole(high);

  return (
    <>
      <div className="program-cost-display">
        {intl.formatMessage(
          {
            id: "directory.program.cost.range",
            defaultMessage: "{low}–{high} per course",
          },
          { low: lowDollars, high: highDollars },
        )}
      </div>
      {disclaimer && <div className="program-cost-disclaimer">{disclaimer}</div>}
    </>
  );
}

function formatUsdWhole(cents: number): string {
  const whole = Math.floor(cents / 100);
  return `$${whole.toLocaleString("en-US")}`;
}
