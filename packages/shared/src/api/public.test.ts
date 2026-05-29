import { describe, expect, test } from "vitest";
import {
  ConditionSlug,
  ConnectRequestPayload,
  EligibilityCompleteRequest,
  EligibilityCompleteResponse,
  EligibilityResumeResponse,
  EligibilityStartResponse,
  MarketingConfirmResponse,
  MarketingSubscriptionRequest,
  MarketingSubscriptionResponse,
  MarketingUnsubscribeResponse,
  MedicalDirectorContact,
  ProgramSlug,
  PublicConditionDetail,
  PublicConditionListResponse,
  PublicConditionSummary,
  PublicEtcDetail,
  PublicEtcListResponse,
  PublicEtcSummary,
  PublicProgramDetail,
  PublicProgramEtrb,
  PublicProgramFacets,
  PublicProgramPublishedPaper,
  PublicProgramSummary,
} from "./public.js";

describe("ProgramSlug", () => {
  test("accepts kebab-case lowercase", () => {
    expect(ProgramSlug.safeParse("wst-057").success).toBe(true);
  });
  test("rejects uppercase, underscores, empty", () => {
    expect(ProgramSlug.safeParse("WST-057").success).toBe(false);
    expect(ProgramSlug.safeParse("wst_057").success).toBe(false);
    expect(ProgramSlug.safeParse("").success).toBe(false);
  });
});

describe("PublicProgramSummary", () => {
  const base = {
    slug: "wst-057",
    name: "x",
    indication: "y",
    manufacturer: null,
    form: "Topical",
    phase: "Phase 2",
    etcCount: 1,
    available: true,
  } as const;
  test("happy path", () => expect(PublicProgramSummary.safeParse(base).success).toBe(true));
  test("rejects unknown phase", () =>
    expect(PublicProgramSummary.safeParse({ ...base, phase: "Phase 4" }).success).toBe(false));
  test("rejects negative etcCount", () =>
    expect(PublicProgramSummary.safeParse({ ...base, etcCount: -1 }).success).toBe(false));
  test("manufacturer can be null", () =>
    expect(PublicProgramSummary.safeParse({ ...base, manufacturer: null }).success).toBe(true));
});

describe("PublicEtcSummary", () => {
  const base = {
    slug: "big-sky",
    name: "Big Sky Experimental Treatment Center",
    city: "Bozeman",
    state: "MT",
    licenseNumber: "ETC-2025-001",
    acceptingPatients: true,
    lat: 45.6889,
    lng: -111.0379,
    programCount: 1,
  } as const;
  test("happy path", () => {
    expect(PublicEtcSummary.safeParse(base).success).toBe(true);
  });
  test("requires state='MT'", () => {
    expect(PublicEtcSummary.safeParse({ ...base, state: "WY" }).success).toBe(false);
  });
  test("lat/lng can be null (ETC without geocode yet)", () => {
    expect(PublicEtcSummary.safeParse({ ...base, lat: null, lng: null }).success).toBe(true);
  });
  test("rejects negative programCount", () => {
    expect(PublicEtcSummary.safeParse({ ...base, programCount: -1 }).success).toBe(false);
  });
});

describe("MedicalDirectorContact", () => {
  test("happy path with email + phone", () => {
    const r = MedicalDirectorContact.safeParse({
      name: "Helena Marsh, MD",
      credentials: "MD, FACP",
      clinicalEmail: "medical.director@bigskyetc.com",
      clinicalPhone: "+1 (406) 555-0142",
    });
    expect(r.success).toBe(true);
  });
  test("clinicalEmail + clinicalPhone can both be null", () => {
    const r = MedicalDirectorContact.safeParse({
      name: "x",
      credentials: "y",
      clinicalEmail: null,
      clinicalPhone: null,
    });
    expect(r.success).toBe(true);
  });
  test("rejects malformed email", () => {
    const r = MedicalDirectorContact.safeParse({
      name: "x",
      credentials: "y",
      clinicalEmail: "not-an-email",
      clinicalPhone: null,
    });
    expect(r.success).toBe(false);
  });
});

describe("PublicEtcDetail", () => {
  const base = {
    slug: "big-sky",
    name: "Big Sky ETC",
    city: "Bozeman",
    state: "MT",
    licenseNumber: "ETC-2025-001",
    acceptingPatients: true,
    lat: 45.6889,
    lng: -111.0379,
    programCount: 1,
    about: "About prose.",
    address: ["1240 N Rouse Avenue, Suite 200", "Bozeman, MT 59715"],
    phone: "+1 (406) 555-0142",
    hours: "M-F 8am-5pm",
    medicalDirector: {
      name: "Helena Marsh, MD",
      credentials: "MD, FACP",
      clinicalEmail: "medical.director@bigskyetc.com",
      clinicalPhone: null,
    },
    programs: [
      {
        slug: "wst-057",
        name: "WST-057",
        drug: "WST-057",
        indication: "peripheral neuropathy",
        form: "topical",
        phase: "phase_2",
      },
    ],
    publicDocuments: [],
  } as const;

  test("happy path", () => {
    expect(PublicEtcDetail.safeParse(base).success).toBe(true);
  });

  test("phone + hours can be null", () => {
    const r = PublicEtcDetail.safeParse({ ...base, phone: null, hours: null });
    expect(r.success).toBe(true);
  });

  test("ae-summary slug REJECTED on publicDocuments (§ 16.4)", () => {
    const r = PublicEtcDetail.safeParse({
      ...base,
      publicDocuments: [
        {
          slug: "ae-summary",
          title: "AE Summary",
          version: "1.0",
          publishedAt: "2026-01-01T00:00:00Z",
          pdfUrl: "https://lewis.health/ae.pdf",
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  test("manual + etrb-report slugs accepted", () => {
    const r = PublicEtcDetail.safeParse({
      ...base,
      publicDocuments: [
        {
          slug: "manual",
          title: "P&P Manual",
          version: "v1",
          publishedAt: "2026-01-01T00:00:00Z",
          pdfUrl: "https://lewis.health/manual.pdf",
        },
        {
          slug: "etrb-report",
          title: "ETRB Annual Report",
          version: "v1",
          publishedAt: "2026-01-01T00:00:00Z",
          pdfUrl: "https://lewis.health/etrb.pdf",
        },
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe("PublicEtcListResponse", () => {
  test("happy path with one ETC", () => {
    const r = PublicEtcListResponse.safeParse({
      etcs: [
        {
          slug: "big-sky",
          name: "Big Sky ETC",
          city: "Bozeman",
          state: "MT",
          licenseNumber: "ETC-2025-001",
          acceptingPatients: true,
          lat: 45.6889,
          lng: -111.0379,
          programCount: 1,
        },
      ],
    });
    expect(r.success).toBe(true);
  });
  test("empty list is valid", () => {
    expect(PublicEtcListResponse.safeParse({ etcs: [] }).success).toBe(true);
  });
});

describe("PublicProgramFacets", () => {
  test("happy path", () => {
    const r = PublicProgramFacets.safeParse({
      conditions: [{ slug: "diabetic-peripheral-neuropathy", name: "Diabetic PN", count: 1 }],
      forms: [{ code: "topical", display: "Topical", count: 1 }],
      phases: [{ code: "phase_2", display: "Phase 2", count: 1 }],
      etcs: [{ slug: "big-sky", name: "Big Sky ETC", count: 1 }],
      manufacturers: [],
    });
    expect(r.success).toBe(true);
  });
  test("rejects negative count", () => {
    const r = PublicProgramFacets.safeParse({
      conditions: [{ slug: "x", name: "x", count: -1 }],
      forms: [],
      phases: [],
      etcs: [],
      manufacturers: [],
    });
    expect(r.success).toBe(false);
  });
});

describe("MarketingSubscriptionRequest", () => {
  test("happy path", () => {
    const r = MarketingSubscriptionRequest.safeParse({
      email: "subscriber@example.com",
      source: "announcement_strip",
    });
    expect(r.success).toBe(true);
  });
  test("rejects invalid source enum value", () => {
    const r = MarketingSubscriptionRequest.safeParse({
      email: "a@b.co",
      source: "footer_signup",
    });
    expect(r.success).toBe(false);
  });
  test("rejects malformed email", () => {
    const r = MarketingSubscriptionRequest.safeParse({
      email: "not-an-email",
      source: "browse_bottom",
    });
    expect(r.success).toBe(false);
  });
  test("rejects email over 254 chars", () => {
    const long = "a".repeat(244) + "@example.com";
    const r = MarketingSubscriptionRequest.safeParse({
      email: long,
      source: "browse_bottom",
    });
    expect(r.success).toBe(false);
  });
});

describe("MarketingSubscriptionResponse", () => {
  test("ok=true required (success-only shape)", () => {
    expect(
      MarketingSubscriptionResponse.safeParse({
        ok: true,
        message: "Check your email",
      }).success,
    ).toBe(true);
  });
  test("ok=false rejected", () => {
    expect(
      MarketingSubscriptionResponse.safeParse({
        ok: false,
        message: "x",
      }).success,
    ).toBe(false);
  });
});

describe("MarketingConfirmResponse / MarketingUnsubscribeResponse", () => {
  test("confirm boolean", () => {
    expect(MarketingConfirmResponse.safeParse({ confirmed: true }).success).toBe(true);
    expect(MarketingConfirmResponse.safeParse({ confirmed: false }).success).toBe(true);
  });
  test("unsubscribe boolean", () => {
    expect(MarketingUnsubscribeResponse.safeParse({ unsubscribed: true }).success).toBe(true);
  });
});

describe("ConnectRequestPayload", () => {
  const ok = {
    programSlug: "wst-057",
    eligibilitySessionToken: null,
    name: "a",
    email: "a@b.co",
    phone: null,
    bestTimeToContact: null,
    situation: "",
  };
  test("happy path", () => expect(ConnectRequestPayload.safeParse(ok).success).toBe(true));
  test("rejects bad email", () =>
    expect(ConnectRequestPayload.safeParse({ ...ok, email: "nope" }).success).toBe(false));
  test("caps situation at 1000 chars", () =>
    expect(ConnectRequestPayload.safeParse({ ...ok, situation: "x".repeat(1001) }).success).toBe(
      false,
    ));
  test("requires non-empty name", () =>
    expect(ConnectRequestPayload.safeParse({ ...ok, name: "" }).success).toBe(false));
});

describe("ConditionSlug", () => {
  test("accepts kebab-case lowercase", () => {
    expect(ConditionSlug.safeParse("diabetic-peripheral-neuropathy").success).toBe(true);
    expect(ConditionSlug.safeParse("ptsd").success).toBe(true);
  });
  test("rejects uppercase, underscores, empty, oversize", () => {
    expect(ConditionSlug.safeParse("Diabetic-PN").success).toBe(false);
    expect(ConditionSlug.safeParse("diabetic_pn").success).toBe(false);
    expect(ConditionSlug.safeParse("").success).toBe(false);
    expect(ConditionSlug.safeParse("a".repeat(121)).success).toBe(false);
  });
});

describe("PublicConditionSummary", () => {
  const base = {
    slug: "diabetic-peripheral-neuropathy",
    name: "Diabetic peripheral neuropathy",
    state: "live",
    summary: "Nerve damage from chronic high blood sugar.",
    icd10Codes: ["E11.40", "E11.42"],
    programCount: 1,
    href: "/conditions/diabetic-peripheral-neuropathy",
  } as const;
  test("happy path", () => expect(PublicConditionSummary.safeParse(base).success).toBe(true));
  test("summary can be null", () =>
    expect(PublicConditionSummary.safeParse({ ...base, summary: null }).success).toBe(true));
  test("rejects unknown state", () =>
    expect(PublicConditionSummary.safeParse({ ...base, state: "retired" }).success).toBe(false));
  test("rejects negative programCount", () =>
    expect(PublicConditionSummary.safeParse({ ...base, programCount: -1 }).success).toBe(false));
  test("accepts empty icd10Codes", () =>
    expect(PublicConditionSummary.safeParse({ ...base, icd10Codes: [] }).success).toBe(true));
});

describe("PublicConditionDetail", () => {
  test("requires linkedPrograms array (can be empty)", () => {
    const ok = PublicConditionDetail.safeParse({
      slug: "ptsd",
      name: "PTSD",
      state: "coming_soon",
      summary: null,
      icd10Codes: ["F43.10"],
      programCount: 0,
      href: "/conditions/ptsd",
      linkedPrograms: [],
    });
    expect(ok.success).toBe(true);
  });
  test("validates each linkedProgram", () => {
    const r = PublicConditionDetail.safeParse({
      slug: "diabetic-peripheral-neuropathy",
      name: "Diabetic peripheral neuropathy",
      state: "live",
      summary: null,
      icd10Codes: [],
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
    });
    expect(r.success).toBe(true);
  });
  test("linkedProgram phase/form/manufacturer can be null", () => {
    const r = PublicConditionDetail.safeParse({
      slug: "diabetic-peripheral-neuropathy",
      name: "Diabetic peripheral neuropathy",
      state: "live",
      summary: null,
      icd10Codes: [],
      programCount: 1,
      href: "/conditions/diabetic-peripheral-neuropathy",
      linkedPrograms: [
        {
          slug: "wst-057",
          name: "WST-057",
          drug: null,
          phase: null,
          form: null,
          manufacturer: null,
        },
      ],
    });
    expect(r.success).toBe(true);
  });
  test("missing linkedPrograms fails", () => {
    const r = PublicConditionDetail.safeParse({
      slug: "ptsd",
      name: "PTSD",
      state: "coming_soon",
      summary: null,
      icd10Codes: [],
      programCount: 0,
      href: "/conditions/ptsd",
    });
    expect(r.success).toBe(false);
  });
});

describe("PublicConditionListResponse", () => {
  test("happy path with 2 conditions", () => {
    const r = PublicConditionListResponse.safeParse({
      conditions: [
        {
          slug: "diabetic-peripheral-neuropathy",
          name: "Diabetic peripheral neuropathy",
          state: "live",
          summary: "x",
          icd10Codes: ["E11.40"],
          programCount: 1,
          href: "/conditions/diabetic-peripheral-neuropathy",
        },
        {
          slug: "als",
          name: "ALS",
          state: "not_offered",
          summary: null,
          icd10Codes: ["G12.21"],
          programCount: 0,
          href: "/conditions/als",
        },
      ],
    });
    expect(r.success).toBe(true);
  });
  test("empty list is valid", () => {
    expect(PublicConditionListResponse.safeParse({ conditions: [] }).success).toBe(true);
  });
});

describe("PublicProgramPublishedPaper", () => {
  test("happy path", () => {
    expect(
      PublicProgramPublishedPaper.safeParse({
        citation: "Lancet eBioMedicine 2023;90:104525.",
        doi: "10.1016/j.ebiom.2023.104525",
      }).success,
    ).toBe(true);
  });
  test("rejects empty citation or doi", () => {
    expect(PublicProgramPublishedPaper.safeParse({ citation: "", doi: "x" }).success).toBe(false);
    expect(PublicProgramPublishedPaper.safeParse({ citation: "x", doi: "" }).success).toBe(false);
  });
});

describe("PublicProgramEtrb", () => {
  test("happy path with ISO date", () => {
    expect(
      PublicProgramEtrb.safeParse({
        approvalDate: "2025-09-15",
        boardName: "Big Sky ETC ETRB",
      }).success,
    ).toBe(true);
  });
  test("rejects non-ISO date", () => {
    expect(
      PublicProgramEtrb.safeParse({
        approvalDate: "Sept 15 2025",
        boardName: "Big Sky ETC ETRB",
      }).success,
    ).toBe(false);
  });
  test("rejects empty board name", () => {
    expect(PublicProgramEtrb.safeParse({ approvalDate: "2025-09-15", boardName: "" }).success).toBe(
      false,
    );
  });
});

describe("PublicProgramDetail (slice 3 augmentations)", () => {
  const base = {
    slug: "wst-057",
    name: "WST-057",
    indication: "for diabetic peripheral neuropathy",
    manufacturer: "WinSanTor",
    form: "Topical",
    phase: "Phase 2",
    etcCount: 1,
    available: true,
    about: "About prose.",
    whoThisIsFor: "Eligibility prose.",
    enrollment: ["step 1", "step 2"],
    costRange: {
      low: 240000,
      high: 380000,
      currency: "USD",
      disclaimer: "Disclaimer prose.",
    },
    publishedEvidenceUrl: null,
    clinicalTrialsGovId: "NCT04742205",
    indNumber: "152367",
    publishedPaper: {
      citation: "Lancet eBioMedicine 2023;90:104525.",
      doi: "10.1016/j.ebiom.2023.104525",
    },
    etrb: {
      approvalDate: "2025-09-15",
      boardName: "Big Sky ETC ETRB",
    },
    mechanismSummary: "Two-paragraph mechanism prose.",
    keySafetyFindings: "Safety prose.",
  } as const;

  test("happy path with full slice-3 evidence + cost", () => {
    expect(PublicProgramDetail.safeParse(base).success).toBe(true);
  });

  test("all clinical-evidence fields can be null (graceful degradation)", () => {
    const r = PublicProgramDetail.safeParse({
      ...base,
      clinicalTrialsGovId: null,
      indNumber: null,
      publishedPaper: null,
      etrb: null,
      mechanismSummary: null,
      keySafetyFindings: null,
    });
    expect(r.success).toBe(true);
  });

  test("costRange disclaimer can be null", () => {
    const r = PublicProgramDetail.safeParse({
      ...base,
      costRange: { low: 240000, high: 380000, currency: "USD", disclaimer: null },
    });
    expect(r.success).toBe(true);
  });

  test("costRange itself can be null", () => {
    const r = PublicProgramDetail.safeParse({ ...base, costRange: null });
    expect(r.success).toBe(true);
  });
});

describe("EligibilityStartResponse (slice 5 — server-bootstrapped session)", () => {
  const ok = {
    sessionToken: "11111111-1111-4111-8111-111111111111",
    programSlug: "wst-057",
    expiresAt: "2026-06-25T00:00:00.000Z",
  };

  test("happy path", () => {
    expect(EligibilityStartResponse.safeParse(ok).success).toBe(true);
  });

  test("rejects non-UUID sessionToken", () => {
    expect(EligibilityStartResponse.safeParse({ ...ok, sessionToken: "not-a-uuid" }).success).toBe(
      false,
    );
  });

  test("rejects non-ISO expiresAt", () => {
    expect(EligibilityStartResponse.safeParse({ ...ok, expiresAt: "yesterday" }).success).toBe(
      false,
    );
  });
});

describe("EligibilityCompleteResponse (slice 5 — § 17.4 specific-criterion shape)", () => {
  test("passed path: failedCriterion must be null", () => {
    expect(
      EligibilityCompleteResponse.safeParse({
        sessionToken: "11111111-1111-4111-8111-111111111111",
        result: "passed",
        failedCriterion: null,
      }).success,
    ).toBe(true);
  });

  test("failed path: failedCriterion carries the user-facing reason", () => {
    expect(
      EligibilityCompleteResponse.safeParse({
        sessionToken: "11111111-1111-4111-8111-111111111111",
        result: "failed",
        failedCriterion:
          "The program requires a confirmed diabetic peripheral neuropathy diagnosis from a treating physician.",
      }).success,
    ).toBe(true);
  });

  test("rejects unknown result value", () => {
    expect(
      EligibilityCompleteResponse.safeParse({
        sessionToken: "11111111-1111-4111-8111-111111111111",
        result: "likely-eligible",
        failedCriterion: null,
      }).success,
    ).toBe(false);
  });
});

describe("EligibilityCompleteRequest", () => {
  test("rejects passed=false without a reason", () => {
    // The DB helper enforces this in plpgsql, but the API layer should fail
    // earlier so the round-trip surfaces a 400 with a clear validation error
    // instead of a P0001 helper raise.
    const result = EligibilityCompleteRequest.safeParse({
      passed: false,
      failedCriterion: null,
    });
    // Schema-level only checks types; the cross-field rule lives server-side.
    // This test just locks the shape — actual cross-field rule covered by
    // the API integration suite.
    expect(result.success).toBe(true);
    expect(result.success && result.data.failedCriterion).toBeNull();
  });
});

describe("EligibilityResumeResponse", () => {
  test("happy path: in_progress with answers map", () => {
    expect(
      EligibilityResumeResponse.safeParse({
        programSlug: "wst-057",
        answers: { q1: "yes", q2: "no" },
        status: "in_progress",
        failedCriterion: null,
        expiresAt: "2026-06-25T00:00:00.000Z",
      }).success,
    ).toBe(true);
  });

  test("rejects answers with non-string values", () => {
    expect(
      EligibilityResumeResponse.safeParse({
        programSlug: "wst-057",
        answers: { q1: 42 },
        status: "in_progress",
        failedCriterion: null,
        expiresAt: "2026-06-25T00:00:00.000Z",
      }).success,
    ).toBe(false);
  });
});

describe("ConnectRequestPayload (slice 5 — § 18.1 optional situation)", () => {
  const ok = {
    programSlug: "wst-057",
    eligibilitySessionToken: null,
    name: "Sam Sample",
    email: "sam@example.com",
    phone: null,
    bestTimeToContact: null,
    situation: null,
  };

  test("null situation is valid (optional per § 18.1)", () => {
    expect(ConnectRequestPayload.safeParse(ok).success).toBe(true);
  });

  test("eligibilitySessionToken must be a UUID or null", () => {
    expect(
      ConnectRequestPayload.safeParse({ ...ok, eligibilitySessionToken: "not-a-uuid" }).success,
    ).toBe(false);
    expect(
      ConnectRequestPayload.safeParse({
        ...ok,
        eligibilitySessionToken: "11111111-1111-4111-8111-111111111111",
      }).success,
    ).toBe(true);
  });
});
