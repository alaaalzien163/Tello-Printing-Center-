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

  const categoryEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    categories.map((category) => {
      const path = `/products/category/${category.slug}`;
      const lastModified = toLastModified(category.updatedAt);

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
    products.map((product) => {
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
