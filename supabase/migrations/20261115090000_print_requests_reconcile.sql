-- Reconcile the print request schema with the live Supabase project.
--
-- The live project was created before this repository's migration was written,
-- so its tables use:
--   * a bigint identity `request_number` (starting at 1000),
--   * `original_filename` / `file_extension` / `mime_type` / `upload_status`
--     on `print_request_files`,
--   * `consume_print_request_rate_limit(p_ip_hash, p_max_requests,
--     p_window_seconds)`.
--
-- This migration is additive and idempotent. It never drops customer data or
-- weakens RLS, anonymous restrictions, the private storage bucket or the
-- administrator policies. Apply it with `supabase db push` or the SQL editor.
--
-- The only missing pieces required by the application are the idempotency and
-- aggregate columns below. They are added with safe defaults so existing rows
-- stay valid.

-- ---------------------------------------------------------------------------
-- Request columns used by the public API
-- ---------------------------------------------------------------------------

alter table public.print_requests
  add column if not exists client_token text;

alter table public.print_requests
  add column if not exists client_hash text;

alter table public.print_requests
  add column if not exists file_count integer not null default 0;

alter table public.print_requests
  add column if not exists total_bytes bigint not null default 0;

-- A retry from the same browser reuses the row instead of creating duplicates.
create unique index if not exists print_requests_client_token_key
  on public.print_requests (client_token)
  where client_token is not null;

create index if not exists print_requests_created_at_idx
  on public.print_requests (created_at desc);

create index if not exists print_requests_status_created_at_idx
  on public.print_requests (status, created_at desc);

create index if not exists print_requests_unread_idx
  on public.print_requests (created_at desc)
  where is_read = false;

create index if not exists print_request_files_request_id_idx
  on public.print_request_files (request_id, created_at);

-- The live file table already uses the column names the application queries.
-- No rename, drop or destructive conversion is performed here.

-- ---------------------------------------------------------------------------
-- Timestamp maintenance
-- ---------------------------------------------------------------------------

create or replace function public.touch_print_request_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists print_requests_touch_updated_at on public.print_requests;
create trigger print_requests_touch_updated_at
  before update on public.print_requests
  for each row
  execute function public.touch_print_request_updated_at();

-- ---------------------------------------------------------------------------
-- Private rate-limit ledger and RPC
-- ---------------------------------------------------------------------------

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

-- The live function uses `p_ip_hash` / `p_max_requests`. PostgreSQL does not
-- allow CREATE OR REPLACE to rename input parameters, so drop the previous
-- signature first (same argument types, new names) and recreate it.
drop function if exists public.consume_print_request_rate_limit(text, integer, integer);

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

-- ---------------------------------------------------------------------------
-- Row level security: administrators only
-- ---------------------------------------------------------------------------

alter table public.print_requests enable row level security;
alter table public.print_request_files enable row level security;

revoke all on public.print_requests from anon;
revoke all on public.print_request_files from anon;
revoke all on public.print_requests from authenticated;
revoke all on public.print_request_files from authenticated;

grant select, update, delete on public.print_requests to authenticated;
grant select, update, delete on public.print_request_files to authenticated;
grant select, insert, update, delete on public.print_requests to service_role;
grant select, insert, update, delete on public.print_request_files to service_role;

drop policy if exists "print_requests_admin_read" on public.print_requests;
create policy "print_requests_admin_read"
  on public.print_requests
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "print_requests_admin_update" on public.print_requests;
create policy "print_requests_admin_update"
  on public.print_requests
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "print_requests_admin_delete" on public.print_requests;
create policy "print_requests_admin_delete"
  on public.print_requests
  for delete
  to authenticated
  using (public.is_admin());

-- Deliberately no INSERT policy: the server-only secret key creates rows.

drop policy if exists "print_request_files_admin_read" on public.print_request_files;
create policy "print_request_files_admin_read"
  on public.print_request_files
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "print_request_files_admin_update" on public.print_request_files;
create policy "print_request_files_admin_update"
  on public.print_request_files
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "print_request_files_admin_delete" on public.print_request_files;
create policy "print_request_files_admin_delete"
  on public.print_request_files
  for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Private storage bucket and object policies
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('print-request-files', 'print-request-files', false, 52428800)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit;

drop policy if exists "print_request_files_admin_read" on storage.objects;
create policy "print_request_files_admin_read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'print-request-files'
    and public.is_admin()
    and (storage.foldername(name))[1] = 'requests'
  );

drop policy if exists "print_request_files_admin_delete" on storage.objects;
create policy "print_request_files_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'print-request-files'
    and public.is_admin()
    and (storage.foldername(name))[1] = 'requests'
  );

comment on table public.print_requests is
  'Customer print requests. Anonymous users never access this table directly.';
comment on table public.print_request_files is
  'Attachment metadata for uploaded print request files.';
comment on table private.print_request_rate_limits is
  'HMAC-keyed sliding-window counters. No raw IP addresses are stored.';
