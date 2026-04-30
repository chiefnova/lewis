import { describe, expect, test } from "vitest";
import {
  ConditionSlug,
  ConnectRequestPayload,
  EligibilityStartResponse,
  ProgramSlug,
  PublicConditionDetail,
  PublicConditionListResponse,
  PublicConditionSummary,
  PublicEtcSummary,
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
  test("requires state='MT'", () => {
    const r = PublicEtcSummary.safeParse({
      slug: "big-sky",
      name: "x",
      city: "Bozeman",
      state: "WY",
      licenseNumber: "L",
      acceptingPatients: true,
    });
    expect(r.success).toBe(false);
  });
  test("happy path with state='MT'", () => {
    const r = PublicEtcSummary.safeParse({
      slug: "big-sky",
      name: "x",
      city: "Bozeman",
      state: "MT",
      licenseNumber: "L",
      acceptingPatients: true,
    });
    expect(r.success).toBe(true);
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

describe("EligibilityStartResponse", () => {
  test("rejects empty questions array", () => {
    const r = EligibilityStartResponse.safeParse({
      sessionToken: "t",
      programSlug: "wst-057",
      questions: [],
    });
    expect(r.success).toBe(false);
  });

  test("rejects question with fewer than 2 options", () => {
    const r = EligibilityStartResponse.safeParse({
      sessionToken: "t",
      programSlug: "wst-057",
      questions: [{ id: "q1", prompt: "ok?", options: ["only"] }],
    });
    expect(r.success).toBe(false);
  });

  test("happy path", () => {
    const r = EligibilityStartResponse.safeParse({
      sessionToken: "t",
      programSlug: "wst-057",
      questions: [{ id: "q1", prompt: "ok?", options: ["Yes", "No"] }],
    });
    expect(r.success).toBe(true);
  });
});
