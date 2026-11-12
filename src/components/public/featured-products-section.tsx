import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ProductCard } from "@/components/public/product-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import type { Category } from "@/domain/category";
import type { Product } from "@/domain/product";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCategoryName } from "@/services/catalog";
import { PackageSearch } from "lucide-react";

interface FeaturedProductsSectionProps {
  products: Product[];
  categories: Category[];
  locale: Locale;
}

export async function FeaturedProductsSection({
  products,
  categories,
  locale,
}: FeaturedProductsSectionProps) {
  const t = await getTranslations("products");

  return (
    <section className="section-space">
      <div className="container-page">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
          action={
            <Button asChild variant="outline">
              <Link href="/products">
                {t("viewDetails")}
                <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
              </Link>
            </Button>
          }
        />

        {products.length === 0 ? (
          <EmptyState
            className="mt-10"
            icon={PackageSearch}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                locale={locale}
                categoryName={getCategoryName(categories, product.categoryId, locale)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
