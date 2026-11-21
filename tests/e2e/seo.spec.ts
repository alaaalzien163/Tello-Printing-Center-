import { expect, test, type Page } from "@playwright/test";

import ar from "../../messages/ar.json";
import en from "../../messages/en.json";
import { getFirstCategory, getFirstPublishedProduct } from "./catalog-helpers";

async function metaContent(page: Page, selector: string): Promise<string | null> {
  const locator = page.locator(selector);
  if ((await locator.count()) === 0) return null;
  return locator.first().getAttribute("content");
}

test.describe("technical SEO", () => {
  test("unknown public routes return a genuine HTTP 404", async ({ request }) => {
    const paths = [
      "/en/unknown-page",
      "/ar/unknown-page",
      "/en/foo/bar/baz",
      "/ar/foo/bar/baz",
      "/en/about",
      "/en/services",
      "/ar/services",
      "/en/services/printing",
      "/en/products/m1-pro/extra",
    ];

    for (const path of paths) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(404);
    }
  });

  test("valid public routes keep returning HTTP 200", async ({ request }) => {
    const paths = [
      "/en",
      "/ar",
      "/en/products",
      "/ar/products",
      "/en/contact",
      "/ar/contact",
      "/en/print-request",
      "/ar/print-request",
    ];

    for (const path of paths) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(200);
    }
  });

  test("localized not-found UI renders in English and Arabic", async ({ page }) => {
    const cases = [
      { path: "/en/unknown-page", title: en.notFound.title, lang: "en", dir: "ltr" },
      { path: "/ar/unknown-page", title: ar.notFound.title, lang: "ar", dir: "rtl" },
    ];

    for (const entry of cases) {
      await page.goto(entry.path);

      await expect(
        page.getByRole("heading", { name: entry.title }),
      ).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", entry.lang);
      await expect(page.locator("html")).toHaveAttribute("dir", entry.dir);
    }
  });

  test("the root redirect is permanent and points to Arabic", async ({ request }) => {
    const response = await request.get("/", { maxRedirects: 0 });

    expect(response.status()).toBe(308);
    expect(response.headers()["location"]).toMatch(/\/ar$/);
  });

  test("non-canonical hosts receive X-Robots-Tag: noindex", async ({ request }) => {
    const response = await request.get("/en", { maxRedirects: 0 });

    expect(response.headers()["x-robots-tag"]).toContain("noindex");
  });

  test("canonical and hreflang links agree, with x-default on Arabic", async ({
    page,
    request,
  }) => {
    await page.goto("/en/products");

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/en\/products$/,
    );
    await expect(
      page.locator('link[rel="alternate"][hreflang="ar"]'),
    ).toHaveAttribute("href", /\/ar\/products$/);
    await expect(
      page.locator('link[rel="alternate"][hreflang="x-default"]'),
    ).toHaveAttribute("href", /\/ar\/products$/);

    // The redundant next-intl HTTP Link header was removed so it cannot
    // disagree with the HTML hreflang output.
    const response = await request.get("/en/products");
    expect(response.headers()["link"] ?? "").not.toContain("x-default");
  });

  test("static pages expose complete, page-specific Open Graph metadata", async ({
    page,
  }) => {
    const pages = [
      { path: "/en", suffix: "/en", locale: "en_US" },
      { path: "/en/products", suffix: "/en/products", locale: "en_US" },
      { path: "/en/contact", suffix: "/en/contact", locale: "en_US" },
      {
        path: "/en/print-request",
        suffix: "/en/print-request",
        locale: "en_US",
      },
      {
        path: "/ar/print-request",
        suffix: "/ar/print-request",
        locale: "ar_SA",
      },
    ];

    for (const entry of pages) {
      await page.goto(entry.path);

      const ogUrl = await metaContent(page, 'meta[property="og:url"]');
      const ogTitle = await metaContent(page, 'meta[property="og:title"]');
      const ogDescription = await metaContent(
        page,
        'meta[property="og:description"]',
      );
      const ogImage = await metaContent(page, 'meta[property="og:image"]');
      const ogLocale = await metaContent(page, 'meta[property="og:locale"]');

      expect(ogUrl, entry.path).toMatch(new RegExp(`${entry.suffix}$`));
      expect(ogTitle, entry.path).toBeTruthy();
      expect(ogDescription, entry.path).toBeTruthy();
      expect(ogImage, entry.path).toMatch(/^https?:\/\//);
      expect(ogImage, entry.path).not.toContain("/images/printing-equipment.svg");
      expect(ogLocale, entry.path).toBe(entry.locale);
    }
  });

  test("product meta descriptions are normalized and never contain raw line breaks", async ({
    page,
  }) => {
    const product = await getFirstPublishedProduct(page);
    if (!product) {
      test.skip(true, "No published products in Supabase.");
      return;
    }

    await page.goto(product.href);

    const description = await metaContent(page, 'meta[name="description"]');
    expect(description).toBeTruthy();
    expect(description).not.toContain("\n");
    expect(description).not.toContain("\r");
    expect(description).not.toContain("\t");
    expect(description).toBe(description!.replace(/\s+/g, " ").trim());
    expect(description!.length).toBeLessThanOrEqual(160);
    expect(description).not.toMatch(/\s…$/);
  });

  test("Arabic category metadata falls back to Arabic text instead of English", async ({
    page,
  }) => {
    const category = await getFirstCategory(page);
    if (!category) {
      test.skip(true, "No published categories in Supabase.");
      return;
    }

    await page.goto(`/ar/products/category/${category.slug}`);

    const description = await metaContent(page, 'meta[name="description"]');
    expect(description).toBeTruthy();
    expect(description).toMatch(/[\u0600-\u06ff]/);
    expect(description).not.toContain("\n");
    expect(description!.length).toBeLessThanOrEqual(160);
  });

  test("category pages emit complete Open Graph fields", async ({ page }) => {
    const category = await getFirstCategory(page);
    if (!category) {
      test.skip(true, "No published categories in Supabase.");
      return;
    }

    await page.goto(category.href);

    const ogUrl = await metaContent(page, 'meta[property="og:url"]');
    const ogTitle = await metaContent(page, 'meta[property="og:title"]');
    const ogDescription = await metaContent(
      page,
      'meta[property="og:description"]',
    );
    const ogImage = await metaContent(page, 'meta[property="og:image"]');

    expect(ogUrl).toMatch(
      new RegExp(`/en/products/category/${category.slug}$`),
    );
    expect(ogTitle?.trim()).toBeTruthy();
    expect(ogDescription?.trim()).toBeTruthy();
    expect(ogImage).toMatch(/^https?:\/\//);
  });

  test("product pages use their own image and safe Product JSON-LD", async ({
    page,
  }) => {
    const product = await getFirstPublishedProduct(page);
    if (!product) {
      test.skip(true, "No published products in Supabase.");
      return;
    }

    await page.goto(product.href);

    const ogUrl = await metaContent(page, 'meta[property="og:url"]');
    const ogImage = await metaContent(page, 'meta[property="og:image"]');

    expect(ogUrl).toMatch(new RegExp(`/en/products/${product.slug}$`));
    expect(ogImage).toMatch(/^https?:\/\//);
    expect(ogImage).not.toMatch(/^https?:\/\/[^/]+\/https?:\/\//);

    const raw = await page
      .locator('script[type="application/ld+json"]')
      .first()
      .textContent();
    expect(raw).toBeTruthy();

    const jsonLd = JSON.parse(raw!) as Record<string, unknown>;
    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("Product");
    expect(jsonLd.name).toBeTruthy();
    expect(jsonLd.url).toMatch(new RegExp(`/en/products/${product.slug}$`));

    // These claims are not verified in the catalog yet.
    expect(jsonLd).not.toHaveProperty("offers");
    expect(jsonLd).not.toHaveProperty("sku");
    expect(jsonLd).not.toHaveProperty("brand");

    if (Array.isArray(jsonLd.image)) {
      expect(jsonLd.image[0]).toMatch(/^https?:\/\//);
      expect(jsonLd.image[0]).not.toMatch(/^https?:\/\/[^/]+\/https?:\/\//);
    }
  });

  test("the sitemap includes public routes and locale alternates", async ({
    request,
  }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);

    const xml = await response.text();

    expect(xml).toContain("/en/print-request");
    expect(xml).toContain("/ar/print-request");
    expect(xml).toContain("/en/products");
    expect(xml).toContain("/ar/products");
    expect(xml).toContain('hreflang="x-default"');
    expect(xml).not.toContain("/admin");
    expect(xml).not.toContain("/api/");
    expect(xml).not.toContain("not-found");
  });

  test("robots.txt disallows admin and API routes", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);

    const text = await response.text();

    expect(text).toContain("Disallow: /api/");
    expect(text).toContain("Disallow: /admin");
    expect(text).toContain("Disallow: /en/admin");
    expect(text).toContain("Disallow: /ar/admin");
    expect(text).toContain("Allow: /");
    expect(text).toContain("Sitemap: http");
  });

  test("admin pages remain noindex and nofollow", async ({ request }) => {
    const response = await request.get("/en/admin/login", { maxRedirects: 0 });
    expect(response.status()).toBe(200);

    const html = await response.text();
    expect(html).toMatch(
      /<meta name="robots" content="noindex, nofollow"/,
    );
  });
});
