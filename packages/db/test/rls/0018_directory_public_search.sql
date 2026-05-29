-- 0018_directory_public_search.sql RLS test
--
-- Asserts the four invariants from plans/immutable-squishing-sprout.md
-- "Architecture decisions § 1":
--   1. Default-deny when app.role is unset.
--   2. app.role = 'directory_anonymous' sees published rows only.
--   3. Unpublished rows remain invisible under the anonymous role.
--   4. The new policies don't accidentally union the anonymous read with a
--      stale tenant context to expose tenant-private rows.

begin;

select plan(22);

-- ---------------------------------------------------------------------------
-- Setup. The migration's seed data already populates the catalog. We add one
-- extra UNPUBLISHED row to verify the published-flag gate.
--
-- These setup statements run as the migration owner (BYPASSRLS implicit) so
-- the inserts succeed regardless of write policies. The actual RLS exercise
-- happens AFTER `set role app_api` below.
-- ---------------------------------------------------------------------------

select has_table('public', 'conditions', 'conditions table exists');
select has_table('public', 'program_conditions', 'program_conditions join exists');

insert into conditions (id, jurisdiction_id, slug, name, state, published)
select 'fffffff0-0000-0000-0000-000000000001'::uuid, j.id,
       'rls-test-draft-condition', 'RLS Test Draft Condition', 'live', false
from regulatory_jurisdictions j where j.code = 'US-MT';

-- ---------------------------------------------------------------------------
-- Switch to the runtime role. From here on, RLS policies actually evaluate.
-- The migration owner BYPASSes RLS; app_api does NOT (NOBYPASSRLS per 0011).
-- ---------------------------------------------------------------------------

set local role app_api;

-- ---------------------------------------------------------------------------
-- Default-deny: no app.role set.
--
-- Reset app.role explicitly. Prior test files in the same psql session may
-- have set it; transaction-local set_config with the third arg = true is
-- scoped to this transaction only.
-- ---------------------------------------------------------------------------

select set_config('app.role', '', true);

select is_empty(
  $$ select 1 from conditions where published = true $$,
  'default-deny: anonymous role unset → conditions invisible'
);

select is_empty(
  $$ select 1 from programs where directory_published = true $$,
  'default-deny: anonymous role unset → published programs invisible'
);

select is_empty(
  $$ select 1 from etcs where directory_published = true $$,
  'default-deny: anonymous role unset → published etcs invisible'
);

select is_empty(
  $$ select 1 from search_index_documents where visibility_classification = 'public' $$,
  'default-deny: anonymous role unset → public search index invisible'
);

-- ---------------------------------------------------------------------------
-- Anonymous published reads.
-- ---------------------------------------------------------------------------

select set_config('app.role', 'directory_anonymous', true);

-- Conditions: nine published rows from the migration seed.
select is(
  (select count(*)::int from conditions where published = true),
  9,
  'anonymous: sees 9 published conditions'
);

-- The unpublished draft row must NOT appear under the anonymous role.
select is_empty(
  $$ select 1 from conditions where slug = 'rls-test-draft-condition' $$,
  'anonymous: unpublished draft condition invisible'
);

-- Programs: 1 published program (WST-057).
select is(
  (select count(*)::int from programs),
  1,
  'anonymous: sees 1 published program'
);

-- ETCs: 1 published ETC (Big Sky).
select is(
  (select count(*)::int from etcs),
  1,
  'anonymous: sees 1 published ETC'
);

-- search_index_documents: 11 public rows (9 conditions + 1 program + 1 etc).
select is(
  (select count(*)::int from search_index_documents
    where visibility_classification = 'public'),
  11,
  'anonymous: sees 11 public search index rows'
);

-- The four PN conditions all link to WST-057 via program_conditions.
select is(
  (select count(*)::int from program_conditions),
  4,
  'anonymous: sees 4 program-condition links'
);

-- ---------------------------------------------------------------------------
-- Search relevance — § 13.5 off-topic protection asserted at the SQL layer.
-- An ALS query must not surface WST-057 (rank > 0).
-- ---------------------------------------------------------------------------

select is_empty(
  $$ select 1 from search_index_documents
       where source_table = 'programs'
         and visibility_classification = 'public'
         and search_vector @@ websearch_to_tsquery('english', 'ALS') $$,
  'off-topic: ALS query has zero treatment matches (§ 13.5)'
);

select is_empty(
  $$ select 1 from search_index_documents
       where source_table = 'etcs'
         and visibility_classification = 'public'
         and search_vector @@ websearch_to_tsquery('english', 'ALS') $$,
  'off-topic: ALS query has zero ETC matches (§ 13.5)'
);

-- A neuropathy query DOES surface WST-057 because of the linked-condition
-- aggregation in the trigger function.
select isnt(
  (select count(*)::int from search_index_documents
     where source_table = 'programs'
       and visibility_classification = 'public'
       and search_vector @@ websearch_to_tsquery('english', 'neuropathy')),
  0,
  'on-topic: neuropathy query reaches WST-057 via linked PN conditions'
);

select isnt(
  (select count(*)::int from search_index_documents
     where source_table = 'etcs'
       and visibility_classification = 'public'
       and search_vector @@ websearch_to_tsquery('english', 'neuropathy')),
  0,
  'on-topic: neuropathy query reaches Big Sky ETC via linked PPA catalog terms'
);

-- ---------------------------------------------------------------------------
-- Stale tenant context defense.
--
-- A pooled connection might have leftover app.user_id / app.active_tenant_id
-- session variables from a prior tenant-scoped request. Pair the anonymous
-- role with non-null tenant context and verify nothing leaks: the public-read
-- policies must AND on app.role = 'directory_anonymous' AND the published
-- flag, so stale tenant vars never widen anonymous visibility into
-- tenant-private rows.
--
-- Use the seeded WinSanTor tenant (a manufacturer with active rows) as the
-- "stale" identity. Counts must match the prior anonymous-read block exactly
-- (same 9/1/1/11/4 numbers) — the role string is the only authoritative
-- gate.
-- ---------------------------------------------------------------------------

select set_config('app.role', 'directory_anonymous', true);
select set_config('app.active_tenant_id', 'a0000000-0000-0000-0000-000000000001', true);
select set_config('app.user_id', '10000000-0000-0000-0000-000000000099', true);

select is(
  (select count(*)::int from conditions where published = true),
  9,
  'stale-tenant: anonymous role still sees exactly 9 published conditions'
);

select is(
  (select count(*)::int from programs),
  1,
  'stale-tenant: anonymous role still sees exactly 1 published program (no tenant rows leak)'
);

select is(
  (select count(*)::int from etcs),
  1,
  'stale-tenant: anonymous role still sees exactly 1 published ETC (no tenant rows leak)'
);

select is(
  (select count(*)::int from search_index_documents
    where visibility_classification = 'public'),
  11,
  'stale-tenant: anonymous role still sees exactly 11 public search index rows'
);

select is_empty(
  $$ select 1 from search_index_documents
       where source_table = 'programs'
         and visibility_classification = 'public'
         and search_vector @@ websearch_to_tsquery('english', 'ALS') $$,
  'stale-tenant: ALS query still has zero treatment matches under stale tenant context'
);

select is_empty(
  $$ select 1 from conditions where slug = 'rls-test-draft-condition' $$,
  'stale-tenant: unpublished draft condition stays invisible under stale tenant context'
);

select * from finish();

rollback;
