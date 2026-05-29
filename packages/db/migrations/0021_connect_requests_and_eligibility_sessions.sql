-- ---------------------------------------------------------------------------
-- 0021_connect_requests_and_eligibility_sessions.sql
--
-- Slice 5 (Sprint 5) — directoryprd.md § 17, § 18, § 32.1.
--
-- Two thrusts, matching slice 4's marketing_subscriptions pattern:
--
-- A. eligibility_sessions — server-side session token for the anonymous
--    eligibility self-screen (§ 17.2). Replaces the slice-3 localStorage-only
--    token at apps/directory/src/eligibility/anonymousSession.ts:
--      - Mints an opaque UUID on /eligibility/:slug entry
--      - Accumulates answers across the question flow
--      - Records the final pass/fail outcome + the failed criterion text
--        used by the § 17.4 fail-branch UI ("...the program requires a
--        confirmed diabetic peripheral neuropathy diagnosis")
--      - Expires server-side at 30 days
--    PII: yes (self-attested age, condition, prior treatments). NOT PHI —
--    the patient has no provider relationship until they submit a connect
--    request and the ETC clinical team contacts them.
--
-- B. connect_requests — anonymous-accepted patient-to-ETC handoff
--    (§ 18.2). The conversion target of the directory:
--      - Patient submits the connect form (anonymous; Clerk optional
--        post-conversion per § 18.2 "Critical: Account creation is
--        post-conversion, not pre-conversion")
--      - Optional FK to eligibility_sessions so the ETC clinical team
--        sees the screen answers when they receive the inquiry
--      - Worker enqueues a Resend email to the ETC's intake_email
--        (new column on etcs in this migration)
--    PII: yes (name, email, phone). NOT PHI by the same logic as above.
--
-- C. etcs.intake_email — separate from medical_director_clinical_email
--    (slice 4). The medical-director email is for clinicians; the intake
--    email is for patient inquiries. Both default null; the worker falls
--    back to medical_director_clinical_email if intake_email is missing
--    so MVP-0 with just Big Sky still routes correctly.
--
-- D. SECURITY DEFINER helpers (6 functions, mirrors slice 4's
--    marketing_subscriptions helpers):
--      - app.directory_eligibility_start(slug, ip, ua)
--          → (token, expires_at). Resolves slug → directory_published
--            program_id. Returns 0 rows on unknown / unpublished program.
--      - app.directory_eligibility_append_answer(token, question_id, value)
--          → boolean. Merges {question_id: value} into answers JSONB.
--            Returns false on expired / unknown / already-completed.
--      - app.directory_eligibility_complete(token, passed, failed_criterion)
--          → boolean. Flips status to passed|failed. Idempotent (returns
--            false if already complete).
--      - app.directory_eligibility_resume(token)
--          → (program_slug, answers, status, failed_criterion). Returns
--            0 rows on expired / unknown so the API can render an
--            "expired session" state without leaking which case it was.
--      - app.directory_connect_request_create(
--            slug, eligibility_token, name, email, phone, best_time,
--            situation, ip, ua)
--          → uuid. Resolves slug → directory_published program_id.
--          Resolves program → offering directory_published etc via the
--          existing tenant_relationships active-PPA pattern from 0019's
--          directory_program_etc_count. Validates email regex. Optional
--          eligibility_token attaches only if the session exists + not
--          expired. Returns inserted row id.
--      - app.directory_connect_request_mark_sent(id, message_id)
--          → boolean. Workers-only. Stamps sent_at + status='sent'.
--          Idempotent on the "already sent" guard so retries don't
--          re-stamp.
--
-- E. RLS posture (per .claude/rules/database.md + slice 4 pattern):
--      - directory_anonymous gets NO direct INSERT or SELECT on either
--        table.
--      - All anonymous writes go through SECURITY DEFINER functions.
--      - lewis_admin gets SELECT + FOR ALL on both for the future admin
--        console. The runtime role itself is NOBYPASSRLS per 0011.
--      - FORCE RLS on both tables.
--    Like marketing_subscriptions: anonymous users literally cannot read
--    the tables — there is no SELECT path for them.
--
-- F. Big Sky backfill — populates intake_email on the existing row.
--    Placeholder pending counsel + Big Sky operator confirmation, called
--    out in the PR description.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Schema additions
-- ---------------------------------------------------------------------------

alter table etcs
  add column intake_email text;

-- ---------------------------------------------------------------------------
-- 2. eligibility_sessions
-- ---------------------------------------------------------------------------

create table eligibility_sessions (
  id uuid primary key default gen_random_uuid(),
  token uuid not null default gen_random_uuid() unique,
  program_id uuid not null references programs(id) on delete restrict,
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'passed', 'failed')),
  failed_criterion text,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null default now() + interval '30 days',
  constraint eligibility_sessions_expiry_after_creation
    check (expires_at > created_at),
  constraint eligibility_sessions_completed_consistency
    check (
      (status = 'in_progress' and completed_at is null) or
      (status in ('passed', 'failed') and completed_at is not null)
    ),
  constraint eligibility_sessions_failed_criterion_only_on_fail
    check (
      (status = 'failed' and failed_criterion is not null) or
      (status <> 'failed' and failed_criterion is null)
    )
);

-- No separate token index: the `token ... unique` column constraint above
-- already creates a unique btree on token, which serves every point lookup
-- (start/append/complete/resume all probe by token). A partial index on
-- (token) WHERE status='in_progress' would be redundant for these single-row
-- probes.

alter table eligibility_sessions enable row level security;
alter table eligibility_sessions force row level security;

create policy eligibility_sessions_admin_select on eligibility_sessions
  for select using (
    coalesce(current_setting('app.role', true), '') = 'lewis_admin'
  );

create policy eligibility_sessions_admin_write on eligibility_sessions
  for all using (
    coalesce(current_setting('app.role', true), '') = 'lewis_admin'
  ) with check (
    coalesce(current_setting('app.role', true), '') = 'lewis_admin'
  );

comment on table eligibility_sessions is
  'Anonymous server-side eligibility screening sessions. Per
   directoryprd.md § 17.2. Token issued via
   app.directory_eligibility_start; anonymous role has no direct
   SELECT or INSERT path. 30-day server expiry.';

-- ---------------------------------------------------------------------------
-- 3. connect_requests
-- ---------------------------------------------------------------------------

create table connect_requests (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete restrict,
  etc_id uuid not null references etcs(id) on delete restrict,
  eligibility_session_id uuid references eligibility_sessions(id) on delete set null,
  patient_name text not null,
  patient_email text not null,
  patient_phone text,
  best_time_to_contact text,
  situation text,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'cancelled')),
  message_id text,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  last_send_error text,
  constraint connect_requests_sent_consistency
    check (
      (status = 'sent' and sent_at is not null) or
      (status <> 'sent')
    )
);

create index connect_requests_pending_oldest_first
  on connect_requests (created_at)
  where status = 'pending';

create index connect_requests_program_recent
  on connect_requests (program_id, created_at desc);

alter table connect_requests enable row level security;
alter table connect_requests force row level security;

create policy connect_requests_admin_select on connect_requests
  for select using (
    coalesce(current_setting('app.role', true), '') = 'lewis_admin'
  );

create policy connect_requests_admin_write on connect_requests
  for all using (
    coalesce(current_setting('app.role', true), '') = 'lewis_admin'
  ) with check (
    coalesce(current_setting('app.role', true), '') = 'lewis_admin'
  );

comment on table connect_requests is
  'Anonymous patient → ETC connect inquiries. Per directoryprd.md
   § 18.2. Inserted via app.directory_connect_request_create;
   stamped sent via app.directory_connect_request_mark_sent by the
   workers role. Anonymous role has no direct SELECT or INSERT
   path. PII (name, email, phone) is not PHI — the patient has no
   provider relationship until the ETC clinical team contacts
   them and they enroll on app.lewis.health.';

-- ---------------------------------------------------------------------------
-- 4. SECURITY DEFINER helpers
-- ---------------------------------------------------------------------------

-- 4a. directory_eligibility_start(slug, ip, ua)
--
-- Mints a new eligibility_sessions row and returns its opaque token plus
-- expiry. Returns 0 rows if the slug doesn't resolve to a published program;
-- the API handler treats that as a 404.
create or replace function app.directory_eligibility_start(
  p_program_slug text,
  p_ip inet,
  p_ua text
) returns table (token uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_program_id uuid;
  v_token uuid;
  v_expires_at timestamptz;
begin
  select p.id into v_program_id
  from programs p
  where p.directory_slug = p_program_slug
    and p.directory_published = true;

  if v_program_id is null then
    return;
  end if;

  insert into eligibility_sessions (program_id, ip_address, user_agent)
  values (v_program_id, p_ip, p_ua)
  returning eligibility_sessions.token, eligibility_sessions.expires_at
    into v_token, v_expires_at;

  return query select v_token, v_expires_at;
end;
$$;

revoke all on function app.directory_eligibility_start(text, inet, text) from public;
grant execute on function app.directory_eligibility_start(text, inet, text) to app_api;

-- 4b. directory_eligibility_append_answer(token, question_id, value)
--
-- Merges {question_id: value} into the answers JSONB. Only operates on
-- in_progress sessions that have not expired. Returns true on success.
create or replace function app.directory_eligibility_append_answer(
  p_token uuid,
  p_question_id text,
  p_value text
) returns boolean
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_updated int;
begin
  update eligibility_sessions
  set answers = answers || jsonb_build_object(p_question_id, p_value)
  where token = p_token
    and status = 'in_progress'
    and expires_at > now();

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function app.directory_eligibility_append_answer(uuid, text, text) from public;
grant execute on function app.directory_eligibility_append_answer(uuid, text, text) to app_api;

-- 4c. directory_eligibility_complete(token, passed, failed_criterion)
--
-- Closes the session with the final outcome. The failed_criterion text
-- drives the § 17.4 specific-reason UI. Idempotent: a second call on an
-- already-completed session returns false without overwriting.
create or replace function app.directory_eligibility_complete(
  p_token uuid,
  p_passed boolean,
  p_failed_criterion text
) returns boolean
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_updated int;
begin
  -- Enforce the CHECK invariant in code so callers see a clear function-
  -- level error instead of a constraint violation.
  if p_passed and p_failed_criterion is not null then
    raise exception 'failed_criterion must be null when passed=true'
      using errcode = 'P0001';
  end if;
  if not p_passed and (p_failed_criterion is null or btrim(p_failed_criterion) = '') then
    raise exception 'failed_criterion required when passed=false'
      using errcode = 'P0001';
  end if;

  update eligibility_sessions
  set
    status = case when p_passed then 'passed' else 'failed' end,
    failed_criterion = case when p_passed then null else p_failed_criterion end,
    completed_at = now()
  where token = p_token
    and status = 'in_progress'
    and expires_at > now();

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function app.directory_eligibility_complete(uuid, boolean, text) from public;
grant execute on function app.directory_eligibility_complete(uuid, boolean, text) to app_api;

-- 4d. directory_eligibility_resume(token)
--
-- Returns the session state for resume-on-return. Returns 0 rows on
-- expired / unknown so the API can present a single "session expired or
-- not found" state without leaking which case occurred.
create or replace function app.directory_eligibility_resume(p_token uuid)
returns table (
  program_slug text,
  answers jsonb,
  status text,
  failed_criterion text,
  expires_at timestamptz
)
language sql
security definer
stable
set search_path = app, public
as $$
  select
    p.directory_slug,
    es.answers,
    es.status,
    es.failed_criterion,
    es.expires_at
  from eligibility_sessions es
  join programs p on p.id = es.program_id
  where es.token = p_token
    and es.expires_at > now()
    and p.directory_published = true;
$$;

revoke all on function app.directory_eligibility_resume(uuid) from public;
grant execute on function app.directory_eligibility_resume(uuid) to app_api;

-- 4e. directory_connect_request_create(...)
--
-- The directory's conversion mutation. Resolves slug → program → offering
-- ETC via active PPA (same traversal as 0019's directory_program_etc_count
-- but returning the ETC row, not a count). Optional eligibility_token
-- attaches the screen to the request when present + not expired.
--
-- Validates email format with a permissive POSIX regex matching slice 4's
-- marketing_subscriptions pattern. Stricter validation lives upstream in
-- the zod schema; the regex here is the second line of defense.
--
-- Returns the inserted row id. The API handler enqueues a
-- connect_request_send BullMQ job using the returned id; the worker
-- handler reads the row via app.directory_connect_request_for_send (4g
-- below) to assemble the email payload.
create or replace function app.directory_connect_request_create(
  p_program_slug text,
  p_eligibility_token uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_best_time text,
  p_situation text,
  p_ip inet,
  p_ua text
) returns uuid
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_program_id uuid;
  v_etc_id uuid;
  v_eligibility_session_id uuid;
  v_email_lower text := lower(trim(coalesce(p_email, '')));
  v_name text := trim(coalesce(p_name, ''));
  v_id uuid;
begin
  if v_email_lower !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'invalid_email' using errcode = 'P0001';
  end if;

  if char_length(v_name) = 0 then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;

  select p.id into v_program_id
  from programs p
  where p.directory_slug = p_program_slug
    and p.directory_published = true;

  if v_program_id is null then
    raise exception 'unknown_program' using errcode = 'P0001';
  end if;

  -- Resolve offering ETC via active manufacturer↔ETC PPA. Mirrors the
  -- 0019 directory_program_etc_count traversal. Picks the most recently
  -- onboarded matching ETC; in MVP-0 there is exactly one (Big Sky).
  select e.id into v_etc_id
  from tenant_relationships tr
  join etcs e on e.tenant_id = tr.to_tenant_id
  join programs p on p.id = v_program_id
  where tr.from_tenant_id = p.manufacturer_tenant_id
    and tr.kind = 'ppa'
    and tr.status = 'active'
    and tr.starts_at <= now()
    and (tr.ends_at is null or tr.ends_at > now())
    and e.directory_published = true
  order by tr.starts_at desc
  limit 1;

  if v_etc_id is null then
    raise exception 'no_offering_etc' using errcode = 'P0001';
  end if;

  -- Attach the eligibility session if a token is provided AND the
  -- session exists AND is for the same program AND has not expired.
  -- Silently skip otherwise — the connect submission should not fail
  -- just because the localStorage screen pointer rotted.
  if p_eligibility_token is not null then
    select es.id into v_eligibility_session_id
    from eligibility_sessions es
    where es.token = p_eligibility_token
      and es.program_id = v_program_id
      and es.expires_at > now();
  end if;

  insert into connect_requests (
    program_id, etc_id, eligibility_session_id,
    patient_name, patient_email, patient_phone, best_time_to_contact,
    situation, ip_address, user_agent
  ) values (
    v_program_id, v_etc_id, v_eligibility_session_id,
    v_name, v_email_lower, nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_best_time, '')), ''),
    nullif(trim(coalesce(p_situation, '')), ''),
    p_ip, p_ua
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function app.directory_connect_request_create(
  text, uuid, text, text, text, text, text, inet, text
) from public;
grant execute on function app.directory_connect_request_create(
  text, uuid, text, text, text, text, text, inet, text
) to app_api;

-- 4f. directory_connect_request_mark_sent(id, message_id)
--
-- Worker-only. Stamps sent_at + status='sent' + message_id. Idempotent on
-- the status-is-pending guard so a retry that delivers a second copy
-- still doesn't double-stamp.
create or replace function app.directory_connect_request_mark_sent(
  p_id uuid,
  p_message_id text
) returns boolean
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_updated int;
begin
  update connect_requests
  set
    status = 'sent',
    sent_at = now(),
    message_id = p_message_id,
    last_send_error = null
  where id = p_id
    and status = 'pending';

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

-- Migration 0011 grants execute on all app.* functions to app_api by default;
-- explicitly revoke from app_api so this mutation is workers-only (the API
-- enqueues a job, the worker stamps the row).
revoke all on function app.directory_connect_request_mark_sent(uuid, text) from public, app_api;
grant execute on function app.directory_connect_request_mark_sent(uuid, text) to app_worker;

-- 4g. directory_connect_request_for_send(id)
--
-- Worker-only read path. Returns the assembled email payload (patient
-- contact fields + offering ETC intake_email + program slug + answers).
-- Anonymous role has no SELECT path on connect_requests; the worker
-- (app_worker) goes through this helper to keep the read narrow.
create or replace function app.directory_connect_request_for_send(p_id uuid)
returns table (
  request_id uuid,
  program_slug text,
  program_name text,
  etc_name text,
  intake_email text,
  fallback_email text,
  patient_name text,
  patient_email text,
  patient_phone text,
  best_time_to_contact text,
  situation text,
  eligibility_answers jsonb,
  eligibility_status text,
  eligibility_failed_criterion text,
  created_at timestamptz
)
language sql
security definer
stable
set search_path = app, public
as $$
  select
    cr.id,
    p.directory_slug,
    p.name,
    t.display_name,
    e.intake_email,
    e.medical_director_clinical_email,
    cr.patient_name,
    cr.patient_email,
    cr.patient_phone,
    cr.best_time_to_contact,
    cr.situation,
    es.answers,
    es.status,
    es.failed_criterion,
    cr.created_at
  from connect_requests cr
  join programs p on p.id = cr.program_id
  join etcs e on e.id = cr.etc_id
  join tenants t on t.id = e.tenant_id
  left join eligibility_sessions es on es.id = cr.eligibility_session_id
  where cr.id = p_id
    and cr.status = 'pending';
$$;

-- Same posture as mark_sent: revoke app_api's default-privilege grant so the
-- only read path into connect_requests goes through the worker.
revoke all on function app.directory_connect_request_for_send(uuid) from public, app_api;
grant execute on function app.directory_connect_request_for_send(uuid) to app_worker;

-- ---------------------------------------------------------------------------
-- 5. Big Sky ETC backfill — intake_email
--
-- Placeholder pending counsel + Big Sky operator confirmation, per slice 5
-- PR description. The worker's fallback to medical_director_clinical_email
-- means the connect flow works against MVP-0 even before intake_email is
-- confirmed.
-- ---------------------------------------------------------------------------

update etcs
set intake_email = 'intake@bigskyetc.com'
where directory_slug = 'big-sky';
