// Static catalog seed for launch. Faithful port of the design handoff fixture.
// This will be replaced by the public API (/v1/public/programs, /v1/public/etcs)
// once those endpoints exist; the shape here matches the public Zod schemas in
// @lewis/shared/api/public.ts.

import type { ReactNode } from "react";
import { Capsule, IVBag, Pen, RoundTablet, TopicalTube, Vial } from "../components/Products";

export interface CatalogProgram {
  slug: string;
  name: string;
  indication: string;
  manufacturer?: string;
  form?: string;
  phase?: string;
  etcs: number;
  etcCity?: string;
  available: boolean;
  art: ReactNode;
}

export type CatalogConditionState = "live" | "coming_soon" | "not_offered";

export interface CatalogCondition {
  slug: string;
  name: string;
  icd10Codes: ReadonlyArray<string>;
  summary: string;
  state: CatalogConditionState;
  programSlugs: ReadonlyArray<string>;
}

export const FEATURED_HOMEPAGE: ReadonlyArray<{
  name: string;
  indication: string;
  etcs?: number;
  status?: string;
  muted?: boolean;
  art: ReactNode;
  slug?: string;
}> = [
  {
    name: "WST-057®",
    indication: "for diabetic peripheral neuropathy",
    etcs: 1,
    status: "available",
    art: <TopicalTube size={220} />,
    slug: "wst-057",
  },
  { name: "Coming soon", indication: "next listed program", muted: true, art: <Vial size={200} /> },
  {
    name: "Coming soon",
    indication: "next listed program",
    muted: true,
    art: <RoundTablet size={180} color="#D9CAB0" />,
  },
  {
    name: "Coming soon",
    indication: "next listed program",
    muted: true,
    art: <Capsule size={200} rotate={-18} />,
  },
];

// TODO(sprint-2): replace this constant with `publicApi.listConditions()` once
// the /v1/public/conditions endpoint lands. Until then, this array MUST mirror
// the seed in packages/db/migrations/0018_directory_public_search.sql § 7f
// because ConditionDetailPage reads from here.
export const CONDITIONS: ReadonlyArray<CatalogCondition> = [
  {
    slug: "diabetic-peripheral-neuropathy",
    name: "Diabetic peripheral neuropathy",
    icd10Codes: ["E11.40", "E11.42"],
    summary:
      "Nerve damage caused by chronic high blood sugar in people with diabetes. Most often presents as numbness, burning, or tingling in the feet and hands.",
    state: "live",
    programSlugs: ["wst-057"],
  },
  {
    slug: "chemotherapy-induced-peripheral-neuropathy",
    name: "Chemotherapy-induced peripheral neuropathy",
    icd10Codes: ["G62.0"],
    summary:
      "Peripheral nerve damage from chemotherapy. Often persists after treatment ends and can limit quality of life and dosing.",
    state: "live",
    programSlugs: ["wst-057"],
  },
  {
    slug: "hiv-induced-peripheral-neuropathy",
    name: "HIV-induced peripheral neuropathy",
    icd10Codes: ["G62.81"],
    summary:
      "Peripheral nerve damage occurring in people living with HIV, sometimes related to the virus itself and sometimes to antiretroviral therapy.",
    state: "live",
    programSlugs: ["wst-057"],
  },
  {
    slug: "idiopathic-peripheral-neuropathy",
    name: "Idiopathic peripheral neuropathy",
    icd10Codes: ["G60.9"],
    summary: "Peripheral neuropathy without an identified underlying cause after standard workup.",
    state: "live",
    programSlugs: ["wst-057"],
  },
  {
    slug: "ptsd",
    name: "Post-traumatic stress disorder (PTSD)",
    icd10Codes: ["F43.10"],
    summary:
      "A psychiatric condition that may develop after exposure to a traumatic event. Standard-of-care includes trauma-focused psychotherapy and select pharmacotherapy.",
    state: "coming_soon",
    programSlugs: [],
  },
  {
    slug: "als",
    name: "Amyotrophic Lateral Sclerosis (ALS)",
    icd10Codes: ["G12.21"],
    summary:
      "A progressive neurodegenerative disease affecting motor neurons. No Montana ETC currently offers a program for ALS.",
    state: "not_offered",
    programSlugs: [],
  },
  {
    slug: "multiple-sclerosis",
    name: "Multiple sclerosis",
    icd10Codes: ["G35"],
    summary:
      "A chronic autoimmune condition affecting the central nervous system. No Montana ETC currently offers a program for multiple sclerosis.",
    state: "not_offered",
    programSlugs: [],
  },
  {
    slug: "rare-cancers",
    name: "Rare cancers",
    icd10Codes: [],
    summary:
      "Umbrella term for cancers with low overall incidence. No Montana ETC currently offers an investigational program in this category.",
    state: "not_offered",
    programSlugs: [],
  },
  {
    slug: "autoimmune-diseases",
    name: "Autoimmune diseases",
    icd10Codes: [],
    summary:
      "Umbrella term for conditions in which the immune system attacks the body's own tissues. No Montana ETC currently offers an investigational program in this category.",
    state: "not_offered",
    programSlugs: [],
  },
];

export const CATALOG: ReadonlyArray<CatalogProgram> = [
  {
    slug: "wst-057",
    name: "WST-057®",
    indication: "for diabetic peripheral neuropathy",
    manufacturer: "WinSanTor",
    form: "Topical",
    phase: "Phase 2",
    etcs: 1,
    etcCity: "Bozeman, MT",
    art: <TopicalTube size={220} />,
    available: true,
  },
  {
    slug: "soon-1",
    name: "Coming soon",
    indication: "amyotrophic lateral sclerosis",
    form: "Infusion",
    phase: "Phase 2",
    etcs: 0,
    art: <IVBag size={210} />,
    available: false,
  },
  {
    slug: "soon-2",
    name: "Coming soon",
    indication: "rare hematologic indication",
    form: "Injection",
    phase: "Phase 2",
    etcs: 0,
    art: <Pen size={230} />,
    available: false,
  },
  {
    slug: "soon-3",
    name: "Coming soon",
    indication: "autoimmune indication",
    form: "Oral",
    phase: "Phase 3",
    etcs: 0,
    art: <Capsule size={210} rotate={-22} />,
    available: false,
  },
  {
    slug: "soon-4",
    name: "Coming soon",
    indication: "oncology, solid tumor",
    form: "Injection",
    phase: "Phase 1",
    etcs: 0,
    art: <Vial size={210} />,
    available: false,
  },
  {
    slug: "soon-5",
    name: "Coming soon",
    indication: "rare metabolic disorder",
    form: "Oral",
    phase: "Phase 2",
    etcs: 0,
    art: <RoundTablet size={170} color="#D9CAB0" />,
    available: false,
  },
];

export interface CatalogEtc {
  slug: string;
  name: string;
  city: string;
  state: string;
  licenseNumber: string;
  programs: ReadonlyArray<string>;
  about: string;
  address: ReadonlyArray<string>;
  phone: string;
  hours: string;
  medicalDirector: { name: string; credentials: string };
}

export const ETCS: ReadonlyArray<CatalogEtc> = [
  {
    slug: "big-sky",
    name: "Big Sky Experimental Treatment Center",
    city: "Bozeman",
    state: "MT",
    licenseNumber: "ETC-2025-001",
    programs: ["wst-057"],
    about:
      "Big Sky ETC is an outpatient specialty clinic licensed in 2025 under Montana's Experimental Treatment Center framework. The center focuses on neurology, pain medicine, and rare-disease consultation, with a multidisciplinary clinical team including board-certified neurologists, pharmacists, and clinical research coordinators.",
    address: ["1240 N Rouse Avenue, Suite 200", "Bozeman, MT 59715"],
    phone: "(406) 555-0142",
    hours: "Monday–Friday · 8:00 AM – 5:00 PM Mountain",
    medicalDirector: {
      name: "Dr. Helena Marsh, MD",
      credentials: "Board-certified Neurology · Montana License #MD-19042",
    },
  },
];

export function getProgramBySlug(slug: string): CatalogProgram | undefined {
  return CATALOG.find((p) => p.slug === slug);
}

export function getEtcBySlug(slug: string): CatalogEtc | undefined {
  return ETCS.find((e) => e.slug === slug);
}

export function getConditionBySlug(slug: string): CatalogCondition | undefined {
  return CONDITIONS.find((c) => c.slug === slug);
}

export function getProgramsForCondition(condition: CatalogCondition): CatalogProgram[] {
  return condition.programSlugs
    .map((slug) => getProgramBySlug(slug))
    .filter((program): program is CatalogProgram => Boolean(program));
}
