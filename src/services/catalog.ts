import type { Category } from "@/domain/category";
import type { Product } from "@/domain/product";

export type CategorySort = "name-asc" | "name-desc" | "newest" | "active";

export interface CatalogFilters {
  query?: string;
  categoryId?: string | null;
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase().normalize("NFKD");
}

/** Pure catalog search across both locales, SKU and descriptions. */
export function filterProducts(products: Product[], filters: CatalogFilters = {}): Product[] {
  const query = normalizeSearch(filters.query ?? "");
  const categoryId = filters.categoryId ?? null;

  return products.filter((product) => {
    if (categoryId && product.categoryId !== categoryId) return false;
    if (!query) return true;

    const haystack = [
      product.name.en,
      product.name.ar,
      product.sku,
      product.description.en,
      product.description.ar,
    ]
      .join(" ")
      .toLocaleLowerCase()
      .normalize("NFKD");

    return haystack.includes(query);
  });
}

export function sortProductsForDisplay(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function searchAndSortCategories(
  categories: Category[],
  query: string,
  sort: CategorySort,
  locale: "en" | "ar",
): Category[] {
  const normalized = normalizeSearch(query);
  const filtered = normalized
    ? categories.filter((category) =>
        [category.name.en, category.name.ar, category.slug]
          .join(" ")
          .toLocaleLowerCase()
          .normalize("NFKD")
          .includes(normalized),
      )
    : [...categories];

  return filtered.sort((a, b) => {
    switch (sort) {
      case "name-asc":
        return a.name[locale].localeCompare(b.name[locale], locale);
      case "name-desc":
        return b.name[locale].localeCompare(a.name[locale], locale);
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "active":
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.name[locale].localeCompare(b.name[locale], locale);
      default:
        return 0;
    }
  });
}

export function getCategoryProductCounts(products: Product[]): Record<string, number> {
  return products.reduce<Record<string, number>>((counts, product) => {
    counts[product.categoryId] = (counts[product.categoryId] ?? 0) + 1;
    return counts;
  }, {});
}

export function getCategoryName(
  categories: Category[],
  categoryId: string,
  locale: "en" | "ar",
): string {
  return categories.find((category) => category.id === categoryId)?.name[locale] ?? "—";
}

export function getRelatedProducts(
  products: Product[],
  current: Product,
  limit = 3,
): Product[] {
  return sortProductsForDisplay(products.filter((product) => product.id !== current.id))
    .sort((a, b) => {
      const aSame = a.categoryId === current.categoryId ? 1 : 0;
      const bSame = b.categoryId === current.categoryId ? 1 : 0;
      return bSame - aSame;
    })
    .slice(0, limit);
}

export interface CatalogStats {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  featuredProducts: number;
  totalCategories: number;
  activeCategories: number;
}

export function getCatalogStats(products: Product[], categories: Category[]): CatalogStats {
  return {
    totalProducts: products.length,
    activeProducts: products.filter((product) => product.active).length,
    inactiveProducts: products.filter((product) => !product.active).length,
    featuredProducts: products.filter((product) => product.featured).length,
    totalCategories: categories.length,
    activeCategories: categories.filter((category) => category.active).length,
  };
}

export function getRecentProducts(products: Product[], limit = 5): Product[] {
  return [...products]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}
