import type { PublicEtcDetail } from "@lewis/shared/api/public";
import { describe, expect, test } from "vitest";

import { buildMedicalClinicJsonLd } from "./medical-clinic-json-ld";

const BIG_SKY_FIXTURE: PublicEtcDetail = {
  slug: "big-sky",
  name: "Big Sky Experimental Treatment Center",
  city: "Bozeman",
  state: "MT",
  licenseNumber: "ETC-2025-001",
  acceptingPatients: true,
  lat: 45.6889,
  lng: -111.0379,
  programCount: 1,
  about: "Outpatient specialty clinic licensed under Montana SB 535.",
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
};

describe("buildMedicalClinicJsonLd", () => {
  test("emits MedicalClinic with name + identifier + address + geo", () => {
    const r = buildMedicalClinicJsonLd(BIG_SKY_FIXTURE);
    expect(r["@context"]).toBe("https://schema.org");
    expect(r["@type"]).toBe("MedicalClinic");
    expect(r.name).toBe("Big Sky Experimental Treatment Center");
    expect(r.identifier).toBe("ETC-2025-001");
    expect(r.address).toEqual({
      "@type": "PostalAddress",
      streetAddress: "1240 N Rouse Avenue, Suite 200",
      addressLocality: "Bozeman",
      addressRegion: "MT",
      addressCountry: "US",
    });
    expect(r.geo).toEqual({
      "@type": "GeoCoordinates",
      latitude: 45.6889,
      longitude: -111.0379,
    });
  });

  test("emits employee when medical director name + credentials present", () => {
    const r = buildMedicalClinicJsonLd(BIG_SKY_FIXTURE);
    expect(r.employee).toEqual({
      "@type": "Person",
      name: "Helena Marsh, MD",
      jobTitle: "Medical Director",
      honorificSuffix: "MD, FACP",
    });
  });

  test("emits contactPoint with physician-inquiries clinical email", () => {
    const r = buildMedicalClinicJsonLd(BIG_SKY_FIXTURE);
    expect(r.contactPoint).toEqual([
      {
        "@type": "ContactPoint",
        contactType: "physician inquiries",
        email: "medical.director@bigskyetc.com",
      },
    ]);
  });

  test("medicalSpecialty derives from offered programs' indications (deduped)", () => {
    const r = buildMedicalClinicJsonLd(BIG_SKY_FIXTURE);
    expect(r.medicalSpecialty).toEqual(["peripheral neuropathy"]);
  });

  test("availableService has one MedicalProcedure per offered program", () => {
    const r = buildMedicalClinicJsonLd(BIG_SKY_FIXTURE);
    expect(r.availableService).toEqual([
      {
        "@type": "MedicalProcedure",
        name: "WST-057",
        procedureType: "https://schema.org/TherapeuticProcedure",
        description: "Investigational treatment for peripheral neuropathy.",
      },
    ]);
  });

  test("omits employee when medical director name + credentials are blank", () => {
    const r = buildMedicalClinicJsonLd({
      ...BIG_SKY_FIXTURE,
      medicalDirector: { name: "", credentials: "", clinicalEmail: null, clinicalPhone: null },
    });
    expect(r.employee).toBeUndefined();
    expect(r.contactPoint).toBeUndefined();
  });

  test("omits geo when lat/lng are null", () => {
    const r = buildMedicalClinicJsonLd({ ...BIG_SKY_FIXTURE, lat: null, lng: null });
    expect(r.geo).toBeUndefined();
  });

  test("omits availableService + medicalSpecialty when no programs offered", () => {
    const r = buildMedicalClinicJsonLd({ ...BIG_SKY_FIXTURE, programs: [], programCount: 0 });
    expect(r.availableService).toBeUndefined();
    expect(r.medicalSpecialty).toBeUndefined();
  });

  test("url uses passed siteUrl + slug", () => {
    const r = buildMedicalClinicJsonLd(BIG_SKY_FIXTURE, {
      siteUrl: "https://staging.lewis.health",
    });
    expect(r.url).toBe("https://staging.lewis.health/etcs/big-sky");
  });
});
