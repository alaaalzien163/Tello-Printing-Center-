import type { MetadataRoute } from "next";

import type { Category } from "@/domain/category";
import type { Product } from "@/domain/product";
import { defaultLocale, locales } from "@/i18n/routing";

export interface SitemapCatalog {
  categories: Category[];
  products: Product[];
}

/** Public, indexable static routes. Admin, API and 404 routes are excluded. */
const staticPaths = ["", "/products", "/contact", "/print-request"] as const;

/**
 * The sitemap route uses the same window as the public catalog cache.
 * `src/app/sitemap.ts` must keep a literal `revalidate = 60` because Next.js
 * requires the route segment config to be statically analyzable.
 */
export const SITEMAP_REVALIDATE_SECONDS = 60;

function localizedUrl(baseUrl: string, locale: string, path: string): string {
  return `${baseUrl}/${locale}${path}`;
}

function languageAlternates(baseUrl: string, path: string): Record<string, string> {
  return Object.fromEntries([
    ...locales.map((locale) => [locale, localizedUrl(baseUrl, locale, path)]),
    ["x-default", localizedUrl(baseUrl, defaultLocale, path)],
  ]);
}

function toLastModified(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Uses only timestamps supplied by the catalog. No current-time fallback is
 * allowed: a sitemap must not claim a page changed when it did not.
 */
function latestLastModified(...values: Array<string | undefined>): Date | undefined {
  let latest: Date | undefined;

  for (const value of values) {
    const date = toLastModified(value);
    if (!date) continue;
    if (!latest || date.getTime() > latest.getTime()) latest = date;
  }

  return latest;
}

function staticChangeFrequency(path: (typeof staticPaths)[number]): "weekly" | "monthly" {
  return path === "" ? "weekly" : "monthly";
}

function staticPriority(path: (typeof staticPaths)[number]): number {
  if (path === "") return 1;
  if (path === "/print-request") return 0.7;
  return 0.8;
}

/**
 * Builds the localized sitemap. Static routes deliberately omit `lastModified`
 * because there is no real per-page update timestamp; catalog entries use the
 * product/category `updated_at` value from Supabase.
 */
export function buildSitemapEntries({
  baseUrl,
  categories,
  products,
}: { baseUrl: string } & SitemapCatalog): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    staticPaths.map((path) => ({
      url: localizedUrl(baseUrl, locale, path),
      changeFrequency: staticChangeFrequency(path),
      priority: staticPriority(path),
      alternates: { languages: languageAlternates(baseUrl, path) },
    })),
  );

  const activeCategories = categories.filter((category) => category.active);
  const activeCategoryIds = new Set(activeCategories.map((category) => category.id));
  const activeProducts = products.filter(
    (product) => product.active && activeCategoryIds.has(product.categoryId),
  );

  const productsByCategory = new Map<string, Product[]>();
  for (const product of activeProducts) {
    const list = productsByCategory.get(product.categoryId) ?? [];
    list.push(product);
    productsByCategory.set(product.categoryId, list);
  }

  // A category with no active products is a thin page. It stays reachable in
  // the UI, but it is not advertised to crawlers until it has content again.
  const visibleCategories = activeCategories.filter(
    (category) => (productsByCategory.get(category.id)?.length ?? 0) > 0,
  );

  const categoryEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    visibleCategories.map((category) => {
      const path = `/products/category/${category.slug}`;
      const categoryProducts = productsByCategory.get(category.id) ?? [];
      const lastModified = latestLastModified(
        category.updatedAt,
        ...categoryProducts.map((product) => product.updatedAt),
      );

      return {
        url: localizedUrl(baseUrl, locale, path),
        ...(lastModified ? { lastModified } : {}),
        changeFrequency: "weekly" as const,
        priority: 0.7,
        alternates: { languages: languageAlternates(baseUrl, path) },
      };
    }),
  );

  const productEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    activeProducts.map((product) => {
      const path = `/products/${product.slug}`;
      const lastModified = toLastModified(product.updatedAt);

      return {
        url: localizedUrl(baseUrl, locale, path),
        ...(lastModified ? { lastModified } : {}),
        changeFrequency: "monthly" as const,
        priority: 0.6,
        alternates: { languages: languageAlternates(baseUrl, path) },
      };
    }),
  );

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
