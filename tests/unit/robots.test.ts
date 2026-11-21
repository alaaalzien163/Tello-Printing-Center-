import { describe, expect, it } from "vitest";

import { PRODUCTION_SITE_URL } from "@/config/site-url";
import { buildRobots } from "@/lib/robots";

describe("buildRobots", () => {
  it("publishes the canonical sitemap and hostname for Production", () => {
    const robots = buildRobots({ siteUrl: PRODUCTION_SITE_URL, isPreview: false });

    expect(robots.sitemap).toBe(`${PRODUCTION_SITE_URL}/sitemap.xml`);
    expect(robots.host).toBe("www.telloprintingcenter.com");
    expect(robots.host).not.toContain("https://");
  });

  it("disallows API and admin routes without blocking public content", () => {
    const robots = buildRobots({ siteUrl: PRODUCTION_SITE_URL, isPreview: false });
    const rules = Array.isArray(robots.rules) ? robots.rules[0] : robots.rules;

    expect(rules?.allow).toBe("/");
    expect(rules?.disallow).toEqual(
      expect.arrayContaining(["/api/", "/admin", "/en/admin", "/ar/admin"]),
    );
  });

  it("blocks crawling and advertises no sitemap on Preview", () => {
    const robots = buildRobots({
      siteUrl: "https://tello-preview.vercel.app",
      isPreview: true,
    });

    expect(robots.sitemap).toBeUndefined();
    expect(robots.host).toBeUndefined();
    expect(robots.rules).toEqual({ userAgent: "*", disallow: "/" });
  });
});
