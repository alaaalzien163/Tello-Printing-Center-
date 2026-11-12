import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { locales } from "@/i18n/routing";
import { getPublicProductSlugs } from "@/repositories/public-catalog";

const staticPaths = ["", "/products", "/contact"] as const;

function localizedUrl(locale: string, path: string): string {
  return `${siteConfig.url}/${locale}${path}`;
}

function languageAlternates(path: string): Record<string, string> {
  return Object.fromEntries([
    ...locales.map((locale) => [locale, localizedUrl(locale, path)]),
    ["x-default", localizedUrl("en", path)],
  ]);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const productSlugs = await getPublicProductSlugs();
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    staticPaths.map((path) => ({
      url: localizedUrl(locale, path),
      lastModified,
      changeFrequency: path === "" ? "weekly" : "monthly",
      priority: path === "" ? 1 : 0.8,
      alternates: { languages: languageAlternates(path) },
    })),
  );

  const productEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    productSlugs.map((slug) => {
      const path = `/products/${slug}`;
      return {
        url: localizedUrl(locale, path),
        lastModified,
        changeFrequency: "monthly",
        priority: 0.6,
        alternates: { languages: languageAlternates(path) },
      };
    }),
  );

  return [...staticEntries, ...productEntries];
}
