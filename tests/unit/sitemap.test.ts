import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { Category } from "@/domain/category";
import type { Product } from "@/domain/product";
import {
  buildSitemapEntries,
  SITEMAP_REVALIDATE_SECONDS,
} from "@/lib/sitemap";

const baseUrl = "https://www.telloprintingcenter.com";
const categoryUpdatedAt = "2026-11-05T10:30:00.000Z";
const productUpdatedAt = "2026-11-12T08:15:00.000Z";

const category: Category = {
  id: "category-1",
  slug: "printers",
  name: { en: "Printers", ar: "طابعات" },
  description: { en: "Printing machines", ar: "آلات طباعة" },
  active: true,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: categoryUpdatedAt,
};

const product: Product = {
  id: "product-1",
  sku: "SKU-1",
  slug: "m1-pro",
  name: { en: "M1 Pro", ar: "إم 1 برو" },
  description: { en: "A printer", ar: "طابعة" },
  categoryId: category.id,
  price: 1200,
  currency: "USD",
  image: { url: "", alt: { en: "M1 Pro", ar: "إم 1 برو" } },
  active: true,
  featured: false,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: productUpdatedAt,
};

function build() {
  return buildSitemapEntries({ baseUrl, categories: [category], products: [product] });
}

describe("sitemap revalidation", () => {
  it("uses a 60-second revalidation window", () => {
    expect(SITEMAP_REVALIDATE_SECONDS).toBe(60);

    // Next.js requires the route segment config to be a static literal.
    const source = readFileSync(
      resolve(process.cwd(), "src/app/sitemap.ts"),
      "utf8",
    );
    expect(source).toMatch(/export const revalidate = 60;/);
  });
});

describe("buildSitemapEntries", () => {
  it("includes localized static routes, including print request", () => {
    const urls = build().map((entry) => entry.url);

    expect(urls).toContain(`${baseUrl}/en/print-request`);
    expect(urls).toContain(`${baseUrl}/ar/print-request`);
    expect(urls).toContain(`${baseUrl}/en/products`);
    expect(urls).toContain(`${baseUrl}/ar/contact`);
  });

  it("excludes admin, API and not-found routes", () => {
    const urls = build().map((entry) => entry.url);

    expect(urls.some((url) => url.includes("/admin"))).toBe(false);
    expect(urls.some((url) => url.includes("/api/"))).toBe(false);
    expect(urls.some((url) => url.includes("not-found"))).toBe(false);
  });

  it("includes localized category and product entries", () => {
    const urls = build().map((entry) => entry.url);

    expect(urls).toContain(`${baseUrl}/en/products/category/printers`);
    expect(urls).toContain(`${baseUrl}/ar/products/category/printers`);
    expect(urls).toContain(`${baseUrl}/en/products/m1-pro`);
    expect(urls).toContain(`${baseUrl}/ar/products/m1-pro`);
  });

  it("uses real catalog update timestamps and omits static lastModified", () => {
    const entries = build();
    const staticEntry = entries.find((entry) => entry.url === `${baseUrl}/en/products`);
    const categoryEntry = entries.find(
      (entry) => entry.url === `${baseUrl}/en/products/category/printers`,
    );
    const productEntry = entries.find(
      (entry) => entry.url === `${baseUrl}/en/products/m1-pro`,
    );

    expect(staticEntry).not.toHaveProperty("lastModified");
    // The category page includes its products, so the newer product update is
    // the meaningful last modification for that page.
    expect(categoryEntry?.lastModified).toEqual(new Date(productUpdatedAt));
    expect(productEntry?.lastModified).toEqual(new Date(productUpdatedAt));
  });

  it("keeps English, Arabic and x-default alternates", () => {
    const entries = build();
    const productEntry = entries.find(
      (entry) => entry.url === `${baseUrl}/en/products/m1-pro`,
    );

    expect(productEntry?.alternates?.languages).toEqual({
      en: `${baseUrl}/en/products/m1-pro`,
      ar: `${baseUrl}/ar/products/m1-pro`,
      "x-default": `${baseUrl}/ar/products/m1-pro`,
    });
  });

  it("excludes inactive products and categories without active products", () => {
    const entries = buildSitemapEntries({
      baseUrl,
      categories: [
        category,
        {
          ...category,
          id: "category-empty",
          slug: "empty-category",
          name: { en: "Empty", ar: "فارغ" },
        },
        {
          ...category,
          id: "category-hidden",
          slug: "hidden-category",
          active: false,
        },
      ],
      products: [
        product,
        {
          ...product,
          id: "product-inactive",
          slug: "inactive-product",
          active: false,
        },
      ],
    });
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain(`${baseUrl}/en/products/m1-pro`);
    expect(urls).not.toContain(`${baseUrl}/en/products/inactive-product`);
    expect(urls).not.toContain(`${baseUrl}/en/products/category/empty-category`);
    expect(urls).not.toContain(`${baseUrl}/en/products/category/hidden-category`);
  });

  it("uses the latest real product update for the category lastmod", () => {
    const newerProductUpdatedAt = "2026-11-15T12:00:00.000Z";
    const entries = buildSitemapEntries({
      baseUrl,
      categories: [category],
      products: [
        { ...product, updatedAt: "2026-11-01T09:00:00.000Z" },
        {
          ...product,
          id: "product-2",
          slug: "m2",
          updatedAt: newerProductUpdatedAt,
        },
      ],
    });
    const categoryEntry = entries.find(
      (entry) => entry.url === `${baseUrl}/en/products/category/printers`,
    );

    expect(categoryEntry?.lastModified).toEqual(
      new Date(newerProductUpdatedAt),
    );
  });

  it("does not invent a timestamp when catalog timestamps are invalid", () => {
    const entries = buildSitemapEntries({
      baseUrl,
      categories: [{ ...category, updatedAt: "not-a-date" }],
      products: [{ ...product, updatedAt: "not-a-date" }],
    });
    const categoryEntry = entries.find(
      (entry) => entry.url === `${baseUrl}/en/products/category/printers`,
    );
    const productEntry = entries.find(
      (entry) => entry.url === `${baseUrl}/en/products/m1-pro`,
    );

    expect(categoryEntry).toBeDefined();
    expect(categoryEntry).not.toHaveProperty("lastModified");
    expect(productEntry).toBeDefined();
    expect(productEntry).not.toHaveProperty("lastModified");
  });

  it("keeps English, Arabic and x-default alternates on category entries", () => {
    const entries = build();
    const categoryEntry = entries.find(
      (entry) => entry.url === `${baseUrl}/en/products/category/printers`,
    );

    expect(categoryEntry?.alternates?.languages).toEqual({
      en: `${baseUrl}/en/products/category/printers`,
      ar: `${baseUrl}/ar/products/category/printers`,
      "x-default": `${baseUrl}/ar/products/category/printers`,
    });
  });
});
