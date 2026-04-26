import { describe, expect, test } from "vitest";
import {
  ConnectRequestPayload,
  EligibilityStartResponse,
  ProgramSlug,
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
