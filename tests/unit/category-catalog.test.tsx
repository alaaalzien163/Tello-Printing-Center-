import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CategoryCatalog } from "@/components/public/category-catalog";
import { seedCategories } from "@/data/seed/categories";
import { seedProducts } from "@/data/seed/products";
import type { Category } from "@/domain/category";

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

const labels = {
  count: "7 categories",
  emptyTitle: "No categories available yet",
  emptyDescription: "Categories are being updated. Please check back soon.",
};

function renderCatalog(categories = seedCategories) {
  return render(
    <CategoryCatalog
      categories={categories}
      products={seedProducts}
      locale="en"
      labels={labels}
    />,
  );
}

describe("CategoryCatalog", () => {
  it("renders one link per category and no products", () => {
    renderCatalog();

    const cards = screen.getAllByTestId("category-card");
    expect(cards).toHaveLength(seedCategories.length);
    expect(cards[0]).toHaveAttribute(
      "href",
      `/products/category/${seedCategories[0]!.slug}`,
    );
    expect(screen.getByText(labels.count)).toBeInTheDocument();
    expect(screen.queryByTestId("product-card")).not.toBeInTheDocument();
  });

  it("shows the number of products in each category", () => {
    renderCatalog();

    expect(screen.getByText("3D Printers (3)")).toBeInTheDocument();
    expect(screen.getByText("DTF Printers and Equipment (0)")).toBeInTheDocument();
  });

  it("shows a localized empty state when no categories exist", () => {
    renderCatalog([]);

    expect(screen.getByText(labels.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(labels.emptyDescription)).toBeInTheDocument();
    expect(screen.queryAllByTestId("category-card")).toHaveLength(0);
  });
});
