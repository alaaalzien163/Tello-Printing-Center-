import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { CategoryCard } from "@/components/public/category-card";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import type { Category } from "@/domain/category";
import type { Product } from "@/domain/product";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCategoryProductCounts } from "@/services/catalog";

interface CategoriesSectionProps {
  categories: Category[];
  products: Product[];
  locale: Locale;
}

export async function CategoriesSection({ categories, products, locale }: CategoriesSectionProps) {
  const t = await getTranslations("categories");
  const counts = getCategoryProductCounts(products);

  return (
    <section className="section-space border-y border-border/70 bg-muted/35">
      <div className="container-page">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
          action={
            <Button asChild variant="outline">
              <Link href="/products">
                {t("viewProducts")}
                <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
              </Link>
            </Button>
          }
        />

        {categories.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center text-sm text-muted-foreground">
            {t("empty")}
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                locale={locale}
                productCount={counts[category.id] ?? 0}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
