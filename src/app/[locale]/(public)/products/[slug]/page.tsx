import { Package } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProductCard } from "@/components/public/product-card";
import { ProductDetail } from "@/components/public/product-detail";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/shared/breadcrumbs";
import { absoluteUrl } from "@/config/site";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { pickLocalized } from "@/lib/format";
import { localizedAlternates } from "@/lib/metadata";
import {
  getPublicCatalog,
  getPublicProductBySlug,
  getPublicProductSlugs,
  getPublicProductVariants,
} from "@/repositories/public-catalog";
import { getCategoryName, getRelatedProducts } from "@/services/catalog";

interface ProductPageProps {
  params: Promise<{ locale: Locale; slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getPublicProductSlugs();

  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getPublicProductBySlug(slug);

  if (!product) {
    const t = await getTranslations({ locale, namespace: "products" });
    return { title: t("notFoundTitle"), robots: { index: false, follow: false } };
  }

  const name = pickLocalized(product.name, locale);
  const description = pickLocalized(product.description, locale).slice(0, 160);

  return {
    title: name,
    description,
    alternates: localizedAlternates(locale, `/products/${product.slug}`),
    openGraph: {
      type: "website",
      title: name,
      description,
      url: `${absoluteUrl(`/${locale}/products/${product.slug}`)}`,
      images: [
        {
          url: product.image.url,
          alt: pickLocalized(product.image.alt, locale),
        },
      ],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [product, catalog, t, tNav, tCommon] = await Promise.all([
    getPublicProductBySlug(slug),
    getPublicCatalog(),
    getTranslations("products"),
    getTranslations("nav"),
    getTranslations("common"),
  ]);

  if (!product) notFound();

  const variants = await getPublicProductVariants(product.id);
  const name = pickLocalized(product.name, locale);
  const description = pickLocalized(product.description, locale);
  const category = catalog.categories.find((item) => item.id === product.categoryId) ?? null;
  const categoryName = getCategoryName(catalog.categories, product.categoryId, locale);
  const related = getRelatedProducts(catalog.products, product, 3);

  // Missing or unavailable category data is omitted rather than shown as a broken link.
  const breadcrumbs: BreadcrumbItem[] = [
    { label: tNav("home"), href: "/" },
    ...(category
      ? [
          {
            label: pickLocalized(category.name, locale),
            href: `/products/category/${category.slug}`,
          },
        ]
      : []),
    { label: name },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    sku: product.sku,
    image: [absoluteUrl(product.image.url)],
    category: categoryName,
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/${locale}/products/${product.slug}`),
      priceCurrency: product.currency,
      price: product.price,
      availability: product.active
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  const specs = [
    { label: t("sku"), value: product.sku },
    { label: t("category"), value: categoryName },
    { label: t("availability"), value: product.active ? t("inStock") : t("outOfStock") },
  ];

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="border-b border-border/70 bg-muted/30">
        <div className="container-page py-4">
          <Breadcrumbs label={tCommon("breadcrumb")} items={breadcrumbs} />
        </div>
      </div>

      <section className="container-page py-10 md:py-14">
        <ProductDetail product={product} variants={variants} categoryName={categoryName} />

        <div className="mt-14 grid gap-8 border-t border-border pt-10 lg:grid-cols-[1fr_20rem]">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{t("overview")}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Package className="size-4 text-primary-text" aria-hidden="true" />
              {t("specifications")}
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              {specs.map((spec) => (
                <div key={spec.label} className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{spec.label}</dt>
                  <dd className="text-end font-medium text-foreground">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="section-space border-t border-border/70 bg-muted/30">
          <div className="container-page">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {t("relatedTitle")}
            </h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  locale={locale}
                  categoryName={getCategoryName(catalog.categories, item.categoryId, locale)}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </article>
  );
}
