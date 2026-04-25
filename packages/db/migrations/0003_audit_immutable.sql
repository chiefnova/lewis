create or replace function audit_log_immutable() returns trigger as $$
begin
  raise exception 'audit_log is append-only';
end;
$$ language plpgsql;

create trigger audit_log_no_update
before update on audit_log
for each row execute function audit_log_immutable();

create trigger audit_log_no_delete
before delete on audit_log
for each row execute function audit_log_immutable();

create trigger audit_log_no_truncate
before truncate on audit_log
for each statement execute function audit_log_immutable();

revoke truncate on audit_log from public;
