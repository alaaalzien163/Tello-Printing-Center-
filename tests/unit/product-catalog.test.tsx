import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProductCatalog } from "@/components/public/product-catalog";
import { seedCategories } from "@/data/seed/categories";
import { seedProducts } from "@/data/seed/products";
import type { Category } from "@/domain/category";
import type { Product } from "@/domain/product";

vi.mock("@/components/public/category-card", () => ({
  CategoryCard: ({
    category,
    productCount,
  }: {
    category: Category;
    productCount: number;
  }) => (
    <a data-testid="category-card" href={`/products/category/${category.slug}`}>
      {category.name.en} ({productCount})
    </a>
  ),
}));

vi.mock("@/components/public/product-card", () => ({
  ProductCard: ({
    product,
    categoryName,
  }: {
    product: Product;
    categoryName: string;
  }) => (
    <a data-testid="product-card" href={`/products/${product.slug}`}>
      {product.name.en} — {categoryName}
    </a>
  ),
}));

const labels = {
  categoriesTitle: "Shop by category",
  jumpToCategory: "Jump to a category",
  categoryCount: `${seedCategories.length} categories`,
  emptyTitle: "No categories available yet",
  emptyDescription: "Categories are being updated. Please check back soon.",
  categoryEmptyTitle: "No products in this category yet",
  categoryEmptyDescription: "Products are being added to this category.",
  formatProductCount: (count: number) => `${count} products`,
};

function renderCatalog(categories = seedCategories, products = seedProducts) {
  return render(
    <ProductCatalog
      categories={categories}
      products={products}
      locale="en"
      labels={labels}
    />,
  );
}

describe("ProductCatalog", () => {
  it("renders the category overview and every product", () => {
    renderCatalog();

    expect(
      screen.getByRole("heading", { level: 2, name: labels.categoriesTitle }),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("category-card")).toHaveLength(seedCategories.length);
    expect(screen.getAllByTestId("product-card")).toHaveLength(seedProducts.length);
    expect(screen.getByText(labels.categoryCount)).toBeInTheDocument();
  });

  it("groups products under their category section", () => {
    renderCatalog();

    const section = screen
      .getByRole("heading", { level: 2, name: "3D Printers" })
      .closest("section");
    expect(section).not.toBeNull();

    const cards = within(section as HTMLElement).getAllByTestId("product-card");
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(card).toHaveTextContent("3D Printers");
    }
  });

  it("shows a note for categories without active products", () => {
    renderCatalog();

    const emptySection = screen
      .getByRole("heading", { level: 2, name: "DTF Printers and Equipment" })
      .closest("section");
    expect(emptySection).not.toBeNull();
    expect(
      within(emptySection as HTMLElement).getByText(labels.categoryEmptyTitle),
    ).toBeInTheDocument();
    expect(
      within(emptySection as HTMLElement).queryAllByTestId("product-card"),
    ).toHaveLength(0);
  });

  it("links the jump navigation to each category section", () => {
    renderCatalog();

    const nav = screen.getByRole("navigation", { name: labels.jumpToCategory });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(seedCategories.length);
    expect(links[0]).toHaveAttribute("href", `#category-${seedCategories[0]!.slug}`);
  });

  it("shows a localized empty state when no categories exist", () => {
    renderCatalog([], []);

    expect(screen.getByText(labels.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(labels.emptyDescription)).toBeInTheDocument();
    expect(screen.queryAllByTestId("category-card")).toHaveLength(0);
    expect(screen.queryAllByTestId("product-card")).toHaveLength(0);
  });
});
