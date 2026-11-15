-- Align the private rate-limit ledger with the live schema:
--
--   private.print_request_rate_limits
--     ip_hash          text primary key
--     window_started_at timestamptz not null default now()
--     request_count    integer not null default 0
--     updated_at       timestamptz not null default now()
--
-- The earlier repo migrations used `client_hash` / `window_start`. The live
-- project already uses the columns above, and its RPC was corrected manually.
-- This migration is incremental and idempotent so both an existing live
-- project and a project built from the earlier migrations converge on the
-- actual schema.
--
-- It never deletes rate-limit rows, request rows or storage objects. Legacy
-- development columns are renamed in place so counters are preserved.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to service_role;

-- Live schema. No-op when the table already exists.
create table if not exists private.print_request_rate_limits (
  ip_hash text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint print_request_rate_limits_ip_hash_check
    check (char_length(ip_hash) between 16 and 128)
);

-- Upgrade projects created by the earlier repo migrations without losing
-- counters. PostgreSQL keeps the primary key, indexes and check expressions
-- attached when a column is renamed.
do $$
begin
  if exists (
       select 1
       from information_schema.columns
       where table_schema = 'private'
         and table_name = 'print_request_rate_limits'
         and column_name = 'client_hash'
     )
     and not exists (
       select 1
       from information_schema.columns
       where table_schema = 'private'
         and table_name = 'print_request_rate_limits'
         and column_name = 'ip_hash'
     )
  then
    alter table private.print_request_rate_limits
      rename column client_hash to ip_hash;
  end if;

  if exists (
       select 1
       from information_schema.columns
       where table_schema = 'private'
         and table_name = 'print_request_rate_limits'
         and column_name = 'window_start'
     )
     and not exists (
       select 1
       from information_schema.columns
       where table_schema = 'private'
         and table_name = 'print_request_rate_limits'
         and column_name = 'window_started_at'
     )
  then
    alter table private.print_request_rate_limits
      rename column window_start to window_started_at;
  end if;
end;
$$;

alter table private.print_request_rate_limits
  add column if not exists window_started_at timestamptz not null default now();

alter table private.print_request_rate_limits
  add column if not exists updated_at timestamptz not null default now();

-- Fail loudly instead of leaving a broken RPC if the ledger uses an
-- unexpected column name.
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'private'
      and table_name = 'print_request_rate_limits'
      and column_name = 'ip_hash'
  ) then
    raise exception
      'private.print_request_rate_limits must expose an ip_hash column';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'private'
      and table_name = 'print_request_rate_limits'
      and column_name = 'window_started_at'
  ) then
    raise exception
      'private.print_request_rate_limits must expose a window_started_at column';
  end if;
end;
$$;

alter table private.print_request_rate_limits enable row level security;

revoke all on private.print_request_rate_limits from public;
revoke all on private.print_request_rate_limits from anon;
revoke all on private.print_request_rate_limits from authenticated;
grant select, insert, update, delete on private.print_request_rate_limits to service_role;

-- Drop every overload by catalog lookup. Dropping only
-- (text, integer, integer) can leave a stale signature in place.
do $$
declare
  fn record;
begin
  for fn in
    select n.nspname as schema_name,
           p.proname as function_name,
           pg_get_function_identity_arguments(p.oid) as identity_arguments
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'consume_print_request_rate_limit'
  loop
    execute format(
      'drop function %I.%I(%s)',
      fn.schema_name,
      fn.function_name,
      fn.identity_arguments
    );
  end loop;
end;
$$;

create function public.consume_print_request_rate_limit(
  p_ip_hash text,
  p_max_requests integer default 3,
  p_window_seconds integer default 900
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_window_started_at timestamptz;
  v_count integer;
  v_retry integer;
begin
  if p_ip_hash is null or char_length(p_ip_hash) < 16 then
    return query select false, 0, p_window_seconds;
    return;
  end if;

  if p_max_requests is null or p_max_requests < 1 then
    p_max_requests := 1;
  end if;

  if p_window_seconds is null or p_window_seconds < 1 then
    p_window_seconds := 900;
  end if;

  insert into private.print_request_rate_limits as limits
    (ip_hash, window_started_at, request_count, updated_at)
  values (p_ip_hash, v_now, 0, v_now)
  on conflict (ip_hash) do nothing;

  select limits.window_started_at, limits.request_count
    into v_window_started_at, v_count
  from private.print_request_rate_limits as limits
  where limits.ip_hash = p_ip_hash
  for update;

  if v_window_started_at is null
     or v_now - v_window_started_at >= make_interval(secs => p_window_seconds) then
    update private.print_request_rate_limits
      set window_started_at = v_now,
          request_count = 1,
          updated_at = v_now
      where ip_hash = p_ip_hash;

    return query select true, greatest(p_max_requests - 1, 0), 0;
    return;
  end if;

  v_retry := ceil(
    extract(epoch from (
      v_window_started_at + make_interval(secs => p_window_seconds) - v_now
    ))
  )::integer;

  if v_count >= p_max_requests then
    return query select false, 0, greatest(v_retry, 1);
    return;
  end if;

  update private.print_request_rate_limits
    set request_count = request_count + 1,
        updated_at = v_now
    where ip_hash = p_ip_hash;

  return query select true, greatest(p_max_requests - (v_count + 1), 0), 0;
end;
$$;

revoke all on function public.consume_print_request_rate_limit(text, integer, integer)
  from public;
revoke all on function public.consume_print_request_rate_limit(text, integer, integer)
  from anon;
revoke all on function public.consume_print_request_rate_limit(text, integer, integer)
  from authenticated;
grant execute on function public.consume_print_request_rate_limit(text, integer, integer)
  to service_role;

comment on table private.print_request_rate_limits is
  'HMAC-keyed sliding-window counters. No raw IP addresses are stored.';

-- Make the new function body and columns visible to PostgREST immediately.
notify pgrst, 'reload schema';
