"use server";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AdminCatalog,
  AdminCategoryInput,
  AdminProduct,
  AdminProductInput,
  AdminProductVariant,
  AdminVariantInput,
} from "@/domain/admin-catalog";
import type { Category } from "@/domain/category";
import { verifyAdminClient } from "@/lib/auth/admin";
import { revalidatePublicCatalog } from "@/lib/catalog-revalidation";
import {
  CATEGORY_COLUMNS,
  mapCategoryRow,
  mapProductRow,
  mapVariantRow,
  PRODUCT_COLUMNS,
  VARIANT_COLUMNS,
  type CategoryRow,
  type ProductRow,
  type VariantRow,
} from "@/lib/supabase/catalog-mapping";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  isImagePathFor,
  STORAGE_BUCKET,
} from "@/lib/storage/image-upload";

export type AdminCatalogErrorCode =
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "SLUG_TAKEN"
  | "SKU_TAKEN"
  | "CATEGORY_NOT_FOUND"
  | "CATEGORY_HAS_PRODUCTS"
  | "INVALID_INPUT"
  | "STORAGE_ERROR"
  | "UNKNOWN";

export type AdminActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AdminCatalogErrorCode };

type ClientResult =
  | { ok: true; supabase: SupabaseClient }
  | { ok: false; error: AdminCatalogErrorCode };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail(code: AdminCatalogErrorCode): { ok: false; error: AdminCatalogErrorCode } {
  return { ok: false, error: code };
}

/** Successful writes invalidate the cached public storefront. */
function ok<T>(data: T): AdminActionResult<T> {
  revalidatePublicCatalog();
  return { ok: true, data };
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function mapDatabaseError(error: { code?: string; message?: string }): AdminCatalogErrorCode {
  if (error.code === "23505") {
    return /sku/i.test(error.message ?? "") ? "SKU_TAKEN" : "SLUG_TAKEN";
  }
  if (error.code === "23503") return "CATEGORY_NOT_FOUND";
  return "UNKNOWN";
}

async function authorizedClient(): Promise<ClientResult> {
  let supabase: SupabaseClient;

  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return fail("UNAUTHORIZED");
  }

  try {
    const access = await verifyAdminClient(supabase);
    if (access.status !== "authorized") return fail("UNAUTHORIZED");
  } catch {
    return fail("UNAUTHORIZED");
  }

  return { ok: true, supabase };
}

function validateProductInput(input: AdminProductInput): boolean {
  return (
    input.name.en.trim().length >= 2 &&
    input.name.ar.trim().length >= 2 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) &&
    isUuid(input.categoryId) &&
    Number.isFinite(input.price) &&
    input.price > 0 &&
    ["USD", "SAR", "AED", "EUR"].includes(input.currency)
  );
}

function validateVariantInput(input: AdminVariantInput): boolean {
  return (
    input.sizeLabel.en.trim().length > 0 &&
    input.sizeLabel.ar.trim().length > 0 &&
    Number.isFinite(input.price) &&
    input.price > 0 &&
    input.sku.trim().length > 0
  );
}

function validateCategoryInput(input: AdminCategoryInput): boolean {
  return (
    input.name.en.trim().length >= 2 &&
    input.name.ar.trim().length >= 2 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)
  );
}

function productRow(input: AdminProductInput) {
  return {
    name_en: input.name.en.trim(),
    name_ar: input.name.ar.trim(),
    slug: input.slug.trim().toLowerCase(),
    category_id: input.categoryId,
    base_price: input.price,
    currency_code: input.currency,
    description_en: input.description.en.trim(),
    description_ar: input.description.ar.trim(),
    is_active: input.active,
    is_featured: input.featured,
  };
}

function variantRow(productId: string, input: AdminVariantInput) {
  return {
    product_id: productId,
    size_label_en: input.sizeLabel.en.trim(),
    size_label_ar: input.sizeLabel.ar.trim(),
    price: input.price,
    sku: input.sku.trim().toUpperCase(),
    is_active: input.active,
    sort_order: input.sortOrder ?? 0,
  };
}

function categoryRow(input: AdminCategoryInput) {
  return {
    name_en: input.name.en.trim(),
    name_ar: input.name.ar.trim(),
    slug: input.slug.trim().toLowerCase(),
    description_en: input.description.en.trim(),
    description_ar: input.description.ar.trim(),
    is_active: input.active,
  };
}

async function removeStorageObjects(
  supabase: SupabaseClient,
  paths: Array<string | null | undefined>,
): Promise<void> {
  const unique = Array.from(
    new Set(paths.filter((path): path is string => Boolean(path))),
  );
  if (unique.length === 0) return;

  for (let index = 0; index < unique.length; index += 100) {
    const chunk = unique.slice(index, index + 100);
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(chunk);
    if (error) {
      console.error(`Storage cleanup failed (${error.name ?? "unknown"}).`);
    }
  }
}

async function listFolder(
  supabase: SupabaseClient,
  folder: string,
): Promise<string[]> {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(folder);
  if (error) return [];
  return (data ?? []).map((entry) => `${folder}/${entry.name}`);
}

async function pathIsReferenced(supabase: SupabaseClient, path: string): Promise<boolean> {
  const [products, variants] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("image_path", path),
    supabase
      .from("product_variants")
      .select("id", { count: "exact", head: true })
      .eq("image_path", path),
  ]);

  return (products.count ?? 0) > 0 || (variants.count ?? 0) > 0;
}

async function removeIfUnreferenced(
  supabase: SupabaseClient,
  path: string | null,
): Promise<void> {
  if (!path) return;
  if (await pathIsReferenced(supabase, path)) return;
  await removeStorageObjects(supabase, [path]);
}

/**
 * Removes the given objects only when no remaining product or variant points at
 * them. Used after a product delete, where a manually shared path must survive.
 */
async function removeUnreferencedPaths(
  supabase: SupabaseClient,
  paths: Array<string | null | undefined>,
): Promise<void> {
  const unique = Array.from(
    new Set(paths.filter((path): path is string => Boolean(path))),
  );
  if (unique.length === 0) return;

  const [products, variants] = await Promise.all([
    supabase.from("products").select("image_path").in("image_path", unique),
    supabase.from("product_variants").select("image_path").in("image_path", unique),
  ]);

  const referenced = new Set<string>();
  for (const row of [...(products.data ?? []), ...(variants.data ?? [])]) {
    const path = (row as { image_path: string | null }).image_path;
    if (path) referenced.add(path);
  }

  await removeStorageObjects(
    supabase,
    unique.filter((path) => !referenced.has(path)),
  );
}

export async function loadAdminCatalog(): Promise<AdminActionResult<AdminCatalog>> {
  const client = await authorizedClient();
  if (!client.ok) return client;

  const { supabase } = client;
  const [categories, products, variants] = await Promise.all([
    supabase
      .from("categories")
      .select(CATEGORY_COLUMNS)
      .order("sort_order", { ascending: true })
      .order("name_en", { ascending: true }),
    supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .order("updated_at", { ascending: false }),
    supabase
      .from("product_variants")
      .select(VARIANT_COLUMNS)
      .order("sort_order", { ascending: true }),
  ]);

  if (categories.error || products.error || variants.error) {
    return fail("UNKNOWN");
  }

  const variantsByProduct = new Map<string, VariantRow[]>();
  for (const variant of (variants.data ?? []) as VariantRow[]) {
    const list = variantsByProduct.get(variant.product_id) ?? [];
    list.push(variant);
    variantsByProduct.set(variant.product_id, list);
  }

  return {
    ok: true,
    data: {
      categories: ((categories.data ?? []) as CategoryRow[]).map(mapCategoryRow),
      products: ((products.data ?? []) as ProductRow[]).map((row) =>
        mapProductRow(row, variantsByProduct.get(row.id) ?? []),
      ),
    },
  };
}

export async function createAdminProduct(
  input: AdminProductInput,
): Promise<AdminActionResult<AdminProduct>> {
  if (!validateProductInput(input)) return fail("INVALID_INPUT");

  const client = await authorizedClient();
  if (!client.ok) return client;

  const { data, error } = await client.supabase
    .from("products")
    .insert(productRow(input))
    .select(PRODUCT_COLUMNS)
    .single();

  if (error) return fail(mapDatabaseError(error));

  return ok(mapProductRow(data as ProductRow, []));
}

export async function updateAdminProduct(
  productId: string,
  input: AdminProductInput,
): Promise<AdminActionResult<AdminProduct>> {
  if (!isUuid(productId) || !validateProductInput(input)) return fail("INVALID_INPUT");

  const client = await authorizedClient();
  if (!client.ok) return client;

  const { data: current, error: lookupError } = await client.supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();

  if (lookupError) return fail("UNKNOWN");
  if (!current) return fail("NOT_FOUND");

  const { data, error } = await client.supabase
    .from("products")
    .update({ ...productRow(input), updated_at: new Date().toISOString() })
    .eq("id", productId)
    .select(PRODUCT_COLUMNS)
    .single();

  if (error) return fail(mapDatabaseError(error));

  const { data: variantRows } = await client.supabase
    .from("product_variants")
    .select(VARIANT_COLUMNS)
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  return ok(
    mapProductRow(data as ProductRow, (variantRows ?? []) as VariantRow[]),
  );
}

export async function setAdminProductActive(
  productId: string,
  active: boolean,
): Promise<AdminActionResult<null>> {
  return updateProductFlag(productId, { is_active: active });
}

export async function setAdminProductFeatured(
  productId: string,
  featured: boolean,
): Promise<AdminActionResult<null>> {
  return updateProductFlag(productId, { is_featured: featured });
}

async function updateProductFlag(
  productId: string,
  patch: Record<string, boolean>,
): Promise<AdminActionResult<null>> {
  if (!isUuid(productId)) return fail("INVALID_INPUT");

  const client = await authorizedClient();
  if (!client.ok) return client;

  const { error, count } = await client.supabase
    .from("products")
    .update({ ...patch, updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", productId);

  if (error) return fail(mapDatabaseError(error));
  if (count === 0) return fail("NOT_FOUND");
  return ok(null);
}

export async function deleteAdminProduct(
  productId: string,
): Promise<AdminActionResult<null>> {
  if (!isUuid(productId)) return fail("INVALID_INPUT");

  const client = await authorizedClient();
  if (!client.ok) return client;

  const { data: variants } = await client.supabase
    .from("product_variants")
    .select("id,image_path")
    .eq("product_id", productId);
  const { data: product } = await client.supabase
    .from("products")
    .select("image_path")
    .eq("id", productId)
    .maybeSingle();

  if (!product) return fail("NOT_FOUND");

  const { error } = await client.supabase.from("products").delete().eq("id", productId);
  if (error) return fail(mapDatabaseError(error));

  const variantRows = (variants ?? []) as Array<{ id: string; image_path: string | null }>;
  const folderPaths = await Promise.all([
    listFolder(client.supabase, `products/${productId}`),
    ...variantRows.map((variant) => listFolder(client.supabase, `variants/${variant.id}`)),
  ]);

  await removeUnreferencedPaths(client.supabase, [
    product.image_path,
    ...variantRows.map((variant) => variant.image_path),
    ...folderPaths.flat(),
  ]);

  return ok(null);
}

export async function saveAdminVariant(
  productId: string,
  input: AdminVariantInput,
): Promise<AdminActionResult<AdminProductVariant>> {
  if (!isUuid(productId) || !validateVariantInput(input)) return fail("INVALID_INPUT");
  if (input.id && !isUuid(input.id)) return fail("INVALID_INPUT");

  const client = await authorizedClient();
  if (!client.ok) return client;

  if (input.id) {
    const { data, error } = await client.supabase
      .from("product_variants")
      .update({ ...variantRow(productId, input), updated_at: new Date().toISOString() })
      .eq("id", input.id)
      .eq("product_id", productId)
      .select(VARIANT_COLUMNS)
      .single();

    if (error) return fail(mapDatabaseError(error));
    return ok(mapVariantRow(data as VariantRow));
  }

  const { data, error } = await client.supabase
    .from("product_variants")
    .insert(variantRow(productId, input))
    .select(VARIANT_COLUMNS)
    .single();

  if (error) return fail(mapDatabaseError(error));
  return ok(mapVariantRow(data as VariantRow));
}

export async function deleteAdminVariant(
  variantId: string,
): Promise<AdminActionResult<null>> {
  if (!isUuid(variantId)) return fail("INVALID_INPUT");

  const client = await authorizedClient();
  if (!client.ok) return client;

  const { data: variant } = await client.supabase
    .from("product_variants")
    .select("image_path")
    .eq("id", variantId)
    .maybeSingle();

  if (!variant) return fail("NOT_FOUND");

  const { error } = await client.supabase
    .from("product_variants")
    .delete()
    .eq("id", variantId);

  if (error) return fail(mapDatabaseError(error));

  await removeIfUnreferenced(client.supabase, variant.image_path);
  return ok(null);
}

export async function finalizeProductImage(
  productId: string,
  imagePath: string | null,
): Promise<AdminActionResult<null>> {
  return finalizeImage("product", productId, imagePath);
}

export async function finalizeVariantImage(
  variantId: string,
  imagePath: string | null,
): Promise<AdminActionResult<null>> {
  return finalizeImage("variant", variantId, imagePath);
}

async function finalizeImage(
  kind: "product" | "variant",
  recordId: string,
  imagePath: string | null,
): Promise<AdminActionResult<null>> {
  if (!isUuid(recordId)) return fail("INVALID_INPUT");
  if (imagePath && !isImagePathFor(kind, recordId, imagePath)) {
    return fail("INVALID_INPUT");
  }

  const client = await authorizedClient();
  if (!client.ok) return client;

  const table = kind === "product" ? "products" : "product_variants";
  const { data: current, error: lookupError } = await client.supabase
    .from(table)
    .select("image_path")
    .eq("id", recordId)
    .maybeSingle();

  if (lookupError) return fail("UNKNOWN");
  if (!current) return fail("NOT_FOUND");

  const previousPath = current.image_path as string | null;

  const { error } = await client.supabase
    .from(table)
    .update({ image_path: imagePath, updated_at: new Date().toISOString() })
    .eq("id", recordId);

  if (error) {
    // The record still points at the old image; remove the newly uploaded
    // object when possible so the failure does not leave an orphan.
    if (imagePath && imagePath !== previousPath) {
      await removeIfUnreferenced(client.supabase, imagePath);
    }
    return fail(mapDatabaseError(error));
  }

  if (previousPath && previousPath !== imagePath) {
    await removeIfUnreferenced(client.supabase, previousPath);
  }

  return ok(null);
}

export async function createAdminCategory(
  input: AdminCategoryInput,
): Promise<AdminActionResult<Category>> {
  if (!validateCategoryInput(input)) return fail("INVALID_INPUT");

  const client = await authorizedClient();
  if (!client.ok) return client;

  const { data, error } = await client.supabase
    .from("categories")
    .insert(categoryRow(input))
    .select(CATEGORY_COLUMNS)
    .single();

  if (error) return fail(mapDatabaseError(error));
  return ok(mapCategoryRow(data as CategoryRow));
}

export async function updateAdminCategory(
  categoryId: string,
  input: AdminCategoryInput,
): Promise<AdminActionResult<Category>> {
  if (!isUuid(categoryId) || !validateCategoryInput(input)) return fail("INVALID_INPUT");

  const client = await authorizedClient();
  if (!client.ok) return client;

  const { data, error } = await client.supabase
    .from("categories")
    .update({ ...categoryRow(input), updated_at: new Date().toISOString() })
    .eq("id", categoryId)
    .select(CATEGORY_COLUMNS)
    .single();

  if (error) return fail(mapDatabaseError(error));
  return ok(mapCategoryRow(data as CategoryRow));
}

export async function setAdminCategoryActive(
  categoryId: string,
  active: boolean,
): Promise<AdminActionResult<null>> {
  if (!isUuid(categoryId)) return fail("INVALID_INPUT");

  const client = await authorizedClient();
  if (!client.ok) return client;

  const { error, count } = await client.supabase
    .from("categories")
    .update({ is_active: active, updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", categoryId);

  if (error) return fail(mapDatabaseError(error));
  if (count === 0) return fail("NOT_FOUND");
  return ok(null);
}

export async function deleteAdminCategory(
  categoryId: string,
): Promise<AdminActionResult<null>> {
  if (!isUuid(categoryId)) return fail("INVALID_INPUT");

  const client = await authorizedClient();
  if (!client.ok) return client;

  const { count } = await client.supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);

  if ((count ?? 0) > 0) return fail("CATEGORY_HAS_PRODUCTS");

  const { error, count: deleted } = await client.supabase
    .from("categories")
    .delete({ count: "exact" })
    .eq("id", categoryId);

  if (error) return fail(mapDatabaseError(error));
  if (deleted === 0) return fail("NOT_FOUND");
  return ok(null);
}
