import { seedCategories } from "@/data/seed/categories";
import { seedProducts } from "@/data/seed/products";
import type { Category } from "@/domain/category";
import type { Product } from "@/domain/product";
import { sortProductsForDisplay } from "@/services/catalog";

export interface PublicCatalog {
  categories: Category[];
  products: Product[];
}

function buildCatalog(): PublicCatalog {
  const categories = seedCategories.filter((category) => category.active);
  const activeCategoryIds = new Set(categories.map((category) => category.id));
  const products = sortProductsForDisplay(
    seedProducts.filter((product) => product.active && activeCategoryIds.has(product.categoryId)),
  );

  return { categories, products };
}

/**
 * Read-only catalog for public server components.
 * Phase 2: swap these functions to Supabase queries scoped by RLS. The return
 * shape stays the same, so public UI components do not need to change.
 */
export async function getPublicCatalog(): Promise<PublicCatalog> {
  return buildCatalog();
}

export async function getPublicProductBySlug(slug: string): Promise<Product | null> {
  return buildCatalog().products.find((product) => product.slug === slug) ?? null;
}

export async function getPublicProductSlugs(): Promise<string[]> {
  return buildCatalog().products.map((product) => product.slug);
}

export async function getPublicCategoryBySlug(slug: string): Promise<Category | null> {
  return buildCatalog().categories.find((category) => category.slug === slug) ?? null;
}
