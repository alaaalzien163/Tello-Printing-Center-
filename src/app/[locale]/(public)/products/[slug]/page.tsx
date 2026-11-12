import { ArrowLeft, CheckCircle2, ChevronRight, Package } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProductCard } from "@/components/public/product-card";
import { WhatsAppOrderButton } from "@/components/public/whatsapp-order-button";
import { ProductMedia } from "@/components/shared/product-media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { absoluteUrl } from "@/config/site";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { formatPrice, pickLocalized } from "@/lib/format";
import { localizedAlternates } from "@/lib/metadata";
import {
  getPublicCatalog,
  getPublicProductBySlug,
  getPublicProductSlugs,
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

  const [product, catalog, t, tNav] = await Promise.all([
    getPublicProductBySlug(slug),
    getPublicCatalog(),
    getTranslations("products"),
    getTranslations("nav"),
  ]);

  if (!product) notFound();

  const name = pickLocalized(product.name, locale);
  const description = pickLocalized(product.description, locale);
  const imageAlt = pickLocalized(product.image.alt, locale);
  const price = formatPrice(product.price, product.currency, locale);
  const categoryName = getCategoryName(catalog.categories, product.categoryId, locale);
  const related = getRelatedProducts(catalog.products, product, 3);

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
    { label: t("price"), value: price },
  ];

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="border-b border-border/70 bg-muted/30">
        <div className="container-page py-4">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <li>
                <Link href="/" className="transition-colors hover:text-foreground">
                  {tNav("home")}
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-3.5 rtl:rotate-180" />
              </li>
              <li>
                <Link href="/products" className="transition-colors hover:text-foreground">
                  {t("eyebrow")}
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-3.5 rtl:rotate-180" />
              </li>
              <li aria-current="page" className="max-w-[16rem] truncate font-medium text-foreground">
                {name}
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <section className="container-page py-10 md:py-14">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-muted shadow-soft">
            <div className="relative aspect-[4/3] w-full">
              <ProductMedia
                src={product.image.url}
                alt={imageAlt}
                sizes="(min-width: 1024px) 36rem, 92vw"
                priority
              />
            </div>
            {product.featured ? (
              <Badge className="absolute start-4 top-4 bg-card/90 text-foreground backdrop-blur">
                {t("featured")}
              </Badge>
            ) : null}
          </div>

          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                {categoryName}
              </span>
              <span className="text-muted-foreground/40" aria-hidden="true">
                /
              </span>
              <span className="font-mono text-xs tracking-wide text-muted-foreground" dir="ltr">
                {product.sku}
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {name}
            </h1>

            <div className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-2">
              <p className="text-3xl font-semibold text-foreground">{price}</p>
              <span
                className={
                  product.active
                    ? "inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success"
                    : "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                }
              >
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                {product.active ? t("inStock") : t("outOfStock")}
              </span>
            </div>

            <p className="mt-6 text-base leading-7 text-muted-foreground">{description}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <WhatsAppOrderButton
                productName={name}
                sku={product.sku}
                formattedPrice={price}
                productPath={`/${locale}/products/${product.slug}`}
                size="lg"
              />
              <Button asChild variant="outline" size="lg">
                <Link href="/products">
                  <ArrowLeft className="rtl:rotate-180" aria-hidden="true" />
                  {t("backToProducts")}
                </Link>
              </Button>
            </div>

            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-6">
              {specs.map((spec) => (
                <div key={spec.label}>
                  <dt className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
                    {spec.label}
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="mt-14 grid gap-8 border-t border-border pt-10 lg:grid-cols-[1fr_20rem]">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{t("overview")}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Package className="size-4 text-primary" aria-hidden="true" />
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
