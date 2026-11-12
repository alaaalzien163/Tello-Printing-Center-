import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { ProductCatalog } from "@/components/public/product-catalog";
import { seedCategories } from "@/data/seed/categories";
import { seedProducts } from "@/data/seed/products";
import type { Product } from "@/domain/product";

import enMessages from "../../messages/en.json";

vi.mock("@/components/public/product-card", () => ({
  ProductCard: ({ product }: { product: { id: string; name: { en: string } } }) => (
    <article data-testid="product-card">{product.name.en}</article>
  ),
}));

function renderCatalog(products: Product[] = seedProducts) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <ProductCatalog products={products} categories={seedCategories} locale="en" />
    </NextIntlClientProvider>,
  );
}

function expectedCountLabel(count: number): RegExp {
  return count === 1 ? /^1 product$/ : new RegExp(`^${count} products$`);
}

describe("ProductCatalog", () => {
  it("renders every product with the catalog count", () => {
    renderCatalog();

    expect(screen.getByText(expectedCountLabel(seedProducts.length))).toBeInTheDocument();
    expect(screen.getAllByTestId("product-card")).toHaveLength(seedProducts.length);
  });

  it("does not render search or category filter controls", () => {
    renderCatalog();

    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("shows an empty state when the catalog has no products", () => {
    renderCatalog([]);

    expect(screen.getByText(enMessages.products.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(enMessages.products.emptyDescription)).toBeInTheDocument();
    expect(screen.queryAllByTestId("product-card")).toHaveLength(0);
  });
});
