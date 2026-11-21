import { describe, expect, it } from "vitest";

import { absoluteUrl, siteConfig } from "@/config/site";

describe("absoluteUrl", () => {
  it("prefixes relative paths with the configured site origin", () => {
    expect(absoluteUrl("/images/og-default.png")).toBe(
      `${siteConfig.url}/images/og-default.png`,
    );
    expect(absoluteUrl("products/m1-pro")).toBe(
      `${siteConfig.url}/products/m1-pro`,
    );
  });

  it("preserves already absolute http(s) URLs", () => {
    const image = "https://project.supabase.co/storage/v1/object/public/catalog-images/a.png";

    expect(absoluteUrl(image)).toBe(image);
    expect(absoluteUrl("http://cdn.example.test/image.jpg")).toBe(
      "http://cdn.example.test/image.jpg",
    );
  });
});
