-- ---------------------------------------------------------------------------
-- 0020_etcs_extended_and_marketing.sql
--
-- Slice 4 (Sprint 4) — directoryprd.md § 10, § 11, § 16, § 32.1.
--
-- Two thrusts:
--
-- A. ETC profile expansion. Adds the columns the rewritten /etcs/:slug page
--    (§ 16.2) and Mapbox-driven /etcs index (§ 16.1) require:
--      - medical_director_name + credentials + clinical_email + clinical_phone
--        — per § 16.2 "For physicians: clinical inquiries" contact line.
--      - directory_address_lines (text[]) — multi-line address used in
--        profile + map popup; mirrors the primary_address_json seeded by
--        0018 in a render-friendly shape.
--      - directory_phone, directory_hours
--      - directory_lat / directory_lng — Mapbox pin coordinates.
--      - accepting_new_patients (boolean default true).
--    All columns inherit the existing etcs_directory_public_read policy
--    from migration 0018 — no new RLS surface for the columns themselves.
--
-- B. marketing_subscriptions table — anonymous email signup with
--    double-opt-in. Per directoryprd.md § 11.2 + § 11.9 + § 7.5
--    ("AnnouncementStrip / BeginningSection / /browse bottom CTAs wired or
--    removed"). User-locked decision: WIRE all three. Resend-backed
--    confirmation flow lands via the worker queue handler in
--    apps/workers/src/handlers/marketing-confirmation.ts.
--
--    RLS posture for marketing_subscriptions (per .claude/rules/database.md
--    + slice 3 SECURITY DEFINER pattern):
--      - directory_anonymous gets NO direct INSERT or SELECT policy.
--      - All anonymous writes go through SECURITY DEFINER functions.
--      - lewis_admin gets SELECT for the future admin console (P1 per
--        § 32.2). The runtime role itself is NOBYPASSRLS per 0011.
--    Anonymous users literally cannot read the table — there is no SELECT
--    path for them, so even malformed SQL cannot leak subscriber emails.
--
--    Email is stored lowercased + trimmed. The unique constraint on
--    email_lower enforces idempotency: re-subscribing returns the existing
--    confirmation token instead of creating a duplicate row, and the API
--    handler avoids enqueuing a second confirmation email.
--
--    NOT a regulated/PHI table per .claude/rules/database.md — emails are
--    PII, not health information. No jurisdiction_id (Lewis-wide, not
--    Montana-specific). Retention policy lives in counsel/marketing
--    documentation, not here.
--
-- C. SECURITY DEFINER helpers (5 functions, mirrors slice 3's
--    app.directory_program_etc_count pattern):
--      - app.directory_marketing_subscribe(email, source, ip, ua)
--          → table (confirmation_token uuid, was_new boolean)
--          Validates email regex + source enum, inserts on conflict do
--          nothing, returns existing token + was_new=false on duplicate.
--      - app.directory_marketing_confirm(token) → boolean
--          Flips status pending → confirmed. Returns true if a row was
--          updated, false on unknown / already-confirmed / unsubscribed
--          (so the API can return { confirmed: false } without leaking
--          whether a token existed).
--      - app.directory_marketing_unsubscribe(token) → boolean
--          Flips status to unsubscribed. Returns true on first
--          unsubscribe, false on unknown / already-unsubscribed.
--      - app.directory_marketing_mark_sent(token) → boolean
--          Workers-only. Stamps confirmation_sent_at after Resend send
--          succeeds. Idempotent (won't re-stamp if already set).
--      - app.directory_etc_program_offerings(etc_id) → setof program rows
--          Used by /v1/public/etcs/:slug to surface offered programs
--          without exposing tenant_relationships to directory_anonymous
--          reads. Same pattern as 0019's directory_program_etc_count, but
--          going the ETC → programs direction and returning column rows.
--
-- D. Big Sky ETC backfill — populates the new columns on the row seeded
--    by migration 0018 (directory_slug='big-sky'). Address mirrors the
--    primary_address_json from 0018 (1240 N Rouse Avenue, Suite 200,
--    Bozeman, MT 59715). Lat/lng is the geocoded location; medical
--    director contact is placeholder pending counsel + Big Sky operator
--    confirmation (called out in PR description per slice 4 plan
--    "Architecture decision § 15" + "Risks").
--
-- RLS test coverage (per .claude/rules/database.md "every PHI-bearing
-- table needs an RLS test" — marketing_subscriptions is not PHI but
-- shipping tests anyway because the SECURITY DEFINER write path is novel):
--   packages/db/test/rls/0020_etcs_directory_extended.sql
--   packages/db/test/rls/0020_marketing_subscriptions_anonymous_insert.sql
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. ETC profile column additions
-- ---------------------------------------------------------------------------

alter table etcs
  add column medical_director_name text,
  add column medical_director_credentials text,
  add column medical_director_clinical_email text,
  add column medical_director_clinical_phone text,
  add column directory_address_lines text[],
  add column directory_phone text,
  add column directory_hours text,
  add column directory_lat double precision,
  add column directory_lng double precision,
  add column accepting_new_patients boolean not null default true;

-- Geographic coordinate sanity. Either both lat/lng are set, or neither is —
-- Mapbox can't render a pin from half a coordinate, and the API surface
-- reflects this (a half-populated row would force the frontend to no-op the
-- pin anyway). Range checks are belt-and-suspenders against typo-class bugs.
alter table etcs
  add constraint etcs_directory_lat_range
    check (directory_lat is null or (directory_lat between -90 and 90));

alter table etcs
  add constraint etcs_directory_lng_range
    check (directory_lng is null or (directory_lng between -180 and 180));

alter table etcs
  add constraint etcs_directory_geo_coherent
    check (
      (directory_lat is null and directory_lng is null)
      or (directory_lat is not null and directory_lng is not null)
    );

-- ---------------------------------------------------------------------------
-- 2. marketing_subscriptions table
-- ---------------------------------------------------------------------------

create table marketing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email_lower text not null,
  source text not null
    check (source in ('announcement_strip', 'homepage_beginning', 'browse_bottom')),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'unsubscribed', 'spam')),
  confirmation_token uuid not null default gen_random_uuid() unique,
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  confirmation_sent_at timestamptz,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  unique (email_lower)
);

alter table marketing_subscriptions enable row level security;
alter table marketing_subscriptions force row level security;

-- No INSERT/SELECT/UPDATE/DELETE policies for directory_anonymous. The role
-- has no path to this table outside the SECURITY DEFINER helpers below.
-- Future admin console reads under app.role='lewis_admin'.
create policy marketing_subscriptions_admin_select on marketing_subscriptions
  for select using (
    coalesce(current_setting('app.role', true), '') = 'lewis_admin'
  );

-- Admin write policy. The actual subscribe/confirm/unsubscribe paths go
-- through the SECURITY DEFINER helpers below (anonymous never reaches direct
-- INSERT/UPDATE/DELETE), but db:rls:coverage requires every RLS-enabled table
-- to declare at least one write policy. Scoping to lewis_admin keeps the
-- table closed to every other role while satisfying the static check and
-- giving the future admin console an explicit edit path (e.g. spam tagging).
create policy marketing_subscriptions_admin_write on marketing_subscriptions
  for all using (
    coalesce(current_setting('app.role', true), '') = 'lewis_admin'
  ) with check (
    coalesce(current_setting('app.role', true), '') = 'lewis_admin'
  );

-- Index for admin console queries by status.
create index marketing_subscriptions_status_idx
  on marketing_subscriptions (status, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. SECURITY DEFINER helpers
--
-- The HTTP anonymous directory path runs as app_api (NOBYPASSRLS per 0011)
-- with app.role='directory_anonymous' transaction-local context. These
-- helpers run with schema-owner privilege so they can write to
-- marketing_subscriptions even though directory_anonymous has no policy
-- granting INSERT/UPDATE.
--
-- All grants are explicit per role; PUBLIC is revoked so an accidental
-- pg_class permission error doesn't surface a fallback to the pg_catalog
-- default.
-- ---------------------------------------------------------------------------

-- 3a. Subscribe — validates input, inserts on conflict do nothing, returns
-- (confirmation_token, unsubscribe_token, was_new). Caller (api/public-marketing)
-- only enqueues a confirmation email when was_new=true; this avoids re-spamming
-- an existing subscriber if they retry the form.
--
-- Both tokens are returned together because directory_anonymous has no
-- direct SELECT policy on marketing_subscriptions — the API can't pull the
-- unsubscribe_token in a follow-up query, so this helper must surface both
-- in a single SECURITY DEFINER round-trip. The unsubscribe_token only ever
-- crosses a public boundary inside the confirmation email body (which Resend
-- sends from the worker, never from the API request path).
create or replace function app.directory_marketing_subscribe(
  p_email text,
  p_source text,
  p_ip inet,
  p_ua text
) returns table (confirmation_token uuid, unsubscribe_token uuid, was_new boolean)
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_email_lower text := lower(trim(coalesce(p_email, '')));
  v_confirmation uuid;
  v_unsubscribe uuid;
  v_was_new boolean := false;
begin
  -- Standard-conforming strings (PG default) keep `\.` as two literal chars,
  -- which POSIX regex interprets as a literal dot. Single-quoted form avoids
  -- the nested dollar-quote tag ambiguity inside this dollar-quoted body.
  if v_email_lower !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'invalid_email' using errcode = 'P0001';
  end if;

  if p_source not in ('announcement_strip', 'homepage_beginning', 'browse_bottom') then
    raise exception 'invalid_source' using errcode = 'P0001';
  end if;

  insert into marketing_subscriptions (email_lower, source, ip_address, user_agent)
  values (v_email_lower, p_source, p_ip, p_ua)
  on conflict (email_lower) do nothing
  returning marketing_subscriptions.confirmation_token,
            marketing_subscriptions.unsubscribe_token
    into v_confirmation, v_unsubscribe;

  if v_confirmation is null then
    -- Duplicate email — return the existing tokens so the caller's
    -- "check your email" UX still resolves to the same confirmation link
    -- the subscriber already received (or will receive on retry).
    select ms.confirmation_token, ms.unsubscribe_token
      into v_confirmation, v_unsubscribe
    from marketing_subscriptions ms
    where ms.email_lower = v_email_lower;
  else
    v_was_new := true;
  end if;

  return query select v_confirmation, v_unsubscribe, v_was_new;
end;
$$;

revoke all on function app.directory_marketing_subscribe(text, text, inet, text) from public;
grant execute on function app.directory_marketing_subscribe(text, text, inet, text) to app_api;

-- 3b. Confirm — flips status pending → confirmed. Idempotent: returns false
-- on unknown / already-confirmed / unsubscribed tokens so the API can render
-- a generic success-or-fallback page without leaking token validity.
create or replace function app.directory_marketing_confirm(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_status text;
begin
  update marketing_subscriptions
  set status = 'confirmed',
      confirmed_at = now()
  where confirmation_token = p_token
    and status = 'pending'
  returning status into v_status;

  return v_status is not null;
end;
$$;

revoke all on function app.directory_marketing_confirm(uuid) from public;
grant execute on function app.directory_marketing_confirm(uuid) to app_api;

-- 3c. Unsubscribe — flips to unsubscribed. Honors both pending and confirmed
-- starting states; returns false if already unsubscribed or unknown.
create or replace function app.directory_marketing_unsubscribe(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_status text;
begin
  update marketing_subscriptions
  set status = 'unsubscribed',
      unsubscribed_at = now()
  where unsubscribe_token = p_token
    and status in ('pending', 'confirmed')
  returning status into v_status;

  return v_status is not null;
end;
$$;

revoke all on function app.directory_marketing_unsubscribe(uuid) from public;
grant execute on function app.directory_marketing_unsubscribe(uuid) to app_api;

-- 3d. Mark-sent — workers-only. Called from
-- apps/workers/src/handlers/marketing-confirmation.ts after Resend reports
-- a successful send. Idempotent — a retry won't re-stamp an already-sent
-- subscription (the timestamp is the audit truth, not the count).
create or replace function app.directory_marketing_mark_sent(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_id uuid;
begin
  update marketing_subscriptions
  set confirmation_sent_at = now()
  where confirmation_token = p_token
    and confirmation_sent_at is null
  returning id into v_id;

  return v_id is not null;
end;
$$;

-- Workers-only. The default privileges from migration 0011 line 64 auto-grant
-- EXECUTE on every app-schema function to BOTH app_api and app_worker; we
-- explicitly revoke app_api here so the API runtime cannot stamp "sent" — only
-- the worker that actually called Resend should ever flip confirmation_sent_at.
revoke all on function app.directory_marketing_mark_sent(uuid) from public, app_api;
grant execute on function app.directory_marketing_mark_sent(uuid) to app_worker;

-- 3e. Program ↔ ETC slug-set membership. Used by the faceted /v1/public/programs
-- list endpoint (slice 4 § 33.1 "/browse filter rail wired"). Returns true
-- when the given program is offered (via active PPA) at any ETC whose
-- directory_slug is in the supplied set. Implemented as SECURITY DEFINER
-- because the underlying join traverses tenant_relationships, which is not
-- in the directory_anonymous read-policy set.
create or replace function app.directory_program_offered_at_etcs(
  p_program_id uuid,
  p_etc_slugs text[]
) returns boolean
language sql
security definer
stable
set search_path = app, public
as $$
  select exists (
    select 1
    from programs p
    join tenant_relationships tr on tr.from_tenant_id = p.manufacturer_tenant_id
    join etcs e on e.tenant_id = tr.to_tenant_id
    where p.id = p_program_id
      and p.directory_published = true
      and tr.kind = 'ppa'
      and tr.status = 'active'
      and tr.starts_at <= now()
      and (tr.ends_at is null or tr.ends_at > now())
      and e.directory_published = true
      and e.directory_slug = any(p_etc_slugs)
  );
$$;

revoke all on function app.directory_program_offered_at_etcs(uuid, text[]) from public;
grant execute on function app.directory_program_offered_at_etcs(uuid, text[]) to app_api, app_worker;

-- 3f. ETC → offered programs. Mirror of 0019's directory_program_etc_count
-- in the opposite direction. Joins tenant_relationships (which is NOT in
-- the directory_anonymous read policy set) so we can't expose it via a
-- direct query — must go through SECURITY DEFINER. Returns rows the public
-- API needs and nothing more.
create or replace function app.directory_etc_program_offerings(p_etc_id uuid)
returns table (
  slug text,
  name text,
  drug text,
  indication text,
  treatment_form text,
  phase text
)
language sql
security definer
stable
set search_path = app, public
as $$
  select p.directory_slug,
         p.name,
         p.drug,
         p.indication,
         p.treatment_form,
         p.phase
  from programs p
  join tenant_relationships tr on tr.from_tenant_id = p.manufacturer_tenant_id
  join etcs e on e.tenant_id = tr.to_tenant_id
  where e.id = p_etc_id
    and e.directory_published = true
    and p.directory_published = true
    and p.directory_slug is not null
    and tr.kind = 'ppa'
    and tr.status = 'active'
    and tr.starts_at <= now()
    and (tr.ends_at is null or tr.ends_at > now())
  order by p.name;
$$;

revoke all on function app.directory_etc_program_offerings(uuid) from public;
grant execute on function app.directory_etc_program_offerings(uuid) to app_api, app_worker;

-- ---------------------------------------------------------------------------
-- app.directory_etc_display_name(p_etc_id uuid)
-- The human-facing ETC name lives on the parent tenant row
-- (tenants.display_name), which the directory_anonymous role CANNOT read —
-- `tenants` carries only member-read + write policies, no public-read. The
-- public /etcs list + detail surfaces need the name, so (like every other
-- tenants-traversing directory read) it must come through SECURITY DEFINER, not
-- a direct join. Gated on directory_published so an unpublished ETC's tenant
-- name can never leak through this path.
create or replace function app.directory_etc_display_name(p_etc_id uuid)
returns text
language sql
security definer
stable
set search_path = app, public
as $$
  select t.display_name
  from etcs e
  join tenants t on t.id = e.tenant_id
  where e.id = p_etc_id
    and e.directory_published = true;
$$;

revoke all on function app.directory_etc_display_name(uuid) from public;
grant execute on function app.directory_etc_display_name(uuid) to app_api, app_worker;

-- ---------------------------------------------------------------------------
-- 4. Big Sky ETC backfill
--
-- Address mirrors the primary_address_json from 0018:
--   1240 N Rouse Avenue, Suite 200, Bozeman, MT 59715
-- Lat/lng is the approximate geocode for that block of N Rouse Avenue.
-- Medical director contact (medical.director@bigskyetc.com) is a
-- placeholder; counsel + Big Sky operator confirm before public launch
-- per slice 4 plan "Risks" + PR description.
--
-- Hours formatting uses E'…' string literal so the embedded \n renders as
-- a real newline; the directory frontend renders directory_hours as
-- whitespace-pre to preserve the line breaks.
-- ---------------------------------------------------------------------------

update etcs
set
  medical_director_name           = 'Helena Marsh, MD',
  medical_director_credentials    = 'MD, FACP',
  medical_director_clinical_email = 'medical.director@bigskyetc.com',
  -- Normalize directory_city to the city only; state is carried separately
  -- (PublicEtcSummary.state). The 0018 seed stored "Bozeman, MT", which would
  -- render as "Bozeman, MT, Montana" once the UI composes city + state.
  directory_city                  = 'Bozeman',
  directory_address_lines         = ARRAY[
    '1240 N Rouse Avenue, Suite 200',
    'Bozeman, MT 59715'
  ],
  directory_phone                 = '+1 (406) 555-0142',
  directory_hours                 = E'Monday–Thursday: 8:00am – 5:00pm\nFriday: 8:00am – 12:00pm\nClosed weekends and federal holidays.',
  directory_lat                   = 45.6889,
  directory_lng                   = -111.0379,
  accepting_new_patients          = true
where directory_slug = 'big-sky';
