import { LayoutGrid } from "lucide-react";

import { CategoryCard } from "@/components/public/category-card";
import { EmptyState } from "@/components/shared/empty-state";
import type { Category } from "@/domain/category";
import type { Product } from "@/domain/product";
import type { Locale } from "@/i18n/routing";
import { getCategoryProductCounts } from "@/services/catalog";

export interface CategoryCatalogLabels {
  count: string;
  emptyTitle: string;
  emptyDescription: string;
}

interface CategoryCatalogProps {
  categories: Category[];
  products: Product[];
  locale: Locale;
  labels: CategoryCatalogLabels;
}

/**
 * Category-first entry point for the public catalog.
 * Products are intentionally not listed here; shoppers pick a category first.
 */
export function CategoryCatalog({ categories, products, locale, labels }: CategoryCatalogProps) {
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

  return (
    <div id="catalog" className="scroll-mt-24">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {labels.count}
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            locale={locale}
            productCount={counts[category.id] ?? 0}
          />
        ))}
      </div>
    </div>
  );
}
