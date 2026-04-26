-- 0013_ppa_program_read_direction.sql
--
-- PPA relationships are canonicalized as sponsor tenant -> ETC tenant. An ETC
-- reading a sponsor program should therefore check sponsor_tenant_id -> current
-- tenant, not current tenant -> sponsor_tenant_id.

drop policy if exists programs_sponsor_read on programs;

create policy programs_sponsor_read on programs
  for select
  using (
    sponsor_tenant_id = app.current_tenant_id()
    or app.has_tenant_relationship(sponsor_tenant_id, app.current_tenant_id(), 'ppa')
    or app.has_active_support_grant(sponsor_tenant_id, 'tenant:read')
  );
