import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { buildSitemapEntries } from "@/lib/sitemap";
import { getPublicSitemapCatalog } from "@/repositories/public-catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Do not swallow a catalog failure here: an empty sitemap would look valid
  // to crawlers and silently drop every product and category. Let the route
  // fail so the problem is visible in logs and monitoring.
  const { categories, products } = await getPublicSitemapCatalog();

  return buildSitemapEntries({ baseUrl: siteConfig.url, categories, products });
}
