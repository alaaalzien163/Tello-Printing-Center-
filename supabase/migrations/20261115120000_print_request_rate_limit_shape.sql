-- Fix the rate-limit RPC return shape.
--
-- The application consumes a row:
--   (allowed boolean, remaining integer, retry_after_seconds integer)
--
-- Some deployments still expose a legacy boolean-returning overload of
-- `consume_print_request_rate_limit`. PostgreSQL chooses overloads by argument
-- type, so dropping only `(text, integer, integer)` can leave the legacy
-- function in place. Drop every overload by catalog lookup, then create the
-- canonical table-returning function.
--
-- This migration is DDL-only: it does not delete or update request rows,
-- storage objects or rate-limit counters.

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

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to service_role;

create table if not exists private.print_request_rate_limits (
  client_hash text primary key,
  window_start timestamptz not null default now(),
  request_count integer not null default 0,
  constraint print_request_rate_limits_hash_check check (char_length(client_hash) between 16 and 128)
);

alter table private.print_request_rate_limits enable row level security;

revoke all on private.print_request_rate_limits from public;
revoke all on private.print_request_rate_limits from anon;
revoke all on private.print_request_rate_limits from authenticated;
grant select, insert, update, delete on private.print_request_rate_limits to service_role;

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
  v_window_start timestamptz;
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

  insert into private.print_request_rate_limits as limits (client_hash, window_start, request_count)
  values (p_ip_hash, v_now, 0)
  on conflict (client_hash) do nothing;

  select limits.window_start, limits.request_count
    into v_window_start, v_count
  from private.print_request_rate_limits as limits
  where limits.client_hash = p_ip_hash
  for update;

  if v_window_start is null
     or v_now - v_window_start >= make_interval(secs => p_window_seconds) then
    update private.print_request_rate_limits
      set window_start = v_now,
          request_count = 1
      where client_hash = p_ip_hash;

    return query select true, greatest(p_max_requests - 1, 0), 0;
    return;
  end if;

  v_retry := ceil(
    extract(epoch from (
      v_window_start + make_interval(secs => p_window_seconds) - v_now
    ))
  )::integer;

  if v_count >= p_max_requests then
    return query select false, 0, greatest(v_retry, 1);
    return;
  end if;

  update private.print_request_rate_limits
    set request_count = request_count + 1
    where client_hash = p_ip_hash;

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

-- Supabase's PostgREST reloads its schema cache after DDL, but this makes the
-- new return shape visible immediately in projects where the event trigger is
-- delayed.
notify pgrst, 'reload schema';
