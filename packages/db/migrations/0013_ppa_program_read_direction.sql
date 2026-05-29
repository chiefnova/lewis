-- 0013_ppa_program_read_direction.sql
--
-- PPA relationships are canonicalized as manufacturer tenant -> ETC tenant. An ETC
-- reading a manufacturer program should therefore check manufacturer_tenant_id -> current
-- tenant, not current tenant -> manufacturer_tenant_id.

drop policy if exists programs_manufacturer_read on programs;

create policy programs_manufacturer_read on programs
  for select
  using (
    manufacturer_tenant_id = app.current_tenant_id()
    or app.has_tenant_relationship(manufacturer_tenant_id, app.current_tenant_id(), 'ppa')
    or app.has_active_support_grant(manufacturer_tenant_id, 'tenant:read')
  );
