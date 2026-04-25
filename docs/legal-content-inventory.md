# Legal Content Inventory

This is the Phase 0 tracker for regulated text that must become immutable `legal_content_template_versions` before production use. Counsel approval is a Sprint 2 blocker for PPA content and a Sprint 4 blocker for consent/agreement content.

| Template | Source citation | Owner | Counsel status | Needed by | Notes |
|---|---|---|---|---|---|
| P&P seed templates | RULE 6(2) | Founding product + counsel | Not started | Sprint 3 | One template per required policy category. |
| Informed consent text | 50-12-105(2)(a)-(h), 50-12-105(3) | Counsel | Not started | Sprint 4 | Covers recorded and written paths. |
| Patient agreement | RULE 11(2), 50-12-110 | Counsel | Not started | Sprint 4 | Must include full 50-12-110 text. |
| 50-12-110 statutory text | 50-12-110 | Counsel | Not started | Sprint 4 | Store as immutable legal template source. |
| Grievance policy text | RULE 6(2)(j), RULE 11(2)(g) | Counsel | Not started | Sprint 3/4 | Used in P&P and patient agreement. |
| PPA data-sharing language | PRD sponsor data-sharing decision | Counsel | Not started | Sprint 2 | MVP 1 options: aggregate-only or de-identified line-level safety. |
| Privacy rights notice | HIPAA access/amendment/accounting/restriction | Counsel | Not started | Sprint 4 | Patient portal and export workflows. |
| AE/DPHHS submission attestations | RULE 17 | Counsel | Not started | Sprint 5 | Used in AE report generation and submission tracking. |
| HFAR Path B attestation | SB 535 §§ 2, 3 | Counsel | Not started | Sprint 5 | Preserve dual interpretation of net annual profits. |
| ETRB annual report disclaimer | RULE 16(6)(c) | Counsel | Not started | Sprint 5 | Public report generated from board data. |

Counsel decision log:

- AE clock basis: pending. Engineering default is conservative earliest-known timestamp warning model until counsel selects formal `clock_basis`.
