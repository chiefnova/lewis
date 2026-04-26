-- Minimal pgTAP-compatible semantic test harness.
--
-- We keep this in-repo so RLS semantic tests run on vanilla Postgres in CI and
-- local Docker. It implements only the assertion functions used by the RLS
-- suite; failing assertions raise exceptions, which makes the SQL runner fail.

create or replace function plan(test_count integer)
returns text
language plpgsql
as $$
begin
  return '1..' || test_count::text;
end
$$;

create or replace function ok(condition boolean, description text)
returns text
language plpgsql
as $$
begin
  if condition is not true then
    raise exception 'not ok - %', description;
  end if;
  return 'ok - ' || description;
end
$$;

create or replace function is(actual anyelement, expected anyelement, description text)
returns text
language plpgsql
as $$
begin
  if actual is distinct from expected then
    raise exception 'not ok - % (got %, expected %)', description, actual, expected;
  end if;
  return 'ok - ' || description;
end
$$;

create or replace function isnt(actual anyelement, expected anyelement, description text)
returns text
language plpgsql
as $$
begin
  if actual is not distinct from expected then
    raise exception 'not ok - % (got forbidden value %)', description, actual;
  end if;
  return 'ok - ' || description;
end
$$;

create or replace function lives_ok(statement text, description text)
returns text
language plpgsql
as $$
begin
  execute statement;
  return 'ok - ' || description;
exception
  when others then
    raise exception 'not ok - % (unexpected %, %)', description, sqlstate, sqlerrm;
end
$$;

create or replace function throws_ok(
  statement text,
  expected_sqlstate text,
  expected_message text,
  description text
)
returns text
language plpgsql
as $$
begin
  execute statement;
  -- The "no exception thrown" sentinel uses a dedicated SQLSTATE class
  -- ('XX900' — a Postgres internal_error subclass not used by user code) so
  -- our handler can re-raise it without false-positive collisions when a
  -- real test happens to raise P0001 with a matching message.
  raise exception using
    errcode = 'XX900',
    message = 'not ok - ' || description || ' (no exception thrown)';
exception
  when others then
    if sqlstate = 'XX900' then
      raise;
    end if;

    if sqlstate <> expected_sqlstate then
      raise exception 'not ok - % (got SQLSTATE %, expected %; message: %)',
        description,
        sqlstate,
        expected_sqlstate,
        sqlerrm;
    end if;

    if expected_message is not null and sqlerrm <> expected_message then
      raise exception 'not ok - % (got message %, expected %)',
        description,
        sqlerrm,
        expected_message;
    end if;

    return 'ok - ' || description;
end
$$;

create or replace function is_empty(statement text, description text)
returns text
language plpgsql
as $$
declare
  has_row boolean;
  trimmed text;
begin
  -- Trim trailing whitespace and any trailing semicolons so callers can use
  -- the natural psql copy-paste form ('select * from t;') without breaking
  -- the wrap into 'select exists (... )'.
  trimmed := regexp_replace(statement, '[\s;]+$', '');
  execute 'select exists (' || trimmed || ')' into has_row;
  if has_row then
    raise exception 'not ok - % (query returned rows)', description;
  end if;
  return 'ok - ' || description;
end
$$;

create or replace function has_table(schema_name text, table_name text, description text)
returns text
language plpgsql
as $$
begin
  if to_regclass(format('%I.%I', schema_name, table_name)) is null then
    raise exception 'not ok - % (missing table %.%)', description, schema_name, table_name;
  end if;
  return 'ok - ' || description;
end
$$;

create or replace function finish()
returns table(result text)
language sql
as $$
  select 'ok - finish';
$$;
