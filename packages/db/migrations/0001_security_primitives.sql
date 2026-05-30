create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;

create schema if not exists app;

create type tenant_kind as enum ('manufacturer', 'etc', 'patient', 'board', 'lewis_internal');
create type tenant_status as enum ('active', 'inactive', 'pending', 'suspended', 'provisional');
create type notification_channel as enum ('email');

create table tenants (
  id uuid primary key default gen_random_uuid(),
  kind tenant_kind not null,
  status tenant_status not null default 'pending',
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  email text not null,
  name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  tenant_id uuid not null references tenants(id),
  role text not null,
  status text not null default 'active',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, tenant_id, role)
);

create table tenant_relationships (
  id uuid primary key default gen_random_uuid(),
  from_tenant_id uuid not null references tenants(id),
  to_tenant_id uuid not null references tenants(id),
  kind text not null,
  scope_json jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table support_access_grants (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references users(id),
  target_tenant_id uuid not null references tenants(id),
  ticket_id text not null,
  scopes text[] not null,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  approved_by_user_id uuid not null references users(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  actor_user_id uuid references users(id),
  action text not null,
  target_object_type text not null,
  target_object_id uuid,
  before jsonb,
  after jsonb,
  ip inet,
  ua text,
  request_id text,
  ts timestamptz not null default now()
);

create table file_storage_objects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  bucket text not null,
  object_path text not null,
  sha256 text not null,
  size_bytes bigint not null,
  mime_type text not null,
  uploaded_by_user_id uuid not null references users(id),
  uploaded_at timestamptz not null default now(),
  immutable_ref boolean not null default false,
  unique (bucket, object_path)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  channel notification_channel not null,
  template text not null,
  recipient text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table feature_flags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  flag_key text not null,
  enabled boolean not null default false,
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, flag_key)
);

create or replace function app.current_user_id() returns uuid
language sql stable
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

create or replace function app.current_tenant_id() returns uuid
language sql stable
as $$
  select nullif(current_setting('app.active_tenant_id', true), '')::uuid
$$;

create or replace function app.current_request_id() returns text
language sql stable
as $$
  select nullif(current_setting('app.request_id', true), '')
$$;

create or replace function app.current_support_ticket_id() returns text
language sql stable
as $$
  select nullif(current_setting('app.support_ticket_id', true), '')
$$;

create or replace function app.is_tenant_member(target_tenant_id uuid, allowed_roles text[] default null)
returns boolean language sql stable security definer set search_path = public, app as $$
  select exists (
    select 1
    from tenant_memberships tm
    where tm.tenant_id = target_tenant_id
      and tm.user_id = app.current_user_id()
      and tm.status = 'active'
      and tm.starts_at <= now()
      and (tm.ends_at is null or tm.ends_at > now())
      and (allowed_roles is null or tm.role = any(allowed_roles))
  )
$$;

create or replace function app.has_tenant_relationship(source_tenant_id uuid, target_tenant_id uuid, relationship_kind text)
returns boolean language sql stable security definer set search_path = public, app as $$
  select exists (
    select 1
    from tenant_relationships tr
    where tr.from_tenant_id = source_tenant_id
      and tr.to_tenant_id = target_tenant_id
      and tr.kind = relationship_kind
      and tr.status = 'active'
      and tr.starts_at <= now()
      and (tr.ends_at is null or tr.ends_at > now())
  )
$$;

create or replace function app.has_active_support_grant(target_tenant_id uuid, required_scope text)
returns boolean language sql stable security definer set search_path = public, app as $$
  select exists (
    select 1
    from support_access_grants sag
    where sag.target_tenant_id = target_tenant_id
      and sag.staff_user_id = app.current_user_id()
      and sag.revoked_at is null
      and sag.starts_at <= now()
      and sag.expires_at > now()
      and app.current_support_ticket_id() = sag.ticket_id
      and required_scope = any(sag.scopes)
  )
$$;

alter table tenants enable row level security;
alter table users enable row level security;
alter table tenant_memberships enable row level security;
alter table tenant_relationships enable row level security;
alter table support_access_grants enable row level security;
alter table audit_log enable row level security;
alter table file_storage_objects enable row level security;
alter table notifications enable row level security;
alter table feature_flags enable row level security;

create policy tenants_member_read on tenants
  for select using (app.is_tenant_member(id) or app.has_active_support_grant(id, 'tenant:read'));

create policy users_self_or_tenant_read on users
  for select using (
    id = app.current_user_id()
    or exists (
      select 1 from tenant_memberships tm_self
      join tenant_memberships tm_other on tm_other.tenant_id = tm_self.tenant_id
      where tm_self.user_id = app.current_user_id()
        and tm_other.user_id = users.id
        and tm_self.status = 'active'
        and tm_other.status = 'active'
    )
  );

create policy tenant_memberships_member_read on tenant_memberships
  for select using (app.is_tenant_member(tenant_id) or app.has_active_support_grant(tenant_id, 'tenant:read'));

create policy tenant_relationships_related_read on tenant_relationships
  for select using (
    app.is_tenant_member(from_tenant_id)
    or app.is_tenant_member(to_tenant_id)
    or app.has_active_support_grant(from_tenant_id, 'tenant:read')
    or app.has_active_support_grant(to_tenant_id, 'tenant:read')
  );

create policy support_access_grants_staff_read on support_access_grants
  for select using (staff_user_id = app.current_user_id() or app.has_active_support_grant(target_tenant_id, 'support:read'));

create policy audit_log_tenant_read on audit_log
  for select using (
    tenant_id = app.current_tenant_id()
    or app.has_active_support_grant(tenant_id, 'audit:read')
  );

create policy file_storage_objects_tenant_read on file_storage_objects
  for select using (
    tenant_id = app.current_tenant_id()
    or app.has_active_support_grant(tenant_id, 'file:read')
  );

create policy notifications_tenant_read on notifications
  for select using (tenant_id is null or tenant_id = app.current_tenant_id());

create policy feature_flags_tenant_read on feature_flags
  for select using (tenant_id is null or tenant_id = app.current_tenant_id());
