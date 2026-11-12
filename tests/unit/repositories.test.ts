import { beforeEach, describe, expect, it } from "vitest";

import { loadDemoState, resetDemoState } from "@/data/demo-store";
import { seedActivity } from "@/data/seed/activity";
import { seedCategories } from "@/data/seed/categories";
import { seedProducts } from "@/data/seed/products";
import type { Product, ProductInput } from "@/domain/product";
import type { CategoryInput } from "@/domain/category";
import { mockCategoryRepository } from "@/repositories/mock/category-repository";
import { mockProductRepository } from "@/repositories/mock/product-repository";
import { RepositoryError } from "@/repositories/types";

function toProductInput(product: Product): ProductInput {
  const copy: Partial<Product> = { ...product };
  delete copy.id;
  delete copy.createdAt;
  delete copy.updatedAt;
  return copy as ProductInput;
}

const baseProduct = toProductInput(seedProducts[0]!);

const baseCategory: CategoryInput = {
  name: { en: "Test Category", ar: "فئة اختبار" },
  description: {
    en: "A temporary category used by the automated tests.",
    ar: "فئة مؤقتة تستخدمها الاختبارات الآلية.",
  },
  slug: "test-category",
  image: {
    url: "/images/consumables.svg",
    alt: { en: "Test category image", ar: "صورة فئة الاختبار" },
  },
  active: true,
};

async function expectRepositoryError(
  promise: Promise<unknown>,
  code: RepositoryError["code"],
): Promise<void> {
  await expect(promise).rejects.toMatchObject({ name: "RepositoryError", code });
}

describe("demo product repository", () => {
  beforeEach(() => {
    resetDemoState();
  });

  it("lists seeded products and can exclude inactive records", async () => {
    const all = await mockProductRepository.list();
    const active = await mockProductRepository.list({ includeInactive: false });

    expect(all).toHaveLength(seedProducts.length);
    expect(active.every((product) => product.active)).toBe(true);
    expect(active.length).toBeLessThanOrEqual(all.length);
  });

  it("finds products by id and slug", async () => {
    const product = seedProducts[0]!;

    await expect(mockProductRepository.getBySlug(product.slug)).resolves.toMatchObject({
      id: product.id,
    });
    await expect(mockProductRepository.getById(product.id)).resolves.toMatchObject({
      slug: product.slug,
    });
    await expect(mockProductRepository.getById("missing")).resolves.toBeNull();
  });

  it("creates a product, normalizes identifiers and records activity", async () => {
    const before = await mockProductRepository.list();
    const created = await mockProductRepository.create({
      ...baseProduct,
      sku: " tel-new-999 ",
      slug: " Forge-New-999 ",
      name: { en: "New Test Printer", ar: "طابعة اختبار جديدة" },
    });

    expect(created.sku).toBe("TEL-NEW-999");
    expect(created.slug).toBe("forge-new-999");
    expect(created.name.en).toBe("New Test Printer");
    await expect(mockProductRepository.list()).resolves.toHaveLength(before.length + 1);
    expect(loadDemoState().activity[0]?.action).toBe("product.created");
  });

  it("rejects duplicate SKUs and slugs", async () => {
    const existing = seedProducts[0]!;

    await expectRepositoryError(
      mockProductRepository.create({ ...baseProduct, sku: existing.sku.toLowerCase() }),
      "SKU_TAKEN",
    );
    await expectRepositoryError(
      mockProductRepository.create({ ...baseProduct, slug: existing.slug, sku: "TEL-UNIQUE-1" }),
      "SLUG_TAKEN",
    );
  });

  it("rejects a category that does not exist", async () => {
    await expectRepositoryError(
      mockProductRepository.create({
        ...baseProduct,
        sku: "TEL-ORPHAN-1",
        slug: "orphan-product",
        categoryId: "missing-category",
      }),
      "CATEGORY_NOT_FOUND",
    );
  });

  it("updates and deletes products", async () => {
    const target = seedProducts[1]!;
    const updated = await mockProductRepository.update(target.id, {
      ...baseProduct,
      sku: target.sku,
      slug: target.slug,
      name: { en: "Updated Product", ar: "منتج محدث" },
    });

    expect(updated.id).toBe(target.id);
    expect(updated.createdAt).toBe(target.createdAt);
    expect(updated.name.en).toBe("Updated Product");

    await mockProductRepository.delete(target.id);
    await expect(mockProductRepository.getById(target.id)).resolves.toBeNull();
  });

  it("reports a not-found error for missing products", async () => {
    await expectRepositoryError(mockProductRepository.delete("missing"), "NOT_FOUND");
    await expectRepositoryError(
      mockProductRepository.update("missing", baseProduct),
      "NOT_FOUND",
    );
  });

  it("toggles active and featured state", async () => {
    const target = seedProducts.find((product) => product.active)!;

    const inactive = await mockProductRepository.setActive(target.id, false);
    expect(inactive.active).toBe(false);

    const featured = await mockProductRepository.setFeatured(target.id, !target.featured);
    expect(featured.featured).toBe(!target.featured);
  });
});

describe("demo category repository", () => {
  beforeEach(() => {
    resetDemoState();
  });

  it("creates, updates and deletes an empty category", async () => {
    const created = await mockCategoryRepository.create(baseCategory);
    expect(created.slug).toBe("test-category");

    const updated = await mockCategoryRepository.update(created.id, {
      ...baseCategory,
      name: { en: "Renamed Category", ar: "فئة معاد تسميتها" },
    });
    expect(updated.name.en).toBe("Renamed Category");

    await mockCategoryRepository.delete(created.id);
    await expect(mockCategoryRepository.getById(created.id)).resolves.toBeNull();
  });

  it("prevents deleting a category that still contains products", async () => {
    const populated = seedCategories.find((category) =>
      seedProducts.some((product) => product.categoryId === category.id),
    )!;

    await expectRepositoryError(mockCategoryRepository.delete(populated.id), "CATEGORY_HAS_PRODUCTS");
    await expect(mockCategoryRepository.getById(populated.id)).resolves.not.toBeNull();
  });

  it("rejects duplicate and invalid category slugs", async () => {
    const existing = seedCategories[0]!;

    await expectRepositoryError(
      mockCategoryRepository.create({ ...baseCategory, slug: existing.slug }),
      "SLUG_TAKEN",
    );
    await expectRepositoryError(
      mockCategoryRepository.update("missing", baseCategory),
      "NOT_FOUND",
    );
  });

  it("toggles category visibility", async () => {
    const target = seedCategories[0]!;
    const updated = await mockCategoryRepository.setActive(target.id, !target.active);

    expect(updated.active).toBe(!target.active);
  });
});

describe("reset demo data", () => {
  it("restores the original seed catalog and activity", async () => {
    await mockProductRepository.delete(seedProducts[0]!.id);
    resetDemoState();

    await expect(mockProductRepository.list()).resolves.toHaveLength(seedProducts.length);
    expect(loadDemoState().activity).toHaveLength(seedActivity.length);
  });
});
