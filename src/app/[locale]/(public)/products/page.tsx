import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProductCatalog } from "@/components/public/product-catalog";
import type { Locale } from "@/i18n/routing";
import { localizedAlternates } from "@/lib/metadata";
import { getPublicCatalog } from "@/repositories/public-catalog";

interface ProductsPageProps {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ category?: string | string[]; q?: string | string[] }>;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params }: ProductsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("productsTitle"),
    description: t("productsDescription"),
    alternates: localizedAlternates(locale, "/products"),
  };
}

export default async function ProductsPage({ params, searchParams }: ProductsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [catalog, t, query] = await Promise.all([
    getPublicCatalog(),
    getTranslations("products"),
    searchParams,
  ]);

  const categorySlug = firstValue(query.category);
  const initialCategoryId =
    catalog.categories.find((category) => category.slug === categorySlug)?.id ?? null;
  const initialQuery = firstValue(query.q) ?? "";

  return (
    <>
      <section className="surface-glow border-b border-border/70">
        <div className="container-page py-12 md:py-16">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            {t("description")}
          </p>
        </div>
      </section>

      <section className="section-space pt-10 md:pt-12">
        <div className="container-page">
          <ProductCatalog
            products={catalog.products}
            categories={catalog.categories}
            locale={locale}
            initialCategoryId={initialCategoryId}
            initialQuery={initialQuery}
          />
        </div>
      </section>
    </>
  );
}
