// Public-API schemas for the corridor.health directory app. These endpoints
// are intentionally narrow — anonymous browse, anonymous eligibility-screen
// session, and the connect-request submission. No PHI ever lands on these
// routes; the patient portal (patient.corridor.health) handles enrollment
// and consent on its own authenticated surface.

import { z } from "zod";

// ----- Programs (a "program" is an investigational treatment listing) -----

export const ProgramSlug = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/, "Program slugs must be lowercase kebab-case.");

export const PublicProgramSummary = z.object({
  slug: ProgramSlug,
  name: z.string(),
  indication: z.string(),
  manufacturer: z.string().nullable(),
  form: z.enum(["Topical", "Oral", "Injection", "Infusion", "Device"]).nullable(),
  phase: z.enum(["Phase 1", "Phase 2", "Phase 3"]).nullable(),
  etcCount: z.number().int().nonnegative(),
  available: z.boolean(),
});
export type PublicProgramSummary = z.infer<typeof PublicProgramSummary>;

export const PublicProgramDetail = PublicProgramSummary.extend({
  about: z.string(),
  whoThisIsFor: z.string(),
  enrollment: z.array(z.string()),
  costRange: z
    .object({
      low: z.number().int().nonnegative(),
      high: z.number().int().nonnegative(),
      currency: z.literal("USD"),
    })
    .nullable(),
  publishedEvidenceUrl: z.string().url().nullable(),
});
export type PublicProgramDetail = z.infer<typeof PublicProgramDetail>;

export const PublicProgramListResponse = z.object({
  programs: z.array(PublicProgramSummary),
  total: z.number().int().nonnegative(),
});
export type PublicProgramListResponse = z.infer<typeof PublicProgramListResponse>;

// ----- ETCs -----

export const EtcSlug = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/);

export const PublicEtcSummary = z.object({
  slug: EtcSlug,
  name: z.string(),
  city: z.string(),
  state: z.literal("MT"),
  licenseNumber: z.string(),
  acceptingPatients: z.boolean(),
});
export type PublicEtcSummary = z.infer<typeof PublicEtcSummary>;

export const PublicEtcDetail = PublicEtcSummary.extend({
  about: z.string(),
  address: z.array(z.string()).min(1),
  phone: z.string(),
  hours: z.string(),
  medicalDirector: z.object({ name: z.string(), credentials: z.string() }),
  programs: z.array(ProgramSlug),
  publicDocuments: z.array(
    z.object({
      slug: z.enum(["manual", "etrb-report", "ae-summary"]),
      title: z.string(),
      version: z.string(),
      publishedAt: z.string().datetime(),
      pdfUrl: z.string().url(),
    }),
  ),
});
export type PublicEtcDetail = z.infer<typeof PublicEtcDetail>;

// ----- Eligibility self-screen (anonymous) -----

export const EligibilityQuestion = z.object({
  id: z.string(),
  prompt: z.string(),
  options: z.array(z.string()).min(2),
});
export type EligibilityQuestion = z.infer<typeof EligibilityQuestion>;

export const EligibilityStartResponse = z.object({
  // Opaque session token. Stored in localStorage; expires server-side after 30 days.
  sessionToken: z.string(),
  programSlug: ProgramSlug,
  questions: z.array(EligibilityQuestion).min(1),
});
export type EligibilityStartResponse = z.infer<typeof EligibilityStartResponse>;

export const EligibilityAnswer = z.object({
  questionId: z.string(),
  answer: z.string(),
});
export type EligibilityAnswer = z.infer<typeof EligibilityAnswer>;

export const EligibilityAnswersRequest = z.object({
  answers: z.array(EligibilityAnswer).min(1),
});
export type EligibilityAnswersRequest = z.infer<typeof EligibilityAnswersRequest>;

export const EligibilityCompleteResponse = z.object({
  sessionToken: z.string(),
  result: z.enum(["likely-eligible", "may-not-be-eligible"]),
  // The resultSummary is plain-language and safe to surface; raw answers are
  // never returned to the browser after submission. This keeps the screen
  // anonymous from the moment it's submitted.
  resultSummary: z.string(),
});
export type EligibilityCompleteResponse = z.infer<typeof EligibilityCompleteResponse>;

// ----- Connect request -----

export const ConnectRequestPayload = z.object({
  programSlug: ProgramSlug,
  // The eligibility token if a screen was completed for this program. The API
  // will join the screen result onto the connect request server-side and link
  // it to the patient user record at signup time.
  eligibilitySessionToken: z.string().nullable(),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(40).nullable(),
  bestTimeToContact: z.string().max(200).nullable(),
  // Brief situation field with a strict length cap and a clear UX warning to
  // not paste medical details. The server-side handler runs PHI-detection on
  // this field and rejects the submission with a 422 if it looks like PHI
  // slipped through.
  situation: z.string().max(1000),
});
export type ConnectRequestPayload = z.infer<typeof ConnectRequestPayload>;

export const ConnectRequestResponse = z.object({
  connectRequestId: z.string().uuid(),
  // When the patient doesn't yet have a Clerk account, the API responds with a
  // signup URL. The directory then runs the user through Clerk SignUp and
  // calls the link-anonymous-screen endpoint after success.
  signupUrl: z.string().url().nullable(),
  needsAccount: z.boolean(),
});
export type ConnectRequestResponse = z.infer<typeof ConnectRequestResponse>;

// ----- Anonymous-screen → patient-account linker -----
// Semi-authenticated: the only directory-side endpoint that requires a Clerk
// session. Called once, immediately after Clerk signup completes.

export const LinkAnonymousScreenRequest = z.object({
  eligibilitySessionToken: z.string(),
});
export type LinkAnonymousScreenRequest = z.infer<typeof LinkAnonymousScreenRequest>;

export const LinkAnonymousScreenResponse = z.object({
  linked: z.boolean(),
  patientUserId: z.string().uuid(),
});
export type LinkAnonymousScreenResponse = z.infer<typeof LinkAnonymousScreenResponse>;
