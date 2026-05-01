// Schema.org `Drug` JSON-LD builder for /programs/:slug pages per
// directoryprd.md § 15.7 + § 26.1. Emitted via useSeo's `jsonLd` option.
//
// The builder is split out so:
//   1. The "no clinicalPharmacology when mechanismSummary is null" invariant
//      is unit-testable (graceful degradation matters because future programs
//      may ship with partial data).
//   2. The Schema.org choices (which fields, when) are auditable in PR diffs
//      against PRD § 15.7 rather than buried in JSX.
//
// Per § 15.7 we extend the existing Drug schema with:
//   - clinicalPharmacology — peer-level mechanism summary (when present)
//   - medicineSystem: WesternConventional
//   - prescribingInfo — link to ClinicalTrials.gov (when present)

import type { PublicProgramDetail } from "@lewis/shared/api/public";

type Organization = {
  "@type": "Organization";
  name: string;
};

type DrugStrength = {
  "@type": "DrugStrength";
  description: string;
};

export type DrugJsonLd = {
  "@context": "https://schema.org";
  "@type": "Drug";
  name: string;
  description?: string;
  manufacturer?: Organization;
  clinicalPharmacology?: string;
  medicineSystem?: "WesternConventional";
  prescribingInfo?: string;
  availableStrength?: DrugStrength;
};

export function buildDrugJsonLd(program: PublicProgramDetail): DrugJsonLd {
  const jsonLd: DrugJsonLd = {
    "@context": "https://schema.org",
    "@type": "Drug",
    name: program.name,
    description: `${program.name} ${program.indication}.`,
    medicineSystem: "WesternConventional",
  };

  if (program.manufacturer) {
    jsonLd.manufacturer = { "@type": "Organization", name: program.manufacturer };
  }

  // Mechanism summary is the canonical peer-level explanation per § 15.3.
  // Crawlers map clinicalPharmacology to the mechanism-of-action fact box.
  if (program.mechanismSummary) {
    jsonLd.clinicalPharmacology = program.mechanismSummary;
  }

  // ClinicalTrials.gov registration is the prescribing-info source for
  // pre-approval drugs (the FDA label doesn't exist yet). Omit the field
  // entirely when we don't have a registration ID — emitting a null URL
  // would fail Schema.org validation.
  if (program.clinicalTrialsGovId) {
    jsonLd.prescribingInfo = `https://clinicaltrials.gov/study/${encodeURIComponent(program.clinicalTrialsGovId)}`;
  }

  if (program.form) {
    jsonLd.availableStrength = {
      "@type": "DrugStrength",
      description: `${program.form} formulation`,
    };
  }

  return jsonLd;
}
