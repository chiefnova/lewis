import { describe, expect, test } from "vitest";

import type { PublicProgramDetail } from "@lewis/shared/api/public";

import { buildDrugJsonLd } from "./drug-json-ld";

const FULL: PublicProgramDetail = {
  slug: "wst-057",
  name: "WST-057®",
  indication: "for diabetic peripheral neuropathy",
  manufacturer: "WinSanTor",
  form: "Topical",
  phase: "Phase 2",
  etcCount: 1,
  available: true,
  about: "About prose.",
  whoThisIsFor: "Eligibility prose.",
  enrollment: [],
  costRange: { low: 240000, high: 380000, currency: "USD", disclaimer: "Disclaimer." },
  publishedEvidenceUrl: null,
  clinicalTrialsGovId: "NCT04742205",
  indNumber: "152367",
  publishedPaper: { citation: "Lancet eBioMedicine 2023.", doi: "10.1016/j.ebiom.2023.104525" },
  etrb: { approvalDate: "2025-09-15", boardName: "Big Sky ETC ETRB" },
  mechanismSummary: "NaV1.7 small-molecule inhibitor.",
  keySafetyFindings: "Application-site erythema.",
};

describe("buildDrugJsonLd", () => {
  test("happy path emits full Drug schema with § 15.7 augmentations", () => {
    const ld = buildDrugJsonLd(FULL);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Drug");
    expect(ld.name).toBe("WST-057®");
    expect(ld.description).toBe("WST-057® for diabetic peripheral neuropathy.");
    expect(ld.manufacturer).toEqual({ "@type": "Organization", name: "WinSanTor" });
    expect(ld.clinicalPharmacology).toBe("NaV1.7 small-molecule inhibitor.");
    expect(ld.medicineSystem).toBe("WesternConventional");
    expect(ld.prescribingInfo).toBe("https://clinicaltrials.gov/study/NCT04742205");
    expect(ld.availableStrength).toEqual({
      "@type": "DrugStrength",
      description: "Topical formulation",
    });
  });

  test("omits clinicalPharmacology when mechanismSummary is null", () => {
    const ld = buildDrugJsonLd({ ...FULL, mechanismSummary: null });
    expect(ld).not.toHaveProperty("clinicalPharmacology");
  });

  test("omits prescribingInfo when clinicalTrialsGovId is null", () => {
    const ld = buildDrugJsonLd({ ...FULL, clinicalTrialsGovId: null });
    expect(ld).not.toHaveProperty("prescribingInfo");
  });

  test("omits manufacturer when null", () => {
    const ld = buildDrugJsonLd({ ...FULL, manufacturer: null });
    expect(ld).not.toHaveProperty("manufacturer");
  });

  test("omits availableStrength when form is null", () => {
    const ld = buildDrugJsonLd({ ...FULL, form: null });
    expect(ld).not.toHaveProperty("availableStrength");
  });

  test("medicineSystem is always WesternConventional (Schema.org enum)", () => {
    const ld = buildDrugJsonLd(FULL);
    expect(ld.medicineSystem).toBe("WesternConventional");
  });
});
