import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { ProductCatalog } from "@/components/public/product-catalog";
import { seedCategories } from "@/data/seed/categories";
import { seedProducts } from "@/data/seed/products";

import enMessages from "../../messages/en.json";

vi.mock("@/components/public/product-card", () => ({
  ProductCard: ({ product }: { product: { id: string; name: { en: string } } }) => (
    <article data-testid="product-card">{product.name.en}</article>
  ),
}));

function renderCatalog(initialCategoryId: string | null = null) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <ProductCatalog
        products={seedProducts}
        categories={seedCategories}
        locale="en"
        initialCategoryId={initialCategoryId}
      />
    </NextIntlClientProvider>,
  );
}

function expectedCountLabel(count: number): RegExp {
  return count === 1 ? /^1 product$/ : new RegExp(`^${count} products$`);
}

describe("ProductCatalog", () => {
  it("renders all products initially", () => {
    renderCatalog();

    expect(screen.getByText(expectedCountLabel(seedProducts.length))).toBeInTheDocument();
    expect(screen.getAllByTestId("product-card")).toHaveLength(seedProducts.length);
  });

  it("filters products as the visitor types", async () => {
    const user = userEvent.setup();
    renderCatalog();

    await user.type(screen.getByLabelText(enMessages.products.searchLabel), "TEL-FDM-001");

    await waitFor(() => {
      expect(screen.getByText(expectedCountLabel(1))).toBeInTheDocument();
    });
    expect(screen.getByTestId("product-card")).toHaveTextContent("Tello Forge X1");
  });

  it("shows an empty state and can clear the search", async () => {
    const user = userEvent.setup();
    renderCatalog();

    await user.type(screen.getByLabelText(enMessages.products.searchLabel), "no-such-item");

    expect(await screen.findByText(enMessages.products.emptyTitle)).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: enMessages.products.clearFilters })[0]!);

    await waitFor(() => {
      expect(screen.getAllByTestId("product-card")).toHaveLength(seedProducts.length);
    });
  });

  it("respects an initial category filter", () => {
    const category = seedCategories.find((candidate) =>
      seedProducts.some((product) => product.categoryId === candidate.id),
    )!;
    const count = seedProducts.filter((product) => product.categoryId === category.id).length;

    renderCatalog(category.id);

    expect(screen.getByText(expectedCountLabel(count))).toBeInTheDocument();
    expect(screen.getAllByTestId("product-card")).toHaveLength(count);
  });
});
