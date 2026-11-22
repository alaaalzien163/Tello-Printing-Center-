-- ===========================================================================
-- Tello Printing Center — read-only Production RLS and database diagnostics
--
-- Run as a project owner in the Supabase SQL Editor (or psql with a read-only
-- role). Every statement is a SELECT. The behavior blocks at the end only
-- change session-local role/claims and always end in ROLLBACK.
--
-- This file is evidence collection only. It does not prove that the migrations
-- match Production; the output does.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. RLS enabled / forced flags
-- ---------------------------------------------------------------------------
select n.nspname as schema_name,
       c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'private')
  and c.relkind = 'r'
order by 1, 2;

-- ---------------------------------------------------------------------------
-- 2. All policies and their expressions
-- ---------------------------------------------------------------------------
select schemaname,
       tablename,
       policyname,
       roles,
       cmd,
       qual,
       with_check
from pg_policies
where schemaname in ('public', 'private')
order by schemaname, tablename, policyname;

-- ---------------------------------------------------------------------------
-- 3. Table grants for anon, authenticated and service_role
-- ---------------------------------------------------------------------------
select table_schema,
       table_name,
       grantee,
       string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema in ('public', 'private')
  and grantee in ('anon', 'authenticated', 'service_role')
group by 1, 2, 3
order by 1, 2, 3;

-- Column-level grants, if any (row policies do not protect columns that were
-- never granted, and a column grant can widen a table grant).
select table_schema,
       table_name,
       column_name,
       grantee,
       privilege_type
from information_schema.column_privileges
where table_schema in ('public', 'private')
  and grantee in ('anon', 'authenticated', 'service_role')
order by 1, 2, 3, 4;

-- ---------------------------------------------------------------------------
-- 4. Function metadata, overloads, attributes and execute grants
-- ---------------------------------------------------------------------------
select n.nspname as schema_name,
       p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_function_result(p.oid) as result,
       p.prosecdef as security_definer,
       p.proconfig as function_settings,
       p.proacl as acl,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'consume_print_request_rate_limit',
    'is_admin',
    'touch_print_request_updated_at'
  )
order by 1, 2, 3;

-- Overload count: expect exactly one signature per function name.
select n.nspname as schema_name,
       p.proname as function_name,
       count(*) as overload_count
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'consume_print_request_rate_limit',
    'is_admin',
    'touch_print_request_updated_at'
  )
group by 1, 2
order by 1, 2;

select has_function_privilege(
         'anon',
         'public.consume_print_request_rate_limit(text,integer,integer)',
         'EXECUTE'
       ) as anon_execute,
       has_function_privilege(
         'authenticated',
         'public.consume_print_request_rate_limit(text,integer,integer)',
         'EXECUTE'
       ) as authenticated_execute,
       has_function_privilege(
         'service_role',
         'public.consume_print_request_rate_limit(text,integer,integer)',
         'EXECUTE'
       ) as service_role_execute;

-- ---------------------------------------------------------------------------
-- 5. Private rate-limit ledger: columns, constraints, indexes, grants
-- ---------------------------------------------------------------------------
select column_name,
       data_type,
       is_nullable,
       column_default
from information_schema.columns
where table_schema = 'private'
  and table_name = 'print_request_rate_limits'
order by ordinal_position;

select conname,
       contype,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'private.print_request_rate_limits'::regclass
order by conname;

select indexname, indexdef
from pg_indexes
where schemaname = 'private'
  and tablename = 'print_request_rate_limits';

select has_table_privilege('anon',
         'private.print_request_rate_limits', 'SELECT') as anon_select,
       has_table_privilege('authenticated',
         'private.print_request_rate_limits', 'SELECT') as authenticated_select,
       has_table_privilege('service_role',
         'private.print_request_rate_limits', 'SELECT') as service_role_select,
       has_table_privilege('anon',
         'private.print_request_rate_limits', 'INSERT') as anon_insert,
       has_table_privilege('authenticated',
         'private.print_request_rate_limits', 'INSERT') as authenticated_insert,
       has_table_privilege('service_role',
         'private.print_request_rate_limits', 'INSERT') as service_role_insert;

-- ---------------------------------------------------------------------------
-- 6. Print-request and admin tables: columns, constraints, indexes, triggers
-- ---------------------------------------------------------------------------
select table_name,
       column_name,
       data_type,
       is_nullable,
       column_default,
       is_identity,
       identity_generation
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'print_requests',
    'print_request_files',
    'admin_users',
    'profiles'
  )
order by table_name, ordinal_position;

select conrelid::regclass as table_name,
       conname,
       contype,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in (
  'public.print_requests'::regclass,
  'public.print_request_files'::regclass,
  'public.admin_users'::regclass,
  'public.profiles'::regclass
)
order by 1, 2;

select schemaname,
       tablename,
       indexname,
       indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'print_requests',
    'print_request_files',
    'admin_users',
    'profiles'
  )
order by 2, 3;

select tgrelid::regclass as table_name,
       tgname,
       pg_get_triggerdef(oid) as definition
from pg_trigger
where not tgisinternal
  and tgrelid in (
    'public.print_requests'::regclass,
    'public.print_request_files'::regclass,
    'public.profiles'::regclass
  )
order by 1, 2;

-- Foreign-key delete behavior (needed for the E2E cleanup dry run).
select conrelid::regclass as child_table,
       confrelid::regclass as parent_table,
       conname,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where contype = 'f'
  and conrelid in (
    'public.print_requests'::regclass,
    'public.print_request_files'::regclass,
    'public.admin_users'::regclass,
    'public.profiles'::regclass
  )
order by 1, 3;

-- ---------------------------------------------------------------------------
-- 7. Storage buckets and Storage object policies
-- ---------------------------------------------------------------------------
select id,
       name,
       public,
       file_size_limit,
       allowed_mime_types
from storage.buckets
where id in ('catalog-images', 'print-request-files');

select policyname,
       cmd,
       roles,
       qual,
       with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname;

select bucket_id,
       count(*) as object_count,
       pg_size_pretty(
         coalesce(sum((metadata->>'size')::bigint), 0)
       ) as total_size
from storage.objects
where bucket_id in ('catalog-images', 'print-request-files')
group by bucket_id;

-- ---------------------------------------------------------------------------
-- 8. Data integrity and orphan checks
-- ---------------------------------------------------------------------------
select count(*) as total_requests,
       count(*) filter (where request_number is null) as request_number_null,
       count(*) filter (where client_token is null) as client_token_null,
       count(*) filter (where client_hash is null) as client_hash_null,
       count(*) filter (where file_count is null) as file_count_null,
       count(*) filter (where total_bytes is null) as total_bytes_null,
       count(*) filter (
         where status not in (
           'uploading', 'pending', 'reviewing', 'quoted',
           'approved', 'completed', 'rejected', 'cancelled'
         )
       ) as invalid_status
from public.print_requests;

select count(distinct request_number) as distinct_request_numbers,
       count(distinct client_token) as distinct_client_tokens,
       count(*) as total_requests
from public.print_requests;

select count(*) as total_files,
       count(*) filter (where storage_path is null) as storage_path_null,
       count(*) filter (where request_id is null) as request_id_null,
       count(*) filter (where size_bytes is null) as size_bytes_null,
       count(*) filter (where size_bytes <= 0) as nonpositive_size,
       count(*) filter (
         where upload_status not in ('pending', 'uploaded', 'failed')
       ) as invalid_upload_status
from public.print_request_files;

select count(*) as orphan_files
from public.print_request_files f
left join public.print_requests r on r.id = f.request_id
where r.id is null;

select count(*) as abandoned_uploading
from public.print_requests
where status = 'uploading'
  and created_at < now() - interval '24 hours';

-- E2E cleanup manifest: non-sensitive identifiers only. Do not select phone,
-- details or admin_notes. Storage paths are included for object mapping.
select r.request_number,
       r.id as request_id,
       r.status,
       r.created_at,
       r.file_count,
       r.total_bytes,
       f.id as file_id,
       f.storage_path,
       f.upload_status,
       f.size_bytes
from public.print_requests r
left join public.print_request_files f on f.request_id = r.id
where r.customer_name like 'E2E%'
order by r.created_at, r.request_number, f.id;

select r.request_number,
       r.id as request_id,
       o.name as storage_object
from public.print_requests r
join storage.objects o
  on o.bucket_id = 'print-request-files'
 and o.name like 'requests/' || r.id::text || '/%'
where r.customer_name like 'E2E%'
order by r.request_number, o.name;

-- ---------------------------------------------------------------------------
-- 9. Active-only catalog policy definitions
-- ---------------------------------------------------------------------------
select tablename,
       policyname,
       cmd,
       roles,
       qual
from pg_policies
where schemaname = 'public'
  and tablename in ('categories', 'products', 'product_variants')
order by tablename, policyname;

-- Expected public read qual: `is_active OR public.is_admin()`.
-- Also confirm no inactive rows are visible to anon (currently inconclusive
-- when all rows are active).
select 'categories' as table_name,
       count(*) filter (where is_active) as active_rows,
       count(*) filter (where not is_active) as inactive_rows
from public.categories
union all
select 'products', count(*) filter (where is_active), count(*) filter (where not is_active)
from public.products
union all
select 'product_variants', count(*) filter (where is_active), count(*) filter (where not is_active)
from public.product_variants;

-- ---------------------------------------------------------------------------
-- 10. RLS behavior checks (session-local; always rolled back)
-- ---------------------------------------------------------------------------

-- Non-admin authenticated user: expect zero visible requests and files,
-- and is_admin() = false.
begin;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '00000000-0000-0000-0000-000000000000',
    'role', 'authenticated'
  )::text,
  true
);
set local role authenticated;

select count(*) as visible_print_requests from public.print_requests;
select count(*) as visible_print_request_files from public.print_request_files;
select count(*) as visible_admin_users from public.admin_users;
select public.is_admin() as is_admin;

rollback;

-- Real admin user: replace the UUID privately in the SQL editor only.
-- Expect visible requests, is_admin() = true. Do not share the UUID.
begin;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '<REAL_ADMIN_UUID>',
    'role', 'authenticated'
  )::text,
  true
);
set local role authenticated;

select count(*) as visible_print_requests from public.print_requests;
select public.is_admin() as is_admin;

rollback;

-- Anonymous storage visibility: expect zero private-bucket objects.
begin;
set local role anon;

select count(*) as anon_private_objects
from storage.objects
where bucket_id = 'print-request-files';

select count(*) as anon_catalog_objects
from storage.objects
where bucket_id = 'catalog-images';

rollback;

-- If `set local role anon` is denied by the SQL editor, verify the same rows
-- through PostgREST with the publishable key and expect 0 / permission denied.

-- ---------------------------------------------------------------------------
-- 11. Security Advisor
-- ---------------------------------------------------------------------------
-- Dashboard -> Advisors -> Security. At minimum resolve:
--   * RLS disabled on a public table
--   * table with RLS enabled but no policy
--   * SECURITY DEFINER function with a mutable search_path
--   * publicly executable privileged function
--   * leaked-password protection disabled
--   * public signup / CAPTCHA configuration if signup stays enabled
