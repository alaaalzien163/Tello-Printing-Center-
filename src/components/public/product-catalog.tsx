"use client";

import { PackageSearch, Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDeferredValue, useMemo, useState } from "react";

import { ProductCard } from "@/components/public/product-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category } from "@/domain/category";
import type { Product } from "@/domain/product";
import type { Locale } from "@/i18n/routing";
import { pickLocalized } from "@/lib/format";
import { filterProducts } from "@/services/catalog";

interface ProductCatalogProps {
  products: Product[];
  categories: Category[];
  locale: Locale;
  initialQuery?: string;
  initialCategoryId?: string | null;
}

export function ProductCatalog({
  products,
  categories,
  locale,
  initialQuery = "",
  initialCategoryId = null,
}: ProductCatalogProps) {
  const t = useTranslations("products");
  const [query, setQuery] = useState(initialQuery);
  const [categoryId, setCategoryId] = useState<string | null>(initialCategoryId);
  const deferredQuery = useDeferredValue(query);

  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, pickLocalized(category.name, locale)])),
    [categories, locale],
  );

  const filtered = useMemo(
    () => filterProducts(products, { query: deferredQuery, categoryId }),
    [products, deferredQuery, categoryId],
  );

  const hasFilters = query.trim().length > 0 || categoryId !== null;

  function clearFilters() {
    setQuery("");
    setCategoryId(null);
  }

  return (
    <div>
      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_16rem] md:items-end">
          <div className="grid gap-2">
            <Label htmlFor="catalog-search" className="text-xs font-medium text-muted-foreground">
              {t("searchLabel")}
            </Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="catalog-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className="ps-9"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label
              htmlFor="catalog-category"
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
            >
              <SlidersHorizontal className="size-3.5" aria-hidden="true" />
              {t("filterLabel")}
            </Label>
            <Select
              value={categoryId ?? "all"}
              onValueChange={(value) => setCategoryId(value === "all" ? null : value)}
            >
              <SelectTrigger id="catalog-category" className="w-full">
                <SelectValue placeholder={t("allCategories")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allCategories")}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {pickLocalized(category.name, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {t("resultsCount", { count: filtered.length })}
          </p>
          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X aria-hidden="true" />
              {t("clearFilters")}
            </Button>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={PackageSearch}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button variant="outline" onClick={clearFilters}>
              {t("clearFilters")}
            </Button>
          }
        />
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
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
