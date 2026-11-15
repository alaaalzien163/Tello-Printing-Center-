import { unstable_cache } from "next/cache";

import type { Category } from "@/domain/category";
import type { Product, ProductVariant } from "@/domain/product";
import { PUBLIC_CATALOG_TAG } from "@/lib/catalog-revalidation";
import {
  buildPublicCatalog,
  CATEGORY_COLUMNS,
  PRODUCT_COLUMNS,
  VARIANT_COLUMNS,
  type CategoryRow,
  type ProductRow,
  type PublicCatalogSnapshot,
  type VariantRow,
} from "@/lib/supabase/catalog-mapping";
import { getPublicSupabaseClient } from "@/lib/supabase/public";

export interface PublicCatalog {
  categories: Category[];
  products: Product[];
}

function emptySnapshot(): PublicCatalogSnapshot {
  return { categories: [], products: [], variantsByProduct: {} };
}

async function loadPublicCatalogSnapshot(): Promise<PublicCatalogSnapshot> {
  const supabase = getPublicSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured for public catalog reads.");
  }

  const [categories, products, variants] = await Promise.all([
    supabase
      .from("categories")
      .select(CATEGORY_COLUMNS)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name_en", { ascending: true }),
    supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("is_active", true)
      .order("updated_at", { ascending: false }),
    supabase
      .from("product_variants")
      .select(VARIANT_COLUMNS)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  if (categories.error || products.error || variants.error) {
    const codes = [categories.error?.code, products.error?.code, variants.error?.code]
      .filter(Boolean)
      .join(", ");
    throw new Error(`Public catalog query failed${codes ? ` (${codes})` : ""}.`);
  }

  return buildPublicCatalog(
    (categories.data ?? []) as CategoryRow[],
    (products.data ?? []) as ProductRow[],
    (variants.data ?? []) as VariantRow[],
  );
}

const getCachedSnapshot = unstable_cache(loadPublicCatalogSnapshot, ["public-catalog"], {
  tags: [PUBLIC_CATALOG_TAG],
  revalidate: 60,
});

/**
 * Cached public catalog. Query failures return an empty catalog instead of
 * crashing pages or the production build; the failure is not cached.
 */
async function getSnapshot(): Promise<PublicCatalogSnapshot> {
  try {
    return await getCachedSnapshot();
  } catch (error) {
    console.error(
      "Public catalog is unavailable.",
      error instanceof Error ? error.message : error,
    );
    return emptySnapshot();
  }
}

export async function getPublicCatalog(): Promise<PublicCatalog> {
  const { categories, products } = await getSnapshot();
  return { categories, products };
}

export async function getPublicCategories(): Promise<Category[]> {
  const { categories } = await getSnapshot();
  return categories;
}

export async function getPublicCategoryBySlug(slug: string): Promise<Category | null> {
  const { categories } = await getSnapshot();
  return categories.find((category) => category.slug === slug) ?? null;
}

export async function getPublicCategorySlugs(): Promise<string[]> {
  const { categories } = await getSnapshot();
  return categories.map((category) => category.slug);
}

export async function getPublicProducts(): Promise<Product[]> {
  const { products } = await getSnapshot();
  return products;
}

export async function getPublicProductBySlug(slug: string): Promise<Product | null> {
  const { products } = await getSnapshot();
  return products.find((product) => product.slug === slug) ?? null;
}

export async function getPublicProductSlugs(): Promise<string[]> {
  const { products } = await getSnapshot();
  return products.map((product) => product.slug);
}

/** Products for one category, accepting either its slug or UUID. */
export async function getPublicProductsByCategory(
  categorySlugOrId: string,
): Promise<Product[]> {
  const { categories, products } = await getSnapshot();
  const category = categories.find(
    (item) => item.slug === categorySlugOrId || item.id === categorySlugOrId,
  );

  if (!category) return [];
  return products.filter((product) => product.categoryId === category.id);
}

/**
 * Published variants for a visible product. Inactive products and variants are
 * never exposed, and the returned currency always matches the product.
 */
export async function getPublicProductVariants(
  productId: string,
): Promise<ProductVariant[]> {
  const { products, variantsByProduct } = await getSnapshot();

  if (!products.some((product) => product.id === productId)) return [];
  return variantsByProduct[productId] ?? [];
}
