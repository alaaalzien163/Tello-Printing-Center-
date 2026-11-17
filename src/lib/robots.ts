import type { MetadataRoute } from "next";

export interface RobotsOptions {
  siteUrl: string;
  isPreview: boolean;
}

/**
 * Production advertises the canonical sitemap and keeps admin/API routes out
 * of the crawl. Preview deployments block crawling entirely and never point
 * crawlers at the Production sitemap.
 */
export function buildRobots({ siteUrl, isPreview }: RobotsOptions): MetadataRoute.Robots {
  if (isPreview) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  const host = new URL(siteUrl).host;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/en/admin", "/ar/admin"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host,
  };
}
