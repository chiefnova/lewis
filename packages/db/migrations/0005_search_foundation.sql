create table search_index_documents (
  id uuid primary key default gen_random_uuid(),
  source_table text not null,
  source_id uuid not null,
  owner_tenant_id uuid not null references tenants(id),
  patient_tenant_id uuid references tenants(id),
  visibility_classification text not null,
  title text not null,
  redacted_snippet text,
  search_vector tsvector not null,
  indexed_at timestamptz not null default now(),
  unique (source_table, source_id)
);

create table search_index_jobs (
  id uuid primary key default gen_random_uuid(),
  source_table text not null,
  source_id uuid not null,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);

create index search_index_documents_vector_idx on search_index_documents using gin (search_vector);
create index search_index_documents_title_trgm_idx on search_index_documents using gin (title gin_trgm_ops);
create index search_index_documents_owner_idx on search_index_documents (owner_tenant_id, visibility_classification);
create index search_index_documents_patient_idx on search_index_documents (patient_tenant_id);

alter table search_index_documents enable row level security;
alter table search_index_jobs enable row level security;

create policy search_index_documents_owner_read on search_index_documents
  for select using (
    owner_tenant_id = app.current_tenant_id()
    or patient_tenant_id = app.current_tenant_id()
    or app.has_active_support_grant(owner_tenant_id, 'search:read')
  );

create policy search_index_jobs_no_user_read on search_index_jobs
  for select using (false);
