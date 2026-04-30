-- 0018_directory_public_search.sql
--
-- Public directory search slice. See plans/immutable-squishing-sprout.md and
-- docs/directoryprd.md § 13 for the spec.
--
-- WHY:
--   The lewis.health directory is anonymous and SEO-critical. To answer a
--   patient query like "diabetic neuropathy montana experimental treatment"
--   we need three things at the data layer:
--     (a) a real `conditions` table with seeded rows so condition pages can
--         exist and link back from search results,
--     (b) a many-to-many program_conditions join — WST-057 covers four PN
--         indications per directoryprd.md § 2.4 Phase 1,
--     (c) a public-readable subset of programs/etcs/conditions/
--         search_index_documents that an ANONYMOUS request can SELECT
--         without a tenant membership.
--
--   The anonymous read path is gated by a NEW transaction-local context:
--   app.role = 'directory_anonymous'. This is NOT a service-role bypass —
--   the runtime role stays app_api (NOBYPASSRLS, see 0011) and every
--   public-read policy must independently match the role string AND the
--   row's published flag. Default-deny on missing context is asserted in
--   test/rls/0018_directory_public_search.sql.
--
--   search_index_documents itself was created in 0005 with the right shape
--   (tsvector, GIN, pg_trgm). This migration adds the public-read policy
--   and the trigger functions that maintain its rows from the source
--   tables. Async indexing via search_index_jobs (also from 0005) is left
--   unused at MVP-0 — the seed catalog is small enough that synchronous
--   triggers are simpler, transactional, and immediately consistent.

-- ---------------------------------------------------------------------------
-- 1. New tables: conditions + program_conditions
-- ---------------------------------------------------------------------------

create table conditions (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_id uuid not null references regulatory_jurisdictions(id),
  slug text not null unique,
  name text not null,
  icd10_codes text[] not null default '{}',
  summary text,
  state text not null check (state in ('live', 'coming_soon', 'not_offered')),
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create index conditions_published_state_idx on conditions (published, state);

create table program_conditions (
  program_id uuid not null references programs(id) on delete cascade,
  condition_id uuid not null references conditions(id) on delete cascade,
  primary key (program_id, condition_id)
);

create index program_conditions_condition_idx on program_conditions (condition_id);

-- ---------------------------------------------------------------------------
-- 2. Directory-listing columns on existing tables
--
-- programs and etcs are tenant-scoped. The directory_published flag plus
-- directory_slug let a single source row be both the tenant's working draft
-- AND the public catalog entry without forking schemas.
-- ---------------------------------------------------------------------------

alter table programs
  add column directory_slug text unique,
  add column directory_summary text,
  add column directory_published boolean not null default false;

alter table etcs
  add column directory_slug text unique,
  add column directory_city text,
  add column directory_summary text,
  add column directory_published boolean not null default false;

-- ---------------------------------------------------------------------------
-- 3. RLS: enable + force on the new tables (matches 0011 pattern)
-- ---------------------------------------------------------------------------

alter table conditions enable row level security;
alter table conditions force row level security;
alter table program_conditions enable row level security;
alter table program_conditions force row level security;

-- ---------------------------------------------------------------------------
-- 4. Public-read policies
--
-- Every policy independently checks:
--   - app.role = 'directory_anonymous' (transaction-local; default-deny on
--     missing setting via coalesce → empty string)
--   - the row's published flag
--
-- These policies are ADDITIVE to the existing tenant-scoped policies
-- (conditions/program_conditions don't have those; programs/etcs do, defined
-- in 0004 and 0008). Postgres OR-combines policies of the same command type;
-- a tenant member sees their tenant's rows via the existing policy AND would
-- additionally see published rows via the new policy. That's intentional and
-- safe: published rows are public by definition.
-- ---------------------------------------------------------------------------

create policy conditions_directory_public_read on conditions
  for select using (
    coalesce(current_setting('app.role', true), '') = 'directory_anonymous'
    and published = true
  );

create policy program_conditions_directory_public_read on program_conditions
  for select using (
    coalesce(current_setting('app.role', true), '') = 'directory_anonymous'
    and exists (
      select 1 from conditions c
      where c.id = program_conditions.condition_id
        and c.published = true
    )
    and exists (
      select 1 from programs p
      where p.id = program_conditions.program_id
        and p.directory_published = true
    )
  );

create policy programs_directory_public_read on programs
  for select using (
    coalesce(current_setting('app.role', true), '') = 'directory_anonymous'
    and directory_published = true
  );

create policy etcs_directory_public_read on etcs
  for select using (
    coalesce(current_setting('app.role', true), '') = 'directory_anonymous'
    and directory_published = true
  );

create policy search_index_documents_directory_public_read on search_index_documents
  for select using (
    coalesce(current_setting('app.role', true), '') = 'directory_anonymous'
    and visibility_classification = 'public'
  );

-- ---------------------------------------------------------------------------
-- 4b. Write policies for the catalog tables.
--
-- conditions and program_conditions are global, jurisdiction-scoped catalog
-- data. Writes are lewis_admin-only at MVP-0 (matches the regulatory_*
-- write posture from 0008). A future sponsor-publishing flow may extend
-- write access for the join table; for now, the Lewis editorial team
-- writes both via the operating platform (or via migrations like the seed
-- below).
--
-- Policy shape mirrors regulatory_rule_versions_write in 0008: gate on an
-- active tenant_memberships row whose role grants 'regulatory:write'
-- (currently only 'lewis_admin' per app.role_grants_action). The
-- directory_anonymous role has no membership, so it cannot write — the
-- public-read policies above stay correctly read-only.
-- ---------------------------------------------------------------------------

create policy conditions_admin_write on conditions
  for all to public
  using (
    exists (
      select 1
      from tenant_memberships tm
      where tm.user_id = app.current_user_id()
        and tm.status = 'active'
        and tm.starts_at <= now()
        and (tm.ends_at is null or tm.ends_at > now())
        and app.role_grants_action(tm.role, 'regulatory:write')
    )
  )
  with check (
    exists (
      select 1
      from tenant_memberships tm
      where tm.user_id = app.current_user_id()
        and tm.status = 'active'
        and tm.starts_at <= now()
        and (tm.ends_at is null or tm.ends_at > now())
        and app.role_grants_action(tm.role, 'regulatory:write')
    )
  );

create policy program_conditions_admin_write on program_conditions
  for all to public
  using (
    exists (
      select 1
      from tenant_memberships tm
      where tm.user_id = app.current_user_id()
        and tm.status = 'active'
        and tm.starts_at <= now()
        and (tm.ends_at is null or tm.ends_at > now())
        and app.role_grants_action(tm.role, 'regulatory:write')
    )
  )
  with check (
    exists (
      select 1
      from tenant_memberships tm
      where tm.user_id = app.current_user_id()
        and tm.status = 'active'
        and tm.starts_at <= now()
        and (tm.ends_at is null or tm.ends_at > now())
        and app.role_grants_action(tm.role, 'regulatory:write')
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Trigger functions: maintain search_index_documents from source rows.
--
-- One trigger function per source table. Each upserts the appropriate row
-- in search_index_documents on INSERT/UPDATE; DELETEs cascade. When a row
-- becomes unpublished, its index row is removed so the public-read policy
-- can never reach it.
--
-- SECURITY DEFINER is required because search_index_documents has an owner
-- read policy that gates on owner_tenant_id; the trigger runs in the
-- context of the WRITE that triggered it, not necessarily as a tenant
-- member. Per 0011, the function owner is the migration superuser
-- (BYPASSRLS implicit). If function ownership is ever transferred to
-- app_migrator, the contract documented in 0011 applies.
--
-- The tsvector weights match the patient mental model:
--   A — names (program name, drug name, condition name, ETC name)
--   B — tightly-coupled context (linked indication terms for programs;
--       linked program names for conditions)
--   C — descriptions / summaries
--
-- This weighting ensures a query for "neuropathy" ranks the four PN
-- conditions ABOVE WST-057 (whose own name doesn't contain "neuropathy"
-- but whose linked-condition aggregation does — weight B).
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 5a. By-id helpers — single source of truth for re-indexing one source row.
--
-- Each helper takes the row's primary key and re-runs the SAME upsert logic
-- the corresponding AFTER trigger uses. The trigger functions become thin
-- wrappers around these helpers; cascade paths (touch_related_etcs, the
-- join-table trigger, the program→conditions cascade) call these helpers
-- DIRECTLY rather than firing no-op `UPDATE x SET col = col` statements.
-- This keeps every program/condition/etc edit on a fully audited row-state
-- transition path even if other AFTER triggers (audit_log, retention,
-- regulatory) land on these tables later.
--
-- SECURITY DEFINER + the function-owner contract from migration 0011 give
-- these helpers BYPASSRLS on the source-table reads they need (e.g. condition
-- → linked-program aggregation).
-- ---------------------------------------------------------------------------

create or replace function app.directory_search_upsert_program_by_id(p_program_id uuid)
returns void
language plpgsql security definer set search_path = app, public as $$
declare
  v_program record;
  v_indication_terms text;
begin
  select id, name, drug, sponsor_tenant_id, directory_summary,
         patient_facing_description, directory_published
    into v_program
    from programs where id = p_program_id;

  if not found or v_program.directory_published is not true then
    delete from search_index_documents
      where source_table = 'programs' and source_id = p_program_id;
    return;
  end if;

  -- Aggregate linked-condition names so a query for "diabetic neuropathy"
  -- matches WST-057 even though the program row's own indication string
  -- only names one of the four indications.
  select string_agg(c.name, ' ')
    into v_indication_terms
    from program_conditions pc
    join conditions c on c.id = pc.condition_id
    where pc.program_id = v_program.id
      and c.published = true;

  insert into search_index_documents (
    source_table, source_id, owner_tenant_id, visibility_classification,
    title, redacted_snippet, search_vector, indexed_at
  ) values (
    'programs',
    v_program.id,
    v_program.sponsor_tenant_id,
    'public',
    v_program.name,
    coalesce(v_program.directory_summary, v_program.patient_facing_description, ''),
    setweight(to_tsvector('english', coalesce(v_program.name, '')), 'A')
      || setweight(to_tsvector('english', coalesce(v_program.drug, '')), 'A')
      || setweight(to_tsvector('english', coalesce(v_indication_terms, '')), 'B')
      || setweight(to_tsvector('english',
           coalesce(v_program.directory_summary, v_program.patient_facing_description, '')), 'C'),
    now()
  )
  on conflict (source_table, source_id) do update
    set title = excluded.title,
        redacted_snippet = excluded.redacted_snippet,
        visibility_classification = excluded.visibility_classification,
        search_vector = excluded.search_vector,
        indexed_at = excluded.indexed_at;
end $$;

create or replace function app.directory_search_upsert_condition_by_id(p_condition_id uuid)
returns void
language plpgsql security definer set search_path = app, public as $$
declare
  v_condition record;
  v_program_terms text;
  v_owner_tenant uuid;
begin
  select id, name, summary, published
    into v_condition
    from conditions where id = p_condition_id;

  if not found or v_condition.published is not true then
    delete from search_index_documents
      where source_table = 'conditions' and source_id = p_condition_id;
    return;
  end if;

  -- Aggregate linked-program (drug) terms so a query for the drug name
  -- ("WST-057") still surfaces the condition pages that link to it.
  select string_agg(p.name || ' ' || coalesce(p.drug, ''), ' ')
    into v_program_terms
    from program_conditions pc
    join programs p on p.id = pc.program_id
    where pc.condition_id = v_condition.id
      and p.directory_published = true;

  -- conditions are catalog-level (not tenant-owned). owner_tenant_id is
  -- NOT NULL on search_index_documents, so we attribute condition rows to
  -- the first sponsor tenant that links to them, falling back to a
  -- well-known directory tenant. The owner_tenant filter doesn't matter
  -- for public reads — visibility_classification = 'public' is the gate.
  select p.sponsor_tenant_id
    into v_owner_tenant
    from program_conditions pc
    join programs p on p.id = pc.program_id
    where pc.condition_id = v_condition.id
    limit 1;

  if v_owner_tenant is null then
    select id into v_owner_tenant from tenants
      where kind = 'lewis_internal'
      order by created_at asc
      limit 1;
  end if;

  if v_owner_tenant is null then
    -- Don't fail the catalog write if no internal tenant is seeded yet;
    -- the index row simply doesn't get created. Re-running the helper
    -- after the tenant exists will populate it.
    return;
  end if;

  insert into search_index_documents (
    source_table, source_id, owner_tenant_id, visibility_classification,
    title, redacted_snippet, search_vector, indexed_at
  ) values (
    'conditions',
    v_condition.id,
    v_owner_tenant,
    'public',
    v_condition.name,
    coalesce(v_condition.summary, ''),
    setweight(to_tsvector('english', coalesce(v_condition.name, '')), 'A')
      || setweight(to_tsvector('english', coalesce(v_program_terms, '')), 'B')
      || setweight(to_tsvector('english', coalesce(v_condition.summary, '')), 'C'),
    now()
  )
  on conflict (source_table, source_id) do update
    set title = excluded.title,
        redacted_snippet = excluded.redacted_snippet,
        visibility_classification = excluded.visibility_classification,
        owner_tenant_id = excluded.owner_tenant_id,
        search_vector = excluded.search_vector,
        indexed_at = excluded.indexed_at;
end $$;

create or replace function app.directory_search_upsert_etc_by_id(p_etc_id uuid)
returns void
language plpgsql security definer set search_path = app, public as $$
declare
  v_etc record;
  v_etc_display_name text;
  v_linked_catalog_terms text;
begin
  select id, tenant_id, directory_city, directory_summary, directory_published
    into v_etc
    from etcs where id = p_etc_id;

  if not found or v_etc.directory_published is not true then
    delete from search_index_documents
      where source_table = 'etcs' and source_id = p_etc_id;
    return;
  end if;

  select t.display_name
    into v_etc_display_name
    from tenants t
    where t.id = v_etc.tenant_id;

  -- Pull in linked sponsor program + condition terms so an on-topic condition
  -- query ("neuropathy") can surface the ETC that offers the matching program.
  select string_agg(
           concat_ws(' ',
             p.name,
             p.drug,
             p.indication,
             p.directory_summary,
             linked_conditions.terms
           ),
           ' '
         )
    into v_linked_catalog_terms
    from tenant_relationships tr
    join programs p
      on p.sponsor_tenant_id = tr.from_tenant_id
     and p.directory_published = true
    left join lateral (
      select string_agg(c.name, ' ') as terms
      from program_conditions pc
      join conditions c on c.id = pc.condition_id
      where pc.program_id = p.id
        and c.published = true
    ) linked_conditions on true
    where tr.to_tenant_id = v_etc.tenant_id
      and tr.kind = 'ppa'
      and tr.status = 'active'
      and tr.starts_at <= now()
      and (tr.ends_at is null or tr.ends_at > now());

  insert into search_index_documents (
    source_table, source_id, owner_tenant_id, visibility_classification,
    title, redacted_snippet, search_vector, indexed_at
  ) values (
    'etcs',
    v_etc.id,
    v_etc.tenant_id,
    'public',
    coalesce(v_etc_display_name, 'Experimental Treatment Center'),
    coalesce(v_etc.directory_summary, ''),
    setweight(to_tsvector('english', coalesce(v_etc_display_name, '')), 'A')
      || setweight(to_tsvector('english', coalesce(v_etc.directory_city, '')), 'B')
      || setweight(to_tsvector('english', coalesce(v_linked_catalog_terms, '')), 'B')
      || setweight(to_tsvector('english', coalesce(v_etc.directory_summary, '')), 'C'),
    now()
  )
  on conflict (source_table, source_id) do update
    set title = excluded.title,
        redacted_snippet = excluded.redacted_snippet,
        visibility_classification = excluded.visibility_classification,
        search_vector = excluded.search_vector,
        indexed_at = excluded.indexed_at;
end $$;

-- ---------------------------------------------------------------------------
-- 5b. Cascade helpers.
-- ---------------------------------------------------------------------------

-- When a sponsor's program changes (publish/unpublish/update), every ETC
-- that has an active PPA with that sponsor needs its search-index row
-- refreshed because the linked-catalog-terms aggregation in
-- directory_search_upsert_etc_by_id pulls from the sponsor's programs.
-- Direct call to the upsert helper — no `UPDATE etcs SET col=col` no-op.
create or replace function app.directory_search_touch_related_etcs(p_sponsor_tenant_id uuid)
returns void
language plpgsql security definer set search_path = app, public as $$
declare
  v_etc_id uuid;
begin
  for v_etc_id in
    select e.id
    from etcs e
    join tenant_relationships tr
      on tr.from_tenant_id = p_sponsor_tenant_id
     and tr.to_tenant_id = e.tenant_id
     and tr.kind = 'ppa'
     and tr.status = 'active'
     and tr.starts_at <= now()
     and (tr.ends_at is null or tr.ends_at > now())
    where e.directory_published = true
  loop
    perform app.directory_search_upsert_etc_by_id(v_etc_id);
  end loop;
end $$;

-- When a program's directory_published / drug / name changes, every linked
-- condition's tsvector needs a refresh because the condition's
-- aggregate-program-terms (weight B) goes stale otherwise. Without this,
-- a search for "WST-057" after unpublishing the program would still return
-- ranked condition rows whose tsvector contains "WST-057".
create or replace function app.directory_search_touch_program_conditions(p_program_id uuid)
returns void
language plpgsql security definer set search_path = app, public as $$
declare
  v_condition_id uuid;
begin
  for v_condition_id in
    select condition_id from program_conditions where program_id = p_program_id
  loop
    perform app.directory_search_upsert_condition_by_id(v_condition_id);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5c. Trigger functions — thin wrappers around the by-id helpers.
-- ---------------------------------------------------------------------------

create or replace function app.tg_directory_search_upsert_program() returns trigger
language plpgsql security definer set search_path = app, public as $$
declare
  v_publish_changed boolean;
  v_terms_changed boolean;
begin
  if (tg_op = 'DELETE') then
    delete from search_index_documents
      where source_table = 'programs' and source_id = old.id;
    perform app.directory_search_touch_related_etcs(old.sponsor_tenant_id);
    perform app.directory_search_touch_program_conditions(old.id);
    return old;
  end if;

  perform app.directory_search_upsert_program_by_id(NEW.id);
  perform app.directory_search_touch_related_etcs(NEW.sponsor_tenant_id);

  -- Cascade to linked conditions when the program's directory_published flag,
  -- name, or drug changes — these are the fields aggregated into condition
  -- tsvectors at weight B. Skip the cascade on no-op UPDATEs to avoid
  -- needless work when an unrelated column changes.
  if tg_op = 'INSERT' then
    v_publish_changed := NEW.directory_published is true;
    v_terms_changed := true;
  else
    v_publish_changed := NEW.directory_published is distinct from OLD.directory_published;
    v_terms_changed := NEW.name is distinct from OLD.name
                       or NEW.drug is distinct from OLD.drug;
  end if;
  if v_publish_changed or v_terms_changed then
    perform app.directory_search_touch_program_conditions(NEW.id);
  end if;

  return NEW;
end $$;

create or replace function app.tg_directory_search_upsert_condition() returns trigger
language plpgsql security definer set search_path = app, public as $$
begin
  if (tg_op = 'DELETE') then
    delete from search_index_documents
      where source_table = 'conditions' and source_id = old.id;
    return old;
  end if;
  perform app.directory_search_upsert_condition_by_id(NEW.id);
  return NEW;
end $$;

create or replace function app.tg_directory_search_upsert_etc() returns trigger
language plpgsql security definer set search_path = app, public as $$
begin
  if (tg_op = 'DELETE') then
    delete from search_index_documents
      where source_table = 'etcs' and source_id = old.id;
    return old;
  end if;
  perform app.directory_search_upsert_etc_by_id(NEW.id);
  return NEW;
end $$;

-- The join-table trigger calls the by-id helpers directly so changes to
-- program_conditions don't require firing a no-op UPDATE on programs/conditions
-- (which would fire every other AFTER trigger on those tables — audit_log,
-- retention, anything that lands in a future migration).
create or replace function app.tg_directory_search_reindex_join() returns trigger
language plpgsql security definer set search_path = app, public as $$
declare
  v_program_id uuid;
  v_condition_id uuid;
  v_sponsor_tenant_id uuid;
begin
  if tg_op = 'DELETE' then
    v_program_id := old.program_id;
    v_condition_id := old.condition_id;
  else
    v_program_id := NEW.program_id;
    v_condition_id := NEW.condition_id;
  end if;

  perform app.directory_search_upsert_program_by_id(v_program_id);
  perform app.directory_search_upsert_condition_by_id(v_condition_id);

  -- An ETC's catalog-terms aggregation reads through the program's PPA.
  -- A join change can flip whether a program is "in scope" for an ETC
  -- search row, so refresh related ETCs too.
  select sponsor_tenant_id into v_sponsor_tenant_id
    from programs where id = v_program_id;
  if v_sponsor_tenant_id is not null then
    perform app.directory_search_touch_related_etcs(v_sponsor_tenant_id);
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return NEW;
end $$;

create trigger programs_directory_search_index
  after insert or update or delete on programs
  for each row execute function app.tg_directory_search_upsert_program();

create trigger conditions_directory_search_index
  after insert or update or delete on conditions
  for each row execute function app.tg_directory_search_upsert_condition();

create trigger etcs_directory_search_index
  after insert or update or delete on etcs
  for each row execute function app.tg_directory_search_upsert_etc();

create trigger program_conditions_directory_search_reindex
  after insert or update or delete on program_conditions
  for each row execute function app.tg_directory_search_reindex_join();

-- ---------------------------------------------------------------------------
-- 6. Grants — belt-and-suspenders with 0011's default privileges.
-- ---------------------------------------------------------------------------

grant select on conditions to app_api, app_worker;
grant select on program_conditions to app_api, app_worker;

-- ---------------------------------------------------------------------------
-- 7. Seed data — Phase 1 catalog per directoryprd.md § 2.4 + § 27.3.
--
-- This is the source of truth for the directory at MVP-0. Fixed UUIDs
-- under 'a0...' / 'b0...' / 'c0...' / 'd0...' prefixes so the seed is
-- idempotent across db:reset and re-runs (on conflict do nothing).
--
-- A future sponsor-publishing flow in app.lewis.health will mutate these
-- rows in place (toggling directory_published, updating summaries) and
-- the triggers above will keep search_index_documents in sync.
-- ---------------------------------------------------------------------------

-- Jurisdiction (Montana). regulatory_jurisdictions is created in 0002.
-- Use a fixed slug to find or insert the row.
do $$
declare
  v_jurisdiction_id uuid;
  v_winsantor_tenant uuid := 'a0000000-0000-0000-0000-000000000001';
  v_bigsky_tenant    uuid := 'a0000000-0000-0000-0000-000000000002';
  v_lewis_tenant     uuid := 'a0000000-0000-0000-0000-000000000003';
  v_program_wst057   uuid := 'b0000000-0000-0000-0000-000000000001';
  v_etc_bigsky       uuid := 'c0000000-0000-0000-0000-000000000001';
  v_cond_dpn         uuid := 'd0000000-0000-0000-0000-000000000001';
  v_cond_cipn        uuid := 'd0000000-0000-0000-0000-000000000002';
  v_cond_hipn        uuid := 'd0000000-0000-0000-0000-000000000003';
  v_cond_idiopathic  uuid := 'd0000000-0000-0000-0000-000000000004';
  v_cond_ptsd        uuid := 'd0000000-0000-0000-0000-000000000005';
  v_cond_als         uuid := 'd0000000-0000-0000-0000-000000000006';
  v_cond_ms          uuid := 'd0000000-0000-0000-0000-000000000007';
  v_cond_rare_can    uuid := 'd0000000-0000-0000-0000-000000000008';
  v_cond_autoimmune  uuid := 'd0000000-0000-0000-0000-000000000009';
begin
  -- 7a. Resolve the Montana jurisdiction. Seeded by 0002 with code = 'US-MT'.
  select id into v_jurisdiction_id from regulatory_jurisdictions
    where code = 'US-MT' limit 1;
  if v_jurisdiction_id is null then
    insert into regulatory_jurisdictions (code, display_name, timezone, effective_at)
    values ('US-MT', 'Montana', 'America/Denver', '2025-01-01T00:00:00Z')
    returning id into v_jurisdiction_id;
  end if;

  -- 7b. Tenants — WinSanTor (sponsor), Big Sky (ETC), Lewis internal.
  insert into tenants (id, kind, status, display_name)
  values
    (v_winsantor_tenant, 'sponsor', 'active', 'WinSanTor, Inc.'),
    (v_bigsky_tenant,    'etc',     'active', 'Big Sky Experimental Treatment Center'),
    (v_lewis_tenant,     'lewis_internal', 'active', 'Lewis Health')
  on conflict (id) do nothing;

  -- 7c. Sponsor org row for WinSanTor.
  insert into sponsor_organizations (tenant_id, legal_name, billing_profile_json, regulatory_contacts_json)
  values (v_winsantor_tenant, 'WinSanTor, Inc.', '{}'::jsonb, '[]'::jsonb)
  on conflict (tenant_id) do nothing;

  -- PPA relationship — WinSanTor sponsor -> Big Sky ETC. This is the
  -- production direction from 0013 and the join used by ETC search indexing.
  insert into tenant_relationships (from_tenant_id, to_tenant_id, kind, scope_json, status)
  select v_winsantor_tenant, v_bigsky_tenant, 'ppa', '{}'::jsonb, 'active'
  where not exists (
    select 1
    from tenant_relationships tr
    where tr.from_tenant_id = v_winsantor_tenant
      and tr.to_tenant_id = v_bigsky_tenant
      and tr.kind = 'ppa'
      and tr.status = 'active'
  );

  -- 7d. ETC row for Big Sky.
  insert into etcs (
    id, tenant_id, jurisdiction_id, license_number,
    designation, primary_address_json, status,
    directory_slug, directory_city, directory_summary, directory_published
  )
  values (
    v_etc_bigsky,
    v_bigsky_tenant,
    v_jurisdiction_id,
    'ETC-2025-001',
    'outpatient',
    jsonb_build_object(
      'street', '1240 N Rouse Avenue, Suite 200',
      'city', 'Bozeman',
      'state', 'MT',
      'postal_code', '59715'
    ),
    'active',
    'big-sky',
    'Bozeman, MT',
    'Outpatient specialty clinic licensed under Montana SB 535. Neurology, pain medicine, and rare-disease consultation.',
    true
  )
  on conflict (id) do update
    set directory_slug = excluded.directory_slug,
        directory_city = excluded.directory_city,
        directory_summary = excluded.directory_summary,
        directory_published = excluded.directory_published;

  -- 7e. WST-057 program.
  insert into programs (
    id, sponsor_tenant_id, jurisdiction_id, name, drug, indication, phase,
    treatment_form, pricing_model, hfar_path, patient_facing_description, status,
    directory_slug, directory_summary, directory_published
  )
  values (
    v_program_wst057,
    v_winsantor_tenant,
    v_jurisdiction_id,
    'WST-057',
    'WST-057',
    'peripheral neuropathy',
    'phase_2',
    'topical',
    'cash_pay',
    'path_b',
    'WST-057 is an investigational topical small-molecule for peripheral neuropathy, currently in Phase 2 trials.',
    'published',
    'wst-057',
    'Investigational topical small-molecule from WinSanTor for peripheral neuropathy. Currently offered at Big Sky ETC, Bozeman.',
    true
  )
  on conflict (id) do update
    set directory_slug = excluded.directory_slug,
        directory_summary = excluded.directory_summary,
        directory_published = excluded.directory_published,
        name = excluded.name,
        drug = excluded.drug;

  -- 7f. Conditions — four PN indications (live), PTSD (coming_soon),
  -- four long-tail not_offered stubs. Per directoryprd.md § 27.3.
  insert into conditions (id, jurisdiction_id, slug, name, icd10_codes, summary, state, published)
  values
    (v_cond_dpn, v_jurisdiction_id,
      'diabetic-peripheral-neuropathy',
      'Diabetic peripheral neuropathy',
      array['E11.40', 'E11.42'],
      'Nerve damage caused by chronic high blood sugar in people with diabetes. Most often presents as numbness, burning, or tingling in the feet and hands.',
      'live', true),
    (v_cond_cipn, v_jurisdiction_id,
      'chemotherapy-induced-peripheral-neuropathy',
      'Chemotherapy-induced peripheral neuropathy',
      array['G62.0'],
      'Peripheral nerve damage from chemotherapy. Often persists after treatment ends and can limit quality of life and dosing.',
      'live', true),
    (v_cond_hipn, v_jurisdiction_id,
      'hiv-induced-peripheral-neuropathy',
      'HIV-induced peripheral neuropathy',
      array['G62.81'],
      'Peripheral nerve damage occurring in people living with HIV, sometimes related to the virus itself and sometimes to antiretroviral therapy.',
      'live', true),
    (v_cond_idiopathic, v_jurisdiction_id,
      'idiopathic-peripheral-neuropathy',
      'Idiopathic peripheral neuropathy',
      array['G60.9'],
      'Peripheral neuropathy without an identified underlying cause after standard workup.',
      'live', true),
    (v_cond_ptsd, v_jurisdiction_id,
      'ptsd',
      'Post-traumatic stress disorder (PTSD)',
      array['F43.10'],
      'A psychiatric condition that may develop after exposure to a traumatic event. Standard-of-care includes trauma-focused psychotherapy and select pharmacotherapy.',
      'coming_soon', true),
    (v_cond_als, v_jurisdiction_id,
      'als',
      'Amyotrophic Lateral Sclerosis (ALS)',
      array['G12.21'],
      'A progressive neurodegenerative disease affecting motor neurons. No Montana ETC currently offers a program for ALS.',
      'not_offered', true),
    (v_cond_ms, v_jurisdiction_id,
      'multiple-sclerosis',
      'Multiple sclerosis',
      array['G35'],
      'A chronic autoimmune condition affecting the central nervous system. No Montana ETC currently offers a program for multiple sclerosis.',
      'not_offered', true),
    (v_cond_rare_can, v_jurisdiction_id,
      'rare-cancers',
      'Rare cancers',
      array[]::text[],
      'Umbrella term for cancers with low overall incidence. No Montana ETC currently offers an investigational program in this category.',
      'not_offered', true),
    (v_cond_autoimmune, v_jurisdiction_id,
      'autoimmune-diseases',
      'Autoimmune diseases',
      array[]::text[],
      'Umbrella term for conditions in which the immune system attacks the body''s own tissues. No Montana ETC currently offers an investigational program in this category.',
      'not_offered', true)
  on conflict (id) do update
    set name = excluded.name,
        slug = excluded.slug,
        summary = excluded.summary,
        state = excluded.state,
        published = excluded.published,
        icd10_codes = excluded.icd10_codes;

  -- 7g. Link WST-057 to the four live PN indications.
  insert into program_conditions (program_id, condition_id) values
    (v_program_wst057, v_cond_dpn),
    (v_program_wst057, v_cond_cipn),
    (v_program_wst057, v_cond_hipn),
    (v_program_wst057, v_cond_idiopathic)
  on conflict (program_id, condition_id) do nothing;

  -- 7h. Force a re-fire of the program trigger so the linked-condition
  -- aggregation includes the four PN names. (The triggers fired on each
  -- INSERT above; the join-table trigger fired too, but we want a final
  -- pass that sees all four conditions in the same query plan.)
  update programs set directory_published = true where id = v_program_wst057;
end $$;
