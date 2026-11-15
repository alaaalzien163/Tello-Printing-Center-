import { ArrowLeft, PackageSearch } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProductCard } from "@/components/public/product-card";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/shared/breadcrumbs";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { pickLocalized } from "@/lib/format";
import { localizedAlternates } from "@/lib/metadata";
import {
  getPublicCategoryBySlug,
  getPublicCategorySlugs,
  getPublicProductsByCategory,
} from "@/repositories/public-catalog";

interface CategoryPageProps {
  params: Promise<{ locale: Locale; slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getPublicCategorySlugs();

  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const category = await getPublicCategoryBySlug(slug);

  if (!category) {
    const t = await getTranslations({ locale, namespace: "products" });
    return { title: t("categoryNotFoundTitle"), robots: { index: false, follow: false } };
  }

  const name = pickLocalized(category.name, locale);
  const description = pickLocalized(category.description, locale).slice(0, 160);

  return {
    title: name,
    description,
    alternates: localizedAlternates(locale, `/products/category/${category.slug}`),
    openGraph: {
      type: "website",
      title: name,
      description,
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [category, products, t, tNav, tCommon] = await Promise.all([
    getPublicCategoryBySlug(slug),
    getPublicProductsByCategory(slug),
    getTranslations("products"),
    getTranslations("nav"),
    getTranslations("common"),
  ]);

  if (!category) notFound();

  const name = pickLocalized(category.name, locale);
  const description = pickLocalized(category.description, locale);

  const breadcrumbs: BreadcrumbItem[] = [
    { label: tNav("home"), href: "/" },
    { label: tNav("products"), href: "/products" },
    { label: name },
  ];

  return (
    <div>
      <div className="border-b border-border/70 bg-muted/30">
        <div className="container-page py-4">
          <Breadcrumbs label={tCommon("breadcrumb")} items={breadcrumbs} />
        </div>
      </div>

      <section data-testid="category-hero" className="surface-glow border-b border-border/70">
        <div className="container-page py-10 md:py-14">
          <Button asChild variant="ghost" size="sm" className="-ms-3 text-muted-foreground">
            <Link href="/products">
              <ArrowLeft className="rtl:rotate-180" aria-hidden="true" />
              {t("backToCategories")}
            </Link>
          </Button>

          <div className="mt-6 max-w-3xl">
            <span className="eyebrow block">{t("categoryEyebrow")}</span>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {name}
            </h1>
            {description ? (
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                {description}
              </p>
            ) : null}
            <p className="mt-5 text-sm font-medium text-muted-foreground">
              {t("resultsCount", { count: products.length })}
            </p>
          </div>
        </div>
      </section>

      <section className="section-space pt-10 md:pt-12">
        <div className="container-page">
          <div id="catalog" className="scroll-mt-24">
            {products.length === 0 ? (
              <EmptyState
                icon={PackageSearch}
                title={t("categoryEmptyTitle")}
                description={t("categoryEmptyDescription")}
                action={
                  <Button asChild variant="outline">
                    <Link href="/products">{t("backToCategories")}</Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    categoryName={name}
                    locale={locale}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
