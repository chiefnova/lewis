// Public-API schemas for the lewis.health directory app. These endpoints
// are intentionally narrow — anonymous browse, anonymous eligibility-screen
// session, and the connect-request submission. No PHI ever lands on these
// routes; the patient portal (patient.lewis.health) handles enrollment
// and consent on its own authenticated surface.

import { z } from "zod";

import { ConditionState } from "./search.js";

export { ConditionState };

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

// Slice 3 — Clinical evidence augmentations per directoryprd.md § 15.3.
// Citation + DOI come paired so consumers can render either the citation
// alone or as a link to https://doi.org/{doi}.
export const PublicProgramPublishedPaper = z.object({
  citation: z.string().min(1),
  doi: z.string().min(1),
});
export type PublicProgramPublishedPaper = z.infer<typeof PublicProgramPublishedPaper>;

// ETRB approval per RULE 16(6)(a). Date is ISO YYYY-MM-DD; the API converts
// the underlying `date` column to that string shape so consumers don't have
// to think about timezones (an ETRB approval has a calendar day, not an
// instant).
export const PublicProgramEtrb = z.object({
  approvalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  boardName: z.string().min(1),
});
export type PublicProgramEtrb = z.infer<typeof PublicProgramEtrb>;

export const PublicProgramDetail = PublicProgramSummary.extend({
  about: z.string(),
  whoThisIsFor: z.string(),
  enrollment: z.array(z.string()),
  costRange: z
    .object({
      low: z.number().int().nonnegative(),
      high: z.number().int().nonnegative(),
      currency: z.literal("USD"),
      // Per-program disclaimer wording. Lives in the DB so counsel can
      // override per program without an application code change.
      disclaimer: z.string().nullable(),
    })
    .nullable(),
  publishedEvidenceUrl: z.string().url().nullable(),
  // Slice 3 additions — § 15.3 Clinical evidence block. All nullable so a
  // future program with partial evidence still renders; the UI hides the
  // missing sub-sections rather than rendering placeholders.
  clinicalTrialsGovId: z.string().nullable(),
  indNumber: z.string().nullable(),
  publishedPaper: PublicProgramPublishedPaper.nullable(),
  etrb: PublicProgramEtrb.nullable(),
  mechanismSummary: z.string().nullable(),
  keySafetyFindings: z.string().nullable(),
});
export type PublicProgramDetail = z.infer<typeof PublicProgramDetail>;

export const PublicProgramListResponse = z.object({
  programs: z.array(PublicProgramSummary),
  total: z.number().int().nonnegative(),
});
export type PublicProgramListResponse = z.infer<typeof PublicProgramListResponse>;

// ----- Conditions (the directory's primary patient browse surface) -----

export const ConditionSlug = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/, "Condition slugs must be lowercase kebab-case.");

export const PublicConditionSummary = z.object({
  slug: ConditionSlug,
  name: z.string(),
  state: ConditionState,
  summary: z.string().nullable(),
  icd10Codes: z.array(z.string()),
  programCount: z.number().int().nonnegative(),
  href: z.string(),
});
export type PublicConditionSummary = z.infer<typeof PublicConditionSummary>;

export const PublicConditionLinkedProgram = z.object({
  slug: z.string(),
  name: z.string(),
  drug: z.string().nullable(),
  // Phase + form come straight off the programs table. Manufacturer stays
  // nullable until sponsor display names are exposed through a public-safe
  // API/RLS path; the directory UI drops missing fields rather than rendering
  // placeholders.
  phase: z.string().nullable(),
  form: z.string().nullable(),
  manufacturer: z.string().nullable(),
});
export type PublicConditionLinkedProgram = z.infer<typeof PublicConditionLinkedProgram>;

export const PublicConditionDetail = PublicConditionSummary.extend({
  linkedPrograms: z.array(PublicConditionLinkedProgram),
});
export type PublicConditionDetail = z.infer<typeof PublicConditionDetail>;

export const PublicConditionListResponse = z.object({
  conditions: z.array(PublicConditionSummary),
});
export type PublicConditionListResponse = z.infer<typeof PublicConditionListResponse>;

// ----- ETCs -----

export const EtcSlug = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/);

// Slice 4 — Mapbox lat/lng + programCount surfaced on summary so the /etcs
// index can render list cards + map pins from a single payload (no per-ETC
// detail round-trip). lat/lng coherence (both null, or both set with valid
// ranges) is enforced at the DB layer in migration 0020.
export const PublicEtcSummary = z.object({
  slug: EtcSlug,
  name: z.string(),
  city: z.string(),
  state: z.literal("MT"),
  licenseNumber: z.string(),
  acceptingPatients: z.boolean(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  programCount: z.number().int().nonnegative(),
});
export type PublicEtcSummary = z.infer<typeof PublicEtcSummary>;

// Slice 4 — § 16.2 "For physicians: clinical inquiries" contact line.
// At least one of clinicalEmail / clinicalPhone is shown when present; both
// can be null on ETCs that haven't published a clinician contact yet
// (the EtcProfilePage hides the block in that case).
export const MedicalDirectorContact = z.object({
  name: z.string(),
  credentials: z.string(),
  clinicalEmail: z.string().email().nullable(),
  clinicalPhone: z.string().nullable(),
});
export type MedicalDirectorContact = z.infer<typeof MedicalDirectorContact>;

// Slice 4 — programs offered by an ETC, joined via active PPA. Returned by
// the directory_etc_program_offerings SECURITY DEFINER helper; surfacing the
// full row (not just slugs) lets EtcProfilePage render the "Treatments
// offered" panel in one round trip.
export const PublicEtcOfferedProgram = z.object({
  slug: ProgramSlug,
  name: z.string(),
  drug: z.string().nullable(),
  indication: z.string().nullable(),
  form: z.string().nullable(),
  phase: z.string().nullable(),
});
export type PublicEtcOfferedProgram = z.infer<typeof PublicEtcOfferedProgram>;

export const PublicEtcDetail = PublicEtcSummary.extend({
  about: z.string(),
  address: z.array(z.string()).min(1),
  phone: z.string().nullable(),
  hours: z.string().nullable(),
  medicalDirector: MedicalDirectorContact,
  programs: z.array(PublicEtcOfferedProgram),
  // § 16.4 — `ae-summary` removed; folded into `etrb-report`. Slice 4 hard-
  // deletes the route, sitemap entry, and this enum value.
  publicDocuments: z.array(
    z.object({
      slug: z.enum(["manual", "etrb-report"]),
      title: z.string(),
      version: z.string(),
      publishedAt: z.string().datetime(),
      pdfUrl: z.string().url(),
    }),
  ),
});
export type PublicEtcDetail = z.infer<typeof PublicEtcDetail>;

export const PublicEtcListResponse = z.object({
  etcs: z.array(PublicEtcSummary),
});
export type PublicEtcListResponse = z.infer<typeof PublicEtcListResponse>;

// ----- Faceted programs catalog (slice 4 BrowsePage) -----

// Each facet bucket carries a count keyed off the human-readable label. The
// API's facet handler builds 5 parallel queries so counts respect the OTHER
// active filters but not the filter for the same facet (standard Amazon-
// style "what would the count be if I added this value" behavior).
const FacetSlugBucket = z.object({
  slug: z.string(),
  name: z.string(),
  count: z.number().int().nonnegative(),
});

const FacetEnumBucket = z.object({
  code: z.string(),
  display: z.string(),
  count: z.number().int().nonnegative(),
});

export const PublicProgramFacets = z.object({
  conditions: z.array(FacetSlugBucket),
  forms: z.array(FacetEnumBucket),
  phases: z.array(FacetEnumBucket),
  etcs: z.array(FacetSlugBucket),
  manufacturers: z.array(FacetSlugBucket),
});
export type PublicProgramFacets = z.infer<typeof PublicProgramFacets>;

// ----- Marketing subscriptions (slice 4) -----

export const MarketingSubscriptionSource = z.enum([
  "announcement_strip",
  "homepage_beginning",
  "browse_bottom",
]);
export type MarketingSubscriptionSource = z.infer<typeof MarketingSubscriptionSource>;

export const MarketingSubscriptionRequest = z.object({
  // RFC 5321 §4.5.3.1.3 caps practical email addresses at 254 chars.
  email: z.string().email().max(254),
  source: MarketingSubscriptionSource,
});
export type MarketingSubscriptionRequest = z.infer<typeof MarketingSubscriptionRequest>;

// Always-success shape — the API returns the same response for new + existing
// subscribers to defeat email-existence timing attacks. The "check your
// email" message is the front-end's signal to render the success state.
export const MarketingSubscriptionResponse = z.object({
  ok: z.literal(true),
  message: z.string(),
});
export type MarketingSubscriptionResponse = z.infer<typeof MarketingSubscriptionResponse>;

export const MarketingConfirmResponse = z.object({
  confirmed: z.boolean(),
});
export type MarketingConfirmResponse = z.infer<typeof MarketingConfirmResponse>;

export const MarketingUnsubscribeResponse = z.object({
  unsubscribed: z.boolean(),
});
export type MarketingUnsubscribeResponse = z.infer<typeof MarketingUnsubscribeResponse>;

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
