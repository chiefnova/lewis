// Schema.org `MedicalClinic` JSON-LD builder for /etcs/:slug pages per
// directoryprd.md § 16.3. Emitted via useSeo's `jsonLd` option.
//
// Per § 16.3 the existing MedicalClinic schema is augmented with:
//   - medicalSpecialty — array of specialties offered (derived from the
//     ETC's offered programs' indications / forms).
//   - availableService — array of MedicalProcedure references for each
//     offered program.
//
// The builder is split out so the "no employee block when medicalDirector
// fields are blank" invariant is unit-testable, and so the Schema.org
// choices are auditable in PR diffs against PRD § 16.3 rather than buried
// in JSX.

import type { PublicEtcDetail } from "@lewis/shared/api/public";

type PostalAddress = {
  "@type": "PostalAddress";
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
};

type GeoCoordinates = {
  "@type": "GeoCoordinates";
  latitude: number;
  longitude: number;
};

type Person = {
  "@type": "Person";
  name: string;
  jobTitle?: string;
  honorificSuffix?: string;
};

type ContactPoint = {
  "@type": "ContactPoint";
  contactType: string;
  email?: string;
  telephone?: string;
};

type MedicalProcedure = {
  "@type": "MedicalProcedure";
  name: string;
  procedureType?: "https://schema.org/TherapeuticProcedure";
  description?: string;
};

export type MedicalClinicJsonLd = {
  "@context": "https://schema.org";
  "@type": "MedicalClinic";
  name: string;
  description?: string;
  url?: string;
  identifier?: string;
  address?: PostalAddress;
  geo?: GeoCoordinates;
  telephone?: string;
  employee?: Person;
  contactPoint?: ContactPoint[];
  medicalSpecialty?: string[];
  availableService?: MedicalProcedure[];
};

export function buildMedicalClinicJsonLd(
  etc: PublicEtcDetail,
  options?: { siteUrl?: string },
): MedicalClinicJsonLd {
  const jsonLd: MedicalClinicJsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: etc.name,
  };

  if (etc.about) {
    jsonLd.description = etc.about;
  }

  const siteUrl = options?.siteUrl ?? "https://lewis.health";
  jsonLd.url = `${siteUrl.replace(/\/+$/, "")}/etcs/${etc.slug}`;

  if (etc.licenseNumber) {
    jsonLd.identifier = etc.licenseNumber;
  }

  // Address — split the multi-line array. First line is street, second is
  // typically "City, ST ZIP". Schema.org PostalAddress expects fields
  // disaggregated; we surface what we can and omit the rest.
  if (etc.address.length > 0) {
    const address: PostalAddress = {
      "@type": "PostalAddress",
      addressCountry: "US",
    };
    if (etc.address[0]) address.streetAddress = etc.address[0];
    if (etc.city) address.addressLocality = etc.city;
    address.addressRegion = etc.state;
    jsonLd.address = address;
  }

  if (etc.lat !== null && etc.lng !== null) {
    jsonLd.geo = {
      "@type": "GeoCoordinates",
      latitude: etc.lat,
      longitude: etc.lng,
    };
  }

  if (etc.phone) {
    jsonLd.telephone = etc.phone;
  }

  // Medical director as the clinic's named employee. Omit the block entirely
  // if name + credentials are both blank (a clinic without a published
  // medical director hasn't earned the trust signal — a SearchEngine
  // shouldn't render an empty card).
  if (etc.medicalDirector.name && etc.medicalDirector.credentials) {
    jsonLd.employee = {
      "@type": "Person",
      name: etc.medicalDirector.name,
      jobTitle: "Medical Director",
      honorificSuffix: etc.medicalDirector.credentials,
    };
  }

  // Clinical-inquiries contact point — surfaces the medical director's
  // email/phone separately from the general clinic phone for clinicians
  // searching for a peer contact (per § 16.2).
  const clinicalEmail = etc.medicalDirector.clinicalEmail;
  const clinicalPhone = etc.medicalDirector.clinicalPhone;
  if (clinicalEmail || clinicalPhone) {
    const cp: ContactPoint = {
      "@type": "ContactPoint",
      contactType: "physician inquiries",
    };
    if (clinicalEmail) cp.email = clinicalEmail;
    if (clinicalPhone) cp.telephone = clinicalPhone;
    jsonLd.contactPoint = [cp];
  }

  // medicalSpecialty — derived from offered programs' indications.
  // Deduplicate and trim. If the ETC has no offered programs (orphan ETC),
  // omit the field rather than emitting an empty array.
  const specialties = Array.from(
    new Set(
      etc.programs
        .map((p) => p.indication)
        .filter((i): i is string => i !== null && i.trim().length > 0)
        .map((i) => i.trim()),
    ),
  );
  if (specialties.length > 0) {
    jsonLd.medicalSpecialty = specialties;
  }

  // availableService — one MedicalProcedure per offered program.
  if (etc.programs.length > 0) {
    jsonLd.availableService = etc.programs.map((p) => {
      const proc: MedicalProcedure = {
        "@type": "MedicalProcedure",
        name: p.name,
        procedureType: "https://schema.org/TherapeuticProcedure",
      };
      if (p.indication) {
        proc.description = `Investigational treatment for ${p.indication}.`;
      }
      return proc;
    });
  }

  return jsonLd;
}
