import { LayoutGrid, PackageSearch } from "lucide-react";

import { CategoryCard } from "@/components/public/category-card";
import { ProductCard } from "@/components/public/product-card";
import { EmptyState } from "@/components/shared/empty-state";
import type { Category } from "@/domain/category";
import type { Product } from "@/domain/product";
import type { Locale } from "@/i18n/routing";
import { pickLocalized } from "@/lib/format";
import { getCategoryProductCounts } from "@/services/catalog";

export interface ProductCatalogLabels {
  categoriesTitle: string;
  jumpToCategory: string;
  categoryCount: string;
  emptyTitle: string;
  emptyDescription: string;
  categoryEmptyTitle: string;
  categoryEmptyDescription: string;
  formatProductCount: (count: number) => string;
}

interface ProductCatalogProps {
  categories: Category[];
  products: Product[];
  locale: Locale;
  labels: ProductCatalogLabels;
}

function categoryAnchor(slug: string): string {
  return `category-${slug}`;
}

/**
 * Full public catalog: a prominent category overview for navigation, followed by
 * one product section per active category. Categories without active products
 * keep their section and show a short empty note instead of disappearing, so the
 * catalog never looks incomplete.
 */
export function ProductCatalog({ categories, products, locale, labels }: ProductCatalogProps) {
  if (categories.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title={labels.emptyTitle}
        description={labels.emptyDescription}
      />
    );
  }

  const counts = getCategoryProductCounts(products);
  const productsByCategory = new Map<string, Product[]>();

  for (const product of products) {
    const bucket = productsByCategory.get(product.categoryId);
    if (bucket) {
      bucket.push(product);
    } else {
      productsByCategory.set(product.categoryId, [product]);
    }
  }

  return (
    <div id="catalog" className="scroll-mt-24 space-y-14">
      <section aria-labelledby="catalog-categories">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h2
            id="catalog-categories"
            className="text-2xl font-semibold tracking-tight text-foreground"
          >
            {labels.categoriesTitle}
          </h2>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {labels.categoryCount}
          </p>
        </div>

        <div
          data-testid="category-grid"
          className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              locale={locale}
              productCount={counts[category.id] ?? 0}
            />
          ))}
        </div>
      </section>

      <nav aria-label={labels.jumpToCategory} className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-semibold text-foreground">{labels.jumpToCategory}</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {categories.map((category) => (
            <li key={category.id}>
              <a
                href={`#${categoryAnchor(category.slug)}`}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary-text"
              >
                {pickLocalized(category.name, locale)}
                <span className="text-xs font-normal text-muted-foreground" dir="ltr">
                  {counts[category.id] ?? 0}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {categories.map((category) => {
        const name = pickLocalized(category.name, locale);
        const categoryProducts = productsByCategory.get(category.id) ?? [];
        const headingId = `${categoryAnchor(category.slug)}-title`;

        return (
          <section
            key={category.id}
            id={categoryAnchor(category.slug)}
            aria-labelledby={headingId}
            className="scroll-mt-24"
          >
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-border pb-3">
              <h2 id={headingId} className="text-2xl font-semibold tracking-tight text-foreground">
                {name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {labels.formatProductCount(categoryProducts.length)}
              </p>
            </div>

            {categoryProducts.length === 0 ? (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-dashed border-border bg-card/60 px-5 py-6">
                <PackageSearch
                  className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {labels.categoryEmptyTitle}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {labels.categoryEmptyDescription}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {categoryProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    categoryName={name}
                    locale={locale}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
