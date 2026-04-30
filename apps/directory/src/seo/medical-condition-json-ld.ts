// Schema.org `MedicalCondition` JSON-LD builder for /conditions/:slug pages
// per directoryprd.md § 14.3 + § 26.1. Emitted via useSeo's `jsonLd` option.
//
// The builder is split out into its own pure helper so:
//   1. The "no possibleTreatment outside live state" invariant is unit-testable.
//   2. The Schema.org choices (which fields, when) are auditable in PR diffs
//      against the PRD requirements rather than buried in JSX.
//
// Per § 14.3 the schema must carry name, code (ICD-10), and possibleTreatment.
// We extend that slightly with `description` (helps richer SERP previews)
// and `alternateName` for additional ICD-10 codes when a condition carries
// more than one (e.g. diabetic peripheral neuropathy carries E11.40 + E11.42).

import type { PublicConditionDetail } from "@lewis/shared/api/public";

import type { ConditionContent } from "../data/conditions-content";
import { siteUrl } from "./useSeo";

type MedicalCode = {
  "@type": "MedicalCode";
  codeValue: string;
  codingSystem: string;
};

type DrugReference = {
  "@type": "Drug";
  name: string;
  url: string;
};

export type MedicalConditionJsonLd = {
  "@context": "https://schema.org";
  "@type": "MedicalCondition";
  name: string;
  description?: string;
  code?: MedicalCode;
  alternateName?: ReadonlyArray<string>;
  possibleTreatment?: ReadonlyArray<DrugReference>;
};

export function buildMedicalConditionJsonLd(
  condition: PublicConditionDetail,
  content?: ConditionContent,
): MedicalConditionJsonLd {
  const jsonLd: MedicalConditionJsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalCondition",
    name: condition.name,
  };

  const description = condition.summary ?? content?.explainer?.paragraphs[0];
  if (description) {
    jsonLd.description = description;
  }

  const [primaryCode, ...rest] = condition.icd10Codes;
  if (primaryCode) {
    jsonLd.code = {
      "@type": "MedicalCode",
      codeValue: primaryCode,
      codingSystem: "ICD-10",
    };
    if (rest.length > 0) {
      jsonLd.alternateName = rest.map((code) => `ICD-10: ${code}`);
    }
  }

  // possibleTreatment is OMITTED for coming_soon and not_offered — emitting
  // an empty array would still send a "treatments exist" signal to crawlers.
  // The PRD § 14.3 list of required fields (name, code, possibleTreatment)
  // is a superset; possibleTreatment "where applicable" per the PRD copy.
  if (condition.state === "live" && condition.linkedPrograms.length > 0) {
    jsonLd.possibleTreatment = condition.linkedPrograms.map((p) => ({
      "@type": "Drug",
      name: p.name,
      url: siteUrl(`/programs/${p.slug}`),
    }));
  }

  return jsonLd;
}
