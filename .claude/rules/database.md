---
paths:
  - "packages/db/**"
---

# Database Rules

- RLS policies must use transaction-local `app.*` session variables, never raw Clerk JWT claims.
- App and worker runtime roles must not bypass RLS.
- Every PHI-bearing table needs an RLS test in `packages/db/test/rls`.
- Regulated tables must carry `jurisdiction_id` unless they are global lookup/config tables.
- Audit and regulated retention controls belong in database constraints/triggers, not only application code.
