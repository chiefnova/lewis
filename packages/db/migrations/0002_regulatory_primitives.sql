create table regulatory_jurisdictions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name text not null,
  timezone text not null,
  status text not null default 'active',
  effective_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table regulatory_rule_versions (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_id uuid not null references regulatory_jurisdictions(id),
  source_name text not null,
  source_citation text not null,
  source_url text,
  effective_at timestamptz not null,
  superseded_at timestamptz,
  counsel_review_status text not null default 'pending',
  created_at timestamptz not null default now()
);

insert into regulatory_jurisdictions (code, display_name, timezone, effective_at)
values ('US-MT', 'Montana', 'America/Denver', '2025-01-01T00:00:00Z')
on conflict (code) do nothing;

insert into regulatory_rule_versions (
  jurisdiction_id,
  source_name,
  source_citation,
  source_url,
  effective_at,
  counsel_review_status
)
select
  id,
  'MAR 2026-427.1 / SB 535',
  'Montana Experimental Treatment Center rules and SB 535',
  'docs/legislation/etc.md',
  '2026-04-10T00:00:00Z',
  'pending'
from regulatory_jurisdictions
where code = 'US-MT';

alter table regulatory_jurisdictions enable row level security;
alter table regulatory_rule_versions enable row level security;

create policy regulatory_jurisdictions_read on regulatory_jurisdictions
  for select using (true);

create policy regulatory_rule_versions_read on regulatory_rule_versions
  for select using (true);
