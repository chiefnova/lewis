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
