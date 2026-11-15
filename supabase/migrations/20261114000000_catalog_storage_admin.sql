-- Catalog administrator access and Supabase Storage policies.
--
-- Apply this migration with the Supabase CLI (`supabase db push`) or by
-- pasting it into the SQL editor as a project owner. It is idempotent: the
-- named policies are replaced when it is re-run.
--
-- Public readers can select active catalog rows and read objects in the
-- public `catalog-images` bucket. Members of `public.admin_users` can manage
-- every catalog row and every object in that bucket. Uploads, updates and
-- deletes are rejected for anonymous and non-admin sessions.
--
-- Review any pre-existing permissive policies on these tables or on
-- `storage.objects` before applying: PostgreSQL policies are additive, so a
-- legacy `using (true)` write policy would still grant access.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.admin_users to authenticated;
grant select on public.categories, public.products, public.product_variants
  to anon, authenticated;
grant insert, update, delete on public.categories, public.products, public.product_variants
  to authenticated;

-- The server-side admin check reads the signed-in user's own membership row.
drop policy if exists "admin_users_read_self" on public.admin_users;
create policy "admin_users_read_self"
  on public.admin_users
  for select
  to authenticated
  using (user_id = auth.uid());

-- Public catalog reads are limited to active rows. Administrators can read
-- inactive rows too, which keeps the dashboard complete.
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read"
  on public.categories
  for select
  to anon, authenticated
  using (is_active or public.is_admin());

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read"
  on public.products
  for select
  to anon, authenticated
  using (is_active or public.is_admin());

drop policy if exists "product_variants_public_read" on public.product_variants;
create policy "product_variants_public_read"
  on public.product_variants
  for select
  to anon, authenticated
  using (is_active or public.is_admin());

-- Administrator writes. `is_admin()` is security definer so these policies
-- do not recurse through the admin_users policy above.
drop policy if exists "categories_admin_insert" on public.categories;
create policy "categories_admin_insert"
  on public.categories
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "categories_admin_update" on public.categories;
create policy "categories_admin_update"
  on public.categories
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "categories_admin_delete" on public.categories;
create policy "categories_admin_delete"
  on public.categories
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "products_admin_insert" on public.products;
create policy "products_admin_insert"
  on public.products
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "products_admin_update" on public.products;
create policy "products_admin_update"
  on public.products
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "products_admin_delete" on public.products;
create policy "products_admin_delete"
  on public.products
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "product_variants_admin_insert" on public.product_variants;
create policy "product_variants_admin_insert"
  on public.product_variants
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "product_variants_admin_update" on public.product_variants;
create policy "product_variants_admin_update"
  on public.product_variants
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "product_variants_admin_delete" on public.product_variants;
create policy "product_variants_admin_delete"
  on public.product_variants
  for delete
  to authenticated
  using (public.is_admin());

-- Storage: anyone may read public catalog images, but only administrators may
-- upload, replace or delete them. Paths must stay inside products/ or variants/.
drop policy if exists "catalog_images_public_read" on storage.objects;
create policy "catalog_images_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'catalog-images');

drop policy if exists "catalog_images_admin_insert" on storage.objects;
create policy "catalog_images_admin_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'catalog-images'
    and public.is_admin()
    and (storage.foldername(name))[1] in ('products', 'variants')
  );

drop policy if exists "catalog_images_admin_update" on storage.objects;
create policy "catalog_images_admin_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'catalog-images'
    and public.is_admin()
    and (storage.foldername(name))[1] in ('products', 'variants')
  )
  with check (
    bucket_id = 'catalog-images'
    and public.is_admin()
    and (storage.foldername(name))[1] in ('products', 'variants')
  );

drop policy if exists "catalog_images_admin_delete" on storage.objects;
create policy "catalog_images_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'catalog-images'
    and public.is_admin()
    and (storage.foldername(name))[1] in ('products', 'variants')
  );
