import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildPublicCatalog,
  type CategoryRow,
  type ProductRow,
  type VariantRow,
} from "@/lib/supabase/catalog-mapping";

afterEach(() => {
  vi.unstubAllEnvs();
});

const timestamp = "2026-11-14T08:00:00.000Z";

function category(overrides: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id: "cat-printers",
    slug: "printers",
    name_en: "Printers",
    name_ar: "طابعات",
    description_en: "Printing machines",
    description_ar: "آلات طباعة",
    is_active: true,
    sort_order: 1,
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  };
}

function product(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: "prd-one",
    slug: "product-one",
    name_en: "Product One",
    name_ar: "المنتج الأول",
    description_en: "Description",
    description_ar: "الوصف",
    category_id: "cat-printers",
    base_price: 100,
    currency_code: "USD",
    image_path: "products/prd-one/image.jpg",
    is_active: true,
    is_featured: false,
    sort_order: 1,
    brand: "Tello",
    model: "X1",
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  };
}

function variant(overrides: Partial<VariantRow> = {}): VariantRow {
  return {
    id: "var-one",
    product_id: "prd-one",
    size_label_en: "Medium",
    size_label_ar: "متوسط",
    price: 110,
    sku: "SKU-MEDIUM",
    image_path: null,
    is_active: true,
    sort_order: 2,
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  };
}

describe("public catalog row filtering", () => {
  it("keeps only active categories and orders them by sort order", () => {
    const catalog = buildPublicCatalog(
      [
        category({ id: "cat-second", slug: "second", name_en: "Second", sort_order: 2 }),
        category({ id: "cat-first", slug: "first", name_en: "First", sort_order: 1 }),
        category({ id: "cat-hidden", slug: "hidden", is_active: false }),
        category({ id: "cat-broken", slug: "", name_en: "" }),
      ],
      [],
      [],
    );

    expect(catalog.categories.map((item) => item.slug)).toEqual(["first", "second"]);
  });

  it("excludes inactive products and products whose category is hidden", () => {
    const catalog = buildPublicCatalog(
      [category()],
      [
        product({ id: "prd-visible", slug: "visible" }),
        product({ id: "prd-inactive", slug: "inactive", is_active: false }),
        product({ id: "prd-hidden-category", slug: "hidden-category", category_id: "cat-hidden" }),
        product({ id: "prd-orphan", slug: "orphan", category_id: "cat-missing" }),
      ],
      [],
    );

    expect(catalog.products.map((item) => item.slug)).toEqual(["visible"]);
  });

  it("excludes products with missing or invalid required data", () => {
    const catalog = buildPublicCatalog(
      [category()],
      [
        product({ id: "prd-valid", slug: "valid" }),
        product({ id: "prd-empty-slug", slug: "" }),
        product({ id: "prd-empty-name", name_en: "" }),
        product({ id: "prd-invalid-currency", currency_code: "GBP" }),
        product({ id: "prd-invalid-price", base_price: Number.NaN }),
        product({ id: "prd-negative-price", base_price: -1 }),
        product({ id: "prd-missing-category", category_id: "" }),
      ],
      [],
    );

    expect(catalog.products.map((item) => item.id)).toEqual(["prd-valid"]);
  });

  it("prefers featured products and then the most recently updated", () => {
    const catalog = buildPublicCatalog(
      [category()],
      [
        product({ id: "prd-old", slug: "old", updated_at: "2026-11-01T00:00:00.000Z" }),
        product({
          id: "prd-featured",
          slug: "featured",
          is_featured: true,
          updated_at: "2026-10-01T00:00:00.000Z",
        }),
        product({ id: "prd-new", slug: "new", updated_at: "2026-11-10T00:00:00.000Z" }),
      ],
      [],
    );

    expect(catalog.products.map((item) => item.slug)).toEqual(["featured", "new", "old"]);
  });

  it("maps brand, model, images and product currency", () => {
    const catalog = buildPublicCatalog([category()], [product()], []);
    const item = catalog.products[0]!;

    expect(item.brand).toEqual({ en: "Tello", ar: "Tello" });
    expect(item.model).toBe("X1");
    expect(item.currency).toBe("USD");
    expect(item.price).toBe(100);
    expect(item.image.alt).toEqual({ en: "Product One", ar: "المنتج الأول" });
  });

  it("maps categories without any image data", () => {
    const catalog = buildPublicCatalog([category()], [], []);

    expect(catalog.categories[0]).not.toHaveProperty("image");
  });
});

describe("public product variants", () => {
  it("inherits the product currency, keeps active rows and sorts by order", () => {
    const catalog = buildPublicCatalog(
      [category()],
      [product({ currency_code: "SAR" })],
      [
        variant({ id: "var-medium", sku: "SKU-MEDIUM", sort_order: 2 }),
        variant({
          id: "var-small",
          size_label_en: "Small",
          size_label_ar: "صغير",
          sku: "SKU-SMALL",
          sort_order: 1,
        }),
        variant({ id: "var-inactive", is_active: false, sku: "SKU-INACTIVE" }),
        variant({ id: "var-missing-label", size_label_ar: "" }),
      ],
    );

    const variants = catalog.variantsByProduct["prd-one"] ?? [];

    expect(variants.map((item) => item.id)).toEqual(["var-small", "var-medium"]);
    expect(variants.every((item) => item.currency === "SAR")).toBe(true);
    expect(catalog.products[0]?.sku).toBe("SKU-SMALL");
  });

  it("does not expose variants for hidden products", () => {
    const catalog = buildPublicCatalog(
      [category()],
      [product({ id: "prd-hidden", is_active: false })],
      [variant({ product_id: "prd-hidden" })],
    );

    expect(catalog.variantsByProduct).toEqual({});
    expect(catalog.products).toEqual([]);
  });

  it("maps each variant image_path to its own public Storage URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");

    const catalog = buildPublicCatalog(
      [category()],
      [product()],
      [
        variant({
          id: "var-image",
          image_path: "variants/var-image/photo.png",
        }),
        variant({ id: "var-no-image", image_path: null }),
      ],
    );

    const variants = catalog.variantsByProduct["prd-one"] ?? [];
    const withImage = variants.find((item) => item.id === "var-image");
    const withoutImage = variants.find((item) => item.id === "var-no-image");

    expect(withImage?.image.url).toBe(
      "https://example.supabase.co/storage/v1/object/public/catalog-images/variants/var-image/photo.png",
    );
    expect(withoutImage?.image.url).toBe("");
  });
});
