"use client";

import { PackageSearch } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { ProductCard } from "@/components/public/product-card";
import { EmptyState } from "@/components/shared/empty-state";
import type { Category } from "@/domain/category";
import type { Product } from "@/domain/product";
import type { Locale } from "@/i18n/routing";
import { pickLocalized } from "@/lib/format";

interface ProductCatalogProps {
  products: Product[];
  categories: Category[];
  locale: Locale;
}

export function ProductCatalog({ products, categories, locale }: ProductCatalogProps) {
  const t = useTranslations("products");

  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, pickLocalized(category.name, locale)])),
    [categories, locale],
  );

  return (
    <div id="catalog" className="scroll-mt-24">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {t("resultsCount", { count: products.length })}
      </p>

      {products.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={PackageSearch}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              locale={locale}
              categoryName={categoryNames.get(product.categoryId) ?? "—"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
