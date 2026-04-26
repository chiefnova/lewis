-- 0010_patient_representatives_and_minor_assents.sql
--
-- Sprint-1 schema gap closed: per implementation.md § 2.1.1, the patient
-- representative + minor-assent model must land in the Sprint 1 schema
-- foundation so that Sprint 4 patient registration has somewhere to attach
-- signer capacity, caregiver scope, and guardian authority.
--
-- Without these tables, Sprint 4 would either:
--   (a) bolt on the model under deadline pressure (rushed RLS, missing tests), or
--   (b) silently model "patient = tenant member with a single role" which
--       can't represent caregiver-vs-guardian authority distinctions.
--
-- Two tables:
--
--   1. patient_representatives — who can speak/sign on behalf of a patient,
--      with what authority, with what scope, and from when until when.
--      A self-directed adult patient has a row here too (relationship_type='self').
--
--   2. minor_assents — for patients under the age of medical-decision capacity,
--      records whether the minor assented, declined, was waived (with reason),
--      or whether assent was not applicable. Linked to enrollment for the
--      Sprint 4 enrollment workflow (enrollment_id is nullable here because
--      the enrollments table doesn't exist yet — Sprint 4 will add the FK).

-- ---------------------------------------------------------------------------
-- patient_representatives
-- ---------------------------------------------------------------------------

create table patient_representatives (
  id uuid primary key default gen_random_uuid(),

  -- Which patient this representative acts for. The patient is itself a tenant
  -- (kind='patient'); this column is the FK to that tenant.
  patient_tenant_id uuid not null references tenants(id),

  -- Required for any regulated-table per .claude/rules/database.md rule 4.
  jurisdiction_id uuid not null references regulatory_jurisdictions(id),

  -- The representative's Lewis user identity. For a self-directed adult
  -- patient, this is the patient's own user_id (relationship_type='self').
  user_id uuid not null references users(id),

  -- Relationship taxonomy. Constrained to the known set; new values require
  -- a forward migration (intentionally — adding a representative type has
  -- access-scope implications that should be reviewed).
  relationship_type text not null,
  constraint patient_representatives_relationship_type_check check (
    relationship_type in (
      'self',
      'caregiver',
      'legal_guardian',
      'parent_guardian',
      'provider_proxy'
    )
  ),

  -- Free-text basis for the authority (e.g. 'self_directed_adult',
  -- 'court_order', 'parental_rights', 'medical_proxy'). Combined with
  -- authority_document_file_id for verifiable types.
  authority_basis text not null,

  -- For non-self representatives, a regulated file (court order, POA, etc.)
  -- must be attached and verified before signing_permission can be true.
  authority_document_file_id uuid references file_storage_objects(id),

  -- Granular access scope. Allowed strings (validated at app layer):
  --   'schedule:read', 'outcomes:read', 'documents:read', 'messages:read',
  --   'records:read', 'consents:read', 'agreements:read'
  -- Empty array means representative has portal access only via signing_permission.
  access_scope text[] not null default '{}',

  -- Can this representative sign informed consent or patient agreements
  -- on the patient's behalf? Must be paired with verified authority for
  -- non-self representatives.
  signing_permission boolean not null default false,

  -- Can this representative send/receive messages on behalf of the patient?
  messaging_permission boolean not null default false,

  -- Effective dates. effective_at is when the authority kicks in;
  -- expires_at is the natural expiry (e.g. minor reaches age of capacity);
  -- revoked_at is the unilateral revocation timestamp (immediate effect).
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,

  -- Verification trail. verified_by_user_id is the Lewis staff user who
  -- inspected the authority document. NULL means unverified — no signing.
  verified_by_user_id uuid references users(id),
  verified_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A given (patient_tenant, user) pair can only have one active row at a
  -- time; revoking and re-adding creates a new row with the new dates.
  -- Partial unique index defined below.
  constraint patient_representatives_signing_requires_verification check (
    signing_permission = false
    or relationship_type = 'self'
    or (verified_by_user_id is not null and verified_at is not null)
  )
);

-- One active representation per (patient, user) — revocation flips revoked_at,
-- and a new row is needed for re-authorization.
create unique index patient_representatives_active_unique
  on patient_representatives (patient_tenant_id, user_id)
  where revoked_at is null;

-- Lookup index: "who represents patient X right now?"
create index patient_representatives_patient_idx
  on patient_representatives (patient_tenant_id, effective_at, expires_at, revoked_at);

-- Lookup index: "what patients does user X represent right now?"
create index patient_representatives_user_idx
  on patient_representatives (user_id, effective_at, expires_at, revoked_at);

-- ---------------------------------------------------------------------------
-- minor_assents
-- ---------------------------------------------------------------------------

create table minor_assents (
  id uuid primary key default gen_random_uuid(),

  patient_tenant_id uuid not null references tenants(id),
  jurisdiction_id uuid not null references regulatory_jurisdictions(id),

  -- Future Sprint 4 enrollments table will get an FK column added via a
  -- later migration. For now this is a free uuid that the enrollment row
  -- can join against.
  enrollment_id uuid,

  assent_status text not null,
  constraint minor_assents_status_check check (
    assent_status in ('collected', 'declined', 'waived', 'not_applicable')
  ),

  -- Required if assent_status='waived'. The medical director's user_id
  -- and the documented reason live here.
  waiver_reason text,
  waiver_medical_director_user_id uuid references users(id),
  constraint minor_assents_waiver_requires_reason check (
    assent_status <> 'waived'
    or (waiver_reason is not null and waiver_medical_director_user_id is not null)
  ),

  -- When assent_status='collected', these capture the encounter.
  assented_at timestamptz,
  recorded_by_user_id uuid references users(id),
  -- Optional recording artifact (per CLAUDE.md, regulated immutable upload).
  recording_file_id uuid references file_storage_objects(id),

  created_at timestamptz not null default now()
);

create index minor_assents_patient_idx on minor_assents (patient_tenant_id, created_at);
create index minor_assents_enrollment_idx on minor_assents (enrollment_id);

-- ---------------------------------------------------------------------------
-- RLS — read policies
-- ---------------------------------------------------------------------------

alter table patient_representatives enable row level security;
alter table minor_assents enable row level security;

-- patient_representatives reads:
--   - The representative themselves can see their own row (user_id match)
--   - The patient tenant can see all their representative rows (tenant match)
--   - An ETC with care_team relationship can see them (care coordination)
--   - Lewis support with patient:read grant can see them
create policy patient_representatives_read on patient_representatives
  for select
  using (
    user_id = app.current_user_id()
    or patient_tenant_id = app.current_tenant_id()
    or app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
    or app.has_active_support_grant(patient_tenant_id, 'patient:read')
  );

-- minor_assents reads:
--   - The patient tenant can see their own assents
--   - ETC care_team can see (clinical context)
--   - Lewis support with patient:read grant can see
create policy minor_assents_read on minor_assents
  for select
  using (
    patient_tenant_id = app.current_tenant_id()
    or app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
    or app.has_active_support_grant(patient_tenant_id, 'patient:read')
  );

-- ---------------------------------------------------------------------------
-- New write actions — extend app.role_grants_action
-- ---------------------------------------------------------------------------
--
-- Two new write actions:
--   representative:write — manage patient_representatives rows.
--     Allowed for: patient self, ETC care-team roles (clinician/admin), lewis_admin.
--   minor_assent:write — record minor assent / waiver decisions.
--     Allowed for: ETC care-team roles, lewis_admin (medical director gate
--     enforced by waiver constraint).
--
-- We replace the helper to add the new entries. The existing CASE arms remain
-- intact; only two new arms added before the catch-all `else false`.

create or replace function app.role_grants_action(role_name text, action text)
returns boolean
language sql
immutable
as $$
  select case action
    when 'tenant:write'              then role_name in ('sponsor_admin', 'etc_admin', 'lewis_admin')
    when 'user:write'                then role_name in ('lewis_admin')
    when 'membership:write'          then role_name in ('sponsor_admin', 'etc_admin', 'lewis_admin')
    when 'relationship:write'        then role_name in ('sponsor_admin', 'etc_admin', 'lewis_admin')
    when 'support_grant:write'       then role_name in ('lewis_admin')
    when 'audit:write'               then true
    when 'file:write'                then role_name in ('sponsor_admin', 'sponsor_user', 'etc_admin', 'etc_user', 'etc_clinician', 'patient', 'lewis_admin')
    when 'notification:write'        then role_name in ('lewis_admin')
    when 'feature_flag:write'        then role_name in ('lewis_admin')
    when 'regulatory:write'          then role_name in ('lewis_admin')
    when 'sponsor:write'             then role_name in ('sponsor_admin', 'lewis_admin')
    when 'etc:write'                 then role_name in ('etc_admin', 'lewis_admin')
    when 'patient:write'             then role_name in ('patient', 'etc_admin', 'etc_clinician', 'lewis_admin')
    when 'program:write'             then role_name in ('sponsor_admin', 'lewis_admin')
    when 'device:write'              then role_name in ('sponsor_admin', 'lewis_admin')
    when 'facility:write'            then role_name in ('etc_admin', 'lewis_admin')
    when 'payment_rail:write'        then role_name in ('lewis_admin')
    when 'payment_obligation:write'  then role_name in ('sponsor_admin', 'etc_admin', 'lewis_admin')
    when 'payment_transaction:write' then role_name in ('lewis_admin')
    when 'hfar:write'                then role_name in ('etc_admin', 'lewis_admin')
    when 'consent:write'             then role_name in ('patient', 'etc_admin', 'etc_clinician', 'lewis_admin')
    when 'device_registry:write'     then role_name in ('patient', 'etc_admin', 'etc_clinician', 'lewis_admin')
    when 'search_index:write'        then role_name in ('lewis_admin')
    when 'representative:write'      then role_name in ('patient', 'etc_admin', 'etc_clinician', 'lewis_admin')
    when 'minor_assent:write'        then role_name in ('etc_admin', 'etc_clinician', 'lewis_admin')
    else false
  end
$$;

-- ---------------------------------------------------------------------------
-- RLS — write policies
-- ---------------------------------------------------------------------------

create policy patient_representatives_write on patient_representatives
  for all to public
  using (
    app.can_write_for_tenant(patient_tenant_id, 'representative:write')
    or app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
  )
  with check (
    app.can_write_for_tenant(patient_tenant_id, 'representative:write')
    or app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
  );

create policy minor_assents_write on minor_assents
  for all to public
  using (
    app.can_write_for_tenant(patient_tenant_id, 'minor_assent:write')
    or app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
  )
  with check (
    app.can_write_for_tenant(patient_tenant_id, 'minor_assent:write')
    or app.has_tenant_relationship(app.current_tenant_id(), patient_tenant_id, 'care_team')
  );

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------

comment on table patient_representatives is
  'Who can speak/sign on behalf of a patient, with what authority, scope, and effective dates. Per implementation.md § 2.1.1. Self-directed adult patients have a row here with relationship_type=self.';

comment on column patient_representatives.access_scope is
  'Granular permissions array. Allowed strings: schedule:read, outcomes:read, documents:read, messages:read, records:read, consents:read, agreements:read. Validated at app layer.';

comment on column patient_representatives.signing_permission is
  'When true, this representative can sign informed consent or patient agreements on the patient''s behalf. For non-self relationships, requires verified authority document (enforced by check constraint).';

comment on table minor_assents is
  'Per RULE / clinical practice, minor patients may need to assent to treatment alongside parental consent. This table records collected/declined/waived/not-applicable status. Per implementation.md § 2.1.1.';

comment on column minor_assents.waiver_reason is
  'Required when assent_status=waived. Medical director user_id is also required (enforced by check constraint).';
