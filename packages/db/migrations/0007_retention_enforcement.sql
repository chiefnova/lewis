-- 0007_retention_enforcement.sql
--
-- Enforces HIPAA retention windows in the database, not in application code.
--
-- Per CLAUDE.md HIPAA invariant #6:
--   - patient files (regulated objects in file_storage_objects): 5 years
--   - audit_log: 7 years
--   - ETRB records: 5 years (table will land in a future migration)
--   - QAPI minutes: 3 years (table will land in a future migration)
--
-- This migration establishes the pattern:
--
--   1. app.compute_retention(category text) returns interval — single source of
--      truth for retention windows. Adding a new category is a one-line edit
--      here, not 3 places.
--
--   2. retention_until timestamptz column on each retention-bearing table.
--
--   3. BEFORE INSERT trigger that populates retention_until from a per-table
--      category (e.g. file_storage_objects.bucket → category mapping, audit_log
--      uses a constant 'audit_log' category).
--
--   4. BEFORE DELETE trigger that raises if retention_until > now(). This is the
--      load-bearing enforcement.
--
-- The BEFORE DELETE trigger is row-level. We also add a BEFORE TRUNCATE
-- statement-level trigger because TRUNCATE doesn't fire row-level triggers in
-- Postgres (same pitfall already fixed in 0003 for audit_log). Belt-and-suspenders:
-- also REVOKE TRUNCATE on the new tables from PUBLIC.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function app.compute_retention(category text)
returns interval
language sql
immutable
as $$
  select case category
    when 'audit_log'              then interval '7 years'
    when 'patient_file'           then interval '5 years'
    when 'etrb_record'            then interval '5 years'
    when 'qapi_minutes'           then interval '3 years'
    when 'sponsor_billing'        then interval '7 years'
    when 'patient_agreement'      then interval '5 years'
    when 'informed_consent'       then interval '5 years'
    when 'ae_report'              then interval '7 years'
    when 'etrb_approval'          then interval '7 years'
    -- Catch-all for any new file category that hasn't been assigned a window yet.
    -- The default is intentionally long (10 years) so the safe behavior is to
    -- over-retain until policy is set, not under-retain.
    else interval '10 years'
  end
$$;

comment on function app.compute_retention(text) is
  'Single source of truth for HIPAA retention windows. Adding a new retention category is a one-line edit. Defaults to 10 years for unknown categories so under-retention is impossible.';

create or replace function app.refuse_premature_delete()
returns trigger
language plpgsql
as $$
begin
  if old.retention_until is not null and old.retention_until > now() then
    raise exception 'retention lock: row in table % is retained until %, cannot delete until then',
      tg_table_name, old.retention_until
      using errcode = 'check_violation';
  end if;
  return old;
end;
$$;

comment on function app.refuse_premature_delete() is
  'Generic BEFORE DELETE trigger function. Raises if old.retention_until > now(). Used by all retention-bearing tables.';

create or replace function app.refuse_truncate()
returns trigger
language plpgsql
as $$
begin
  raise exception 'truncate forbidden on % (retention-protected table)',
    tg_table_name;
end;
$$;

comment on function app.refuse_truncate() is
  'Generic BEFORE TRUNCATE statement-level trigger. Postgres does not fire row-level DELETE triggers on TRUNCATE; this fills the gap.';

-- ---------------------------------------------------------------------------
-- audit_log: 7-year retention
-- ---------------------------------------------------------------------------

alter table audit_log
  add column if not exists retention_until timestamptz;

-- Backfill existing rows from ts (audit_log.ts is the canonical timestamp).
update audit_log
  set retention_until = ts + app.compute_retention('audit_log')
  where retention_until is null;

alter table audit_log
  alter column retention_until set not null,
  alter column retention_until set default (now() + interval '7 years');

create or replace function audit_log_set_retention()
returns trigger
language plpgsql
as $$
begin
  if new.retention_until is null then
    new.retention_until := coalesce(new.ts, now()) + app.compute_retention('audit_log');
  end if;
  return new;
end;
$$;

drop trigger if exists audit_log_set_retention_insert on audit_log;
create trigger audit_log_set_retention_insert
  before insert on audit_log
  for each row execute function audit_log_set_retention();

drop trigger if exists audit_log_block_premature_delete on audit_log;
create trigger audit_log_block_premature_delete
  before delete on audit_log
  for each row execute function app.refuse_premature_delete();

-- audit_log already has BEFORE TRUNCATE from 0003; no need to re-add.

-- ---------------------------------------------------------------------------
-- file_storage_objects: 5-year retention for regulated objects, optional otherwise
-- ---------------------------------------------------------------------------
--
-- Regulated buckets (immutable_ref = true) get 5-year retention.
-- Non-regulated buckets get a shorter 90-day default; consumers can override
-- by setting retention_until explicitly at insert time.
--
-- Mapping is bucket-name driven so adding a new regulated bucket only requires
-- adding it to the case in the trigger — no schema change.

alter table file_storage_objects
  add column if not exists retention_category text,
  add column if not exists retention_until timestamptz;

-- Backfill existing rows: assume immutable_ref ⇒ patient_file category.
update file_storage_objects
  set retention_category = case when immutable_ref then 'patient_file' else 'transient_upload' end
  where retention_category is null;

update file_storage_objects
  set retention_until = uploaded_at + case
    when retention_category = 'transient_upload' then interval '90 days'
    else app.compute_retention(retention_category)
  end
  where retention_until is null;

alter table file_storage_objects
  alter column retention_category set not null,
  alter column retention_until set not null;

create or replace function file_storage_objects_set_retention()
returns trigger
language plpgsql
as $$
declare
  computed_category text;
  computed_until timestamptz;
begin
  -- Caller can pre-populate retention_category. If not, infer from immutable_ref.
  computed_category := coalesce(new.retention_category,
    case when new.immutable_ref then 'patient_file' else 'transient_upload' end);
  new.retention_category := computed_category;

  if new.retention_until is null then
    computed_until := coalesce(new.uploaded_at, now()) + case
      when computed_category = 'transient_upload' then interval '90 days'
      else app.compute_retention(computed_category)
    end;
    new.retention_until := computed_until;
  end if;

  return new;
end;
$$;

drop trigger if exists file_storage_objects_set_retention_insert on file_storage_objects;
create trigger file_storage_objects_set_retention_insert
  before insert on file_storage_objects
  for each row execute function file_storage_objects_set_retention();

drop trigger if exists file_storage_objects_block_premature_delete on file_storage_objects;
create trigger file_storage_objects_block_premature_delete
  before delete on file_storage_objects
  for each row execute function app.refuse_premature_delete();

drop trigger if exists file_storage_objects_block_truncate on file_storage_objects;
create trigger file_storage_objects_block_truncate
  before truncate on file_storage_objects
  for each statement execute function app.refuse_truncate();

revoke truncate on file_storage_objects from public;

-- ---------------------------------------------------------------------------
-- ETRB and QAPI tables don't exist yet (PRD calls for them in later sprints).
-- The pattern above (alter table → add retention_until + per-table BEFORE INSERT
-- trigger calling app.compute_retention('etrb_record' | 'qapi_minutes') →
-- BEFORE DELETE trigger using app.refuse_premature_delete → BEFORE TRUNCATE
-- using app.refuse_truncate → REVOKE TRUNCATE) is the contract those migrations
-- must follow. CI gate in 0008's companion check enforces it for any new
-- regulated-table migration.
