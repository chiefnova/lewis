create table manufacturer_organizations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references tenants(id),
  legal_name text not null,
  tax_id_encrypted bytea,
  billing_profile_json jsonb not null default '{}'::jsonb,
  regulatory_contacts_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table etcs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references tenants(id),
  jurisdiction_id uuid not null references regulatory_jurisdictions(id),
  license_number text,
  license_expires_at timestamptz,
  designation text not null default 'outpatient',
  primary_address_json jsonb not null default '{}'::jsonb,
  status text not null default 'application_pending',
  created_at timestamptz not null default now()
);

create table patients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references tenants(id),
  jurisdiction_id uuid not null references regulatory_jurisdictions(id),
  primary_user_id uuid references users(id),
  full_name text,
  sex text,
  dob date,
  address_json jsonb not null default '{}'::jsonb,
  emergency_contact_json jsonb not null default '{}'::jsonb,
  allergies text,
  created_at timestamptz not null default now()
);

create table programs (
  id uuid primary key default gen_random_uuid(),
  manufacturer_tenant_id uuid not null references tenants(id),
  jurisdiction_id uuid not null references regulatory_jurisdictions(id),
  name text not null,
  drug text,
  indication text,
  phase text,
  ind_number text,
  protocol_file_id uuid references file_storage_objects(id),
  treatment_form text not null,
  pricing_model text not null default 'cash_pay',
  hfar_path text not null default 'path_b',
  eligibility_criteria_json jsonb not null default '{}'::jsonb,
  patient_facing_description text,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table investigational_devices (
  id uuid primary key default gen_random_uuid(),
  manufacturer_tenant_id uuid not null references tenants(id),
  program_id uuid references programs(id),
  jurisdiction_id uuid not null references regulatory_jurisdictions(id),
  device_name text not null,
  device_type text,
  identifier_schema text,
  connectivity_flag boolean not null default false,
  workflow_status text not null default 'disabled',
  created_at timestamptz not null default now()
);

create table inpatient_facility_profiles (
  id uuid primary key default gen_random_uuid(),
  etc_tenant_id uuid not null references tenants(id),
  jurisdiction_id uuid not null references regulatory_jurisdictions(id),
  enabled boolean not null default false,
  bed_count integer,
  plant_evidence_json jsonb not null default '{}'::jsonb,
  generator_evidence_file_id uuid references file_storage_objects(id),
  sprinkler_evidence_file_id uuid references file_storage_objects(id),
  call_system_evidence_file_id uuid references file_storage_objects(id),
  validation_status text not null default 'inactive',
  created_at timestamptz not null default now()
);

create table payment_rails (
  id uuid primary key default gen_random_uuid(),
  rail_type text not null,
  provider text not null,
  currency_code text not null,
  status text not null default 'disabled',
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (rail_type, provider, currency_code)
);

create table payment_obligations (
  id uuid primary key default gen_random_uuid(),
  patient_tenant_id uuid references tenants(id),
  etc_tenant_id uuid references tenants(id),
  program_id uuid references programs(id),
  jurisdiction_id uuid not null references regulatory_jurisdictions(id),
  amount_cents bigint not null,
  currency_code text not null,
  payment_rail_id uuid references payment_rails(id),
  legal_basis text not null,
  status text not null default 'open',
  waiver_reason text,
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table payment_transactions (
  id uuid primary key default gen_random_uuid(),
  obligation_id uuid not null references payment_obligations(id),
  payment_rail_id uuid not null references payment_rails(id),
  external_reference text,
  status text not null,
  amount_cents bigint not null,
  currency_code text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table hfar_path_a_allocations (
  id uuid primary key default gen_random_uuid(),
  etc_tenant_id uuid references tenants(id),
  program_id uuid references programs(id),
  jurisdiction_id uuid not null references regulatory_jurisdictions(id),
  qualifying_resident_basis text,
  product_quantity numeric,
  fulfillment_evidence_file_id uuid references file_storage_objects(id),
  reconciliation_status text not null default 'inactive',
  created_at timestamptz not null default now()
);

create table patient_data_sharing_consents (
  id uuid primary key default gen_random_uuid(),
  patient_tenant_id uuid not null references tenants(id),
  manufacturer_tenant_id uuid not null references tenants(id),
  jurisdiction_id uuid not null references regulatory_jurisdictions(id),
  program_id uuid references programs(id),
  scope_json jsonb not null default '{}'::jsonb,
  starts_at timestamptz,
  revoked_at timestamptz,
  status text not null default 'inactive',
  created_at timestamptz not null default now()
);

create table patient_device_registry_entries (
  id uuid primary key default gen_random_uuid(),
  patient_tenant_id uuid not null references tenants(id),
  enrollment_id uuid,
  device_id uuid not null references investigational_devices(id),
  jurisdiction_id uuid not null references regulatory_jurisdictions(id),
  device_identifier text,
  status text not null default 'inactive',
  outcomes_summary text,
  ae_id uuid,
  created_at timestamptz not null default now()
);

insert into payment_rails (rail_type, provider, currency_code, status)
values
  ('card', 'stripe', 'USD', 'active'),
  ('ach', 'stripe', 'USD', 'active'),
  ('digital_currency', 'disabled', 'USD', 'disabled')
on conflict (rail_type, provider, currency_code) do nothing;

alter table manufacturer_organizations enable row level security;
alter table etcs enable row level security;
alter table patients enable row level security;
alter table programs enable row level security;
alter table investigational_devices enable row level security;
alter table inpatient_facility_profiles enable row level security;
alter table payment_rails enable row level security;
alter table payment_obligations enable row level security;
alter table payment_transactions enable row level security;
alter table hfar_path_a_allocations enable row level security;
alter table patient_data_sharing_consents enable row level security;
alter table patient_device_registry_entries enable row level security;

create policy manufacturer_organizations_tenant_read on manufacturer_organizations
  for select using (tenant_id = app.current_tenant_id() or app.has_active_support_grant(tenant_id, 'tenant:read'));

create policy etcs_tenant_read on etcs
  for select using (tenant_id = app.current_tenant_id() or app.has_active_support_grant(tenant_id, 'tenant:read'));

create policy patients_self_read on patients
  for select using (tenant_id = app.current_tenant_id() or app.has_active_support_grant(tenant_id, 'patient:read'));

create policy programs_manufacturer_read on programs
  for select using (manufacturer_tenant_id = app.current_tenant_id());

create policy investigational_devices_manufacturer_read on investigational_devices
  for select using (manufacturer_tenant_id = app.current_tenant_id());

create policy inpatient_facility_profiles_etc_read on inpatient_facility_profiles
  for select using (etc_tenant_id = app.current_tenant_id() or app.has_active_support_grant(etc_tenant_id, 'tenant:read'));

create policy payment_rails_read on payment_rails
  for select using (true);

create policy payment_obligations_scoped_read on payment_obligations
  for select using (
    patient_tenant_id = app.current_tenant_id()
    or etc_tenant_id = app.current_tenant_id()
    or app.has_active_support_grant(patient_tenant_id, 'billing:read')
    or app.has_active_support_grant(etc_tenant_id, 'billing:read')
  );

create policy payment_transactions_obligation_read on payment_transactions
  for select using (
    exists (
      select 1 from payment_obligations po
      where po.id = payment_transactions.obligation_id
        and (po.patient_tenant_id = app.current_tenant_id() or po.etc_tenant_id = app.current_tenant_id())
    )
  );

create policy hfar_path_a_allocations_etc_read on hfar_path_a_allocations
  for select using (etc_tenant_id = app.current_tenant_id());

create policy patient_data_sharing_consents_patient_read on patient_data_sharing_consents
  for select using (patient_tenant_id = app.current_tenant_id());

create policy patient_device_registry_entries_patient_read on patient_device_registry_entries
  for select using (patient_tenant_id = app.current_tenant_id());
