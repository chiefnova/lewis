# /legislation static assets

Public-directory PDF references cited by [apps/directory/src/pages/ForCliniciansPage.tsx](../../src/pages/ForCliniciansPage.tsx) (and any future page that links to the canonical statutes).

## Expected files

Drop the following PDFs in this folder. They are served at:

| URL path                          | Source                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/legislation/sb535.pdf`          | Senate Bill 535 — 69th Montana Legislature (2025). Canonical source: `https://leg.mt.gov/bills/2025/BillPdf/SB0535.pdf` (counsel-verifiable before launch). Repo transcript at [docs/legislation/sb535.md](../../../../docs/legislation/sb535.md).                                                                                                               |
| `/legislation/mar-2026-427-1.pdf` | MAR Notice 2026-427.1 — Department of Public Health and Human Services proposed rulemaking on Experimental Treatment Centers. Issue No. 7, April 10, 2026. Canonical source: Montana Secretary of State Administrative Rules register (URL counsel-verifiable before launch). Repo transcript at [docs/legislation/etc.md](../../../../docs/legislation/etc.md). |

## Slice-5 status

These PDF filenames are referenced by `<a href="/legislation/sb535.pdf" download>` and `<a href="/legislation/mar-2026-427-1.pdf" download>` in ForCliniciansPage.tsx. Until the PDFs are dropped here, the links will 404. The body letter on `/for-clinicians` still carries the verbatim § 12 statute and full citation chain in inline text, so no legal content is lost while the PDFs are pending.

## Why static files, not server-rendered PDFs

The regulated-artifacts pipeline (Puppeteer + BullMQ — see [docs/b2bprd.md § 17.5](../../../../docs/b2bprd.md)) is for patient-PHI documents (agreements, consent recordings, ETRB approvals, AE reports). Public statute reproductions don't need that pipeline — they are canonical Montana state documents, served as static assets cached at the edge.

## Counsel review

The exact canonical-source URL for the MAR notice should be verified by counsel before launch. The SB 535 PDF on leg.mt.gov is the standard Montana Legislature enrolled-bill PDF location.
