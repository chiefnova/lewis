import type { PublicConditionDetail } from "@lewis/shared/api/public";
import { describe, expect, test } from "vitest";

import { buildMedicalConditionJsonLd } from "./medical-condition-json-ld";

function condition(overrides: Partial<PublicConditionDetail> = {}): PublicConditionDetail {
  return {
    slug: "diabetic-peripheral-neuropathy",
    name: "Diabetic peripheral neuropathy",
    state: "live",
    summary: "Nerve damage caused by chronic high blood sugar.",
    icd10Codes: ["E11.40", "E11.42"],
    programCount: 1,
    href: "/conditions/diabetic-peripheral-neuropathy",
    linkedPrograms: [
      {
        slug: "wst-057",
        name: "WST-057",
        drug: "WST-057",
        phase: "Phase 2",
        form: "Topical",
        manufacturer: "WinSanTor",
      },
    ],
    ...overrides,
  };
}

describe("buildMedicalConditionJsonLd", () => {
  test("live + linkedPrograms emits possibleTreatment with absolute URLs", () => {
    const ld = buildMedicalConditionJsonLd(condition());
    expect(ld["@type"]).toBe("MedicalCondition");
    expect(ld.name).toBe("Diabetic peripheral neuropathy");
    expect(ld.possibleTreatment).toEqual([
      {
        "@type": "Drug",
        name: "WST-057",
        url: "https://lewis.health/programs/wst-057",
      },
    ]);
  });

  test("coming_soon omits possibleTreatment entirely (not empty array)", () => {
    const ld = buildMedicalConditionJsonLd(
      condition({
        slug: "ptsd",
        name: "PTSD",
        state: "coming_soon",
        linkedPrograms: [],
        programCount: 0,
        icd10Codes: ["F43.10"],
      }),
    );
    expect(ld.possibleTreatment).toBeUndefined();
    expect("possibleTreatment" in ld).toBe(false);
  });

  test("not_offered omits possibleTreatment entirely", () => {
    const ld = buildMedicalConditionJsonLd(
      condition({
        slug: "als",
        name: "ALS",
        state: "not_offered",
        linkedPrograms: [],
        programCount: 0,
        icd10Codes: ["G12.21"],
      }),
    );
    expect(ld.possibleTreatment).toBeUndefined();
  });

  test("live but with no linkedPrograms (publish-flag drift) omits possibleTreatment", () => {
    const ld = buildMedicalConditionJsonLd(condition({ linkedPrograms: [], programCount: 0 }));
    expect(ld.possibleTreatment).toBeUndefined();
  });

  test("primary ICD-10 maps to code, rest to alternateName", () => {
    const ld = buildMedicalConditionJsonLd(condition());
    expect(ld.code).toEqual({
      "@type": "MedicalCode",
      codeValue: "E11.40",
      codingSystem: "ICD-10",
    });
    expect(ld.alternateName).toEqual(["ICD-10: E11.42"]);
  });

  test("single ICD-10 code → no alternateName field", () => {
    const ld = buildMedicalConditionJsonLd(condition({ icd10Codes: ["E11.40"] }));
    expect(ld.code?.codeValue).toBe("E11.40");
    expect(ld.alternateName).toBeUndefined();
  });

  test("empty icd10Codes → no code field", () => {
    const ld = buildMedicalConditionJsonLd(condition({ icd10Codes: [] }));
    expect(ld.code).toBeUndefined();
    expect(ld.alternateName).toBeUndefined();
  });

  test("description falls back to content explainer paragraph 0 when summary is null", () => {
    const ld = buildMedicalConditionJsonLd(condition({ summary: null }), {
      explainer: {
        paragraphs: ["Explainer paragraph zero.", "More."],
        sourceLabel: "MedlinePlus",
        sourceUrl: "https://medlineplus.gov/x",
      },
    });
    expect(ld.description).toBe("Explainer paragraph zero.");
  });

  test("no summary, no content explainer → no description field", () => {
    const ld = buildMedicalConditionJsonLd(condition({ summary: null }));
    expect(ld.description).toBeUndefined();
  });
});
