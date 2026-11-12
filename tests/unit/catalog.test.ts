import { describe, expect, it } from "vitest";

import { seedCategories } from "@/data/seed/categories";
import { seedProducts } from "@/data/seed/products";
import { formatDate, formatPrice, pickLocalized } from "@/lib/format";
import {
  filterProducts,
  getCatalogStats,
  getCategoryName,
  getCategoryProductCounts,
  getRelatedProducts,
  searchAndSortCategories,
  sortProductsForDisplay,
} from "@/services/catalog";

describe("filterProducts", () => {
  it("returns all products without filters", () => {
    expect(filterProducts(seedProducts)).toHaveLength(seedProducts.length);
  });

  it("searches English and Arabic names, SKU and description", () => {
    expect(filterProducts(seedProducts, { query: "TEL-FDM-001" })).toHaveLength(1);
    expect(filterProducts(seedProducts, { query: "فورج" }).length).toBeGreaterThan(0);
    expect(
      filterProducts(seedProducts, { query: "repeatable engineering parts" }).length,
    ).toBeGreaterThan(0);
    expect(filterProducts(seedProducts, { query: "Forge X1" }).length).toBeGreaterThanOrEqual(1);
  });

  it("is case-insensitive and trims the query", () => {
    expect(filterProducts(seedProducts, { query: "  tel-fdm-001  " })).toHaveLength(1);
  });

  it("filters by category together with a search query", () => {
    const categoryId = "cat-3d-printers";
    const results = filterProducts(seedProducts, { categoryId, query: "tello" });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((product) => product.categoryId === categoryId)).toBe(true);
  });

  it("returns an empty list for unmatched searches", () => {
    expect(filterProducts(seedProducts, { query: "no-such-product-xyz" })).toEqual([]);
  });
});

describe("sortProductsForDisplay", () => {
  it("puts featured products first and does not mutate the input", () => {
    const original = [...seedProducts];
    const sorted = sortProductsForDisplay(seedProducts);

    expect(seedProducts).toEqual(original);
    expect(sorted[0]?.featured).toBe(true);
    const firstNonFeatured = sorted.findIndex((product) => !product.featured);
    expect(sorted.slice(firstNonFeatured).every((product) => !product.featured)).toBe(true);
  });
});

describe("category helpers", () => {
  it("counts products per category", () => {
    const counts = getCategoryProductCounts(seedProducts);
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

    expect(total).toBe(seedProducts.length);
  });

  it("resolves a localized category name and falls back to a dash", () => {
    expect(getCategoryName(seedCategories, "cat-3d-printers", "en")).toBe("3D Printers");
    expect(getCategoryName(seedCategories, "cat-3d-printers", "ar")).toBe(
      "طابعات ثلاثية الأبعاد",
    );
    expect(getCategoryName(seedCategories, "missing", "en")).toBe("—");
  });

  it("searches categories by both languages and slug", () => {
    expect(searchAndSortCategories(seedCategories, "printers", "name-asc", "en").length).toBeGreaterThan(0);
    expect(searchAndSortCategories(seedCategories, "طابعات", "name-asc", "ar").length).toBeGreaterThan(0);
  });

  it("sorts categories by localized name and active state", () => {
    const byName = searchAndSortCategories(seedCategories, "", "name-asc", "en");
    expect(byName.map((category) => category.name.en)).toEqual(
      [...byName.map((category) => category.name.en)].sort((a, b) => a.localeCompare(b, "en")),
    );

    const withInactive = seedCategories.map((category, index) =>
      index === 0 ? { ...category, active: false } : category,
    );
    const byActive = searchAndSortCategories(withInactive, "", "active", "en");
    const firstInactive = byActive.findIndex((category) => !category.active);
    expect(firstInactive).toBeGreaterThan(0);
    expect(byActive.slice(firstInactive).every((category) => !category.active)).toBe(true);
  });
});

describe("catalog statistics and relationships", () => {
  it("computes overview statistics", () => {
    const stats = getCatalogStats(seedProducts, seedCategories);

    expect(stats.totalProducts).toBe(seedProducts.length);
    expect(stats.activeProducts + stats.inactiveProducts).toBe(stats.totalProducts);
    expect(stats.featuredProducts).toBe(seedProducts.filter((product) => product.featured).length);
    expect(stats.totalCategories).toBe(seedCategories.length);
    expect(stats.activeCategories).toBeLessThanOrEqual(stats.totalCategories);
  });

  it("returns related products without the current product", () => {
    const current = seedProducts[0]!;
    const related = getRelatedProducts(seedProducts, current, 3);

    expect(related).toHaveLength(3);
    expect(related.some((product) => product.id === current.id)).toBe(false);
  });
});

describe("formatting", () => {
  it("picks the requested locale with a sensible fallback", () => {
    expect(pickLocalized({ en: "English", ar: "العربية" }, "ar")).toBe("العربية");
    expect(pickLocalized({ en: "English", ar: "  " }, "ar")).toBe("English");
  });

  it("formats prices for English and Arabic locales", () => {
    expect(formatPrice(14500, "USD", "en")).toBe("$14,500");
    const arabic = formatPrice(14500, "USD", "ar");
    expect(arabic.length).toBeGreaterThan(0);
    expect(arabic).not.toBe(formatPrice(14500, "USD", "en"));
  });

  it("formats valid dates and returns a dash for invalid input", () => {
    expect(formatDate("2026-11-10T07:45:00.000Z", "en")).toContain("2026");
    expect(formatDate("not-a-date", "en")).toBe("—");
  });
});
