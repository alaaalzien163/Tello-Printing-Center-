"use client";

import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { WhatsAppOrderButton } from "@/components/public/whatsapp-order-button";
import { ProductMedia } from "@/components/shared/product-media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Product, ProductVariant } from "@/domain/product";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatPrice, pickLocalized } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ProductDetailProps {
  product: Product;
  variants: ProductVariant[];
  categoryName: string;
}

/**
 * Interactive product detail panel. Selecting a size/measurement swaps the
 * main image to that variant's own image (falling back to the product image),
 * updates the price, SKU and option label, and rebuilds the WhatsApp message.
 */
export function ProductDetail({ product, variants, categoryName }: ProductDetailProps) {
  const t = useTranslations("products");
  const locale = useLocale() as Locale;
  const [selectedId, setSelectedId] = useState<string | null>(
    variants[0]?.id ?? null,
  );

  const selected = variants.find((variant) => variant.id === selectedId) ?? null;
  const productName = pickLocalized(product.name, locale);
  const productDescription = pickLocalized(product.description, locale);
  const productImage = product.image.url;
  const productAlt = pickLocalized(product.image.alt, locale);

  const selectedLabel = selected ? pickLocalized(selected.sizeLabel, locale) : "";
  const price = selected?.price ?? product.price;
  const currency = selected?.currency ?? product.currency;
  const formattedPrice = formatPrice(price, currency, locale);
  const sku = selected?.sku || product.sku;

  const variantImage = selected?.image.url?.trim() ?? "";
  const imageSrc = variantImage || productImage;
  const imageAlt = variantImage
    ? pickLocalized(selected!.image.alt, locale)
    : productAlt;

  const specs = [
    { label: t("sku"), value: sku },
    { label: t("category"), value: categoryName },
    {
      label: t("availability"),
      value: product.active ? t("inStock") : t("outOfStock"),
    },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
      <div className="relative overflow-hidden rounded-xl border border-border bg-secondary shadow-soft">
        <div className="relative aspect-[4/3] w-full">
          <div className="absolute inset-0" data-testid="product-main-image">
            <ProductMedia
              src={imageSrc}
              fallbackSrc={productImage}
              alt={imageAlt}
              sizes="(min-width: 1024px) 36rem, 92vw"
              priority
            />
          </div>
        </div>
        {product.featured ? (
          <Badge className="absolute start-4 top-4 bg-card text-foreground shadow-sm">
            {t("featured")}
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold tracking-[0.16em] text-primary-text uppercase">
            {categoryName}
          </span>
          <span className="text-muted-foreground/40" aria-hidden="true">
            /
          </span>
          <span className="font-mono text-xs tracking-wide text-muted-foreground" dir="ltr">
            {sku}
          </span>
        </div>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {productName}
        </h1>

        <div className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-2" aria-live="polite">
          <p className="text-3xl font-semibold text-foreground" data-testid="product-price">
            {formattedPrice}
          </p>
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
        {selectedLabel ? (
          <p className="mt-2 text-sm text-muted-foreground" data-testid="selected-variant">
            {selectedLabel}
          </p>
        ) : null}

        <p className="mt-6 text-base leading-7 text-muted-foreground">{productDescription}</p>

        {variants.length > 0 ? (
          <div className="mt-6">
            <h2
              id="product-variants-title"
              className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase"
            >
              {t("variantsTitle")}
            </h2>
            <div
              role="group"
              aria-labelledby="product-variants-title"
              className="mt-3 grid gap-2 sm:grid-cols-2"
            >
              {variants.map((variant) => {
                const isSelected = variant.id === selectedId;
                const label = pickLocalized(variant.sizeLabel, locale);
                const variantSrc = variant.image.url?.trim() || productImage;
                const variantAlt = variant.image.url?.trim()
                  ? pickLocalized(variant.image.alt, locale)
                  : productAlt;

                return (
                  <button
                    key={variant.id}
                    type="button"
                    aria-pressed={isSelected}
                    data-testid="variant-option"
                    onClick={() => setSelectedId(variant.id)}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl border p-2.5 text-start transition-[border-color,background-color,box-shadow] duration-200",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                        : "border-border bg-card hover:border-primary/30 hover:bg-muted/50",
                    )}
                  >
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-muted">
                      <ProductMedia
                        src={variantSrc}
                        fallbackSrc={productImage}
                        alt={variantAlt}
                        sizes="56px"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        data-testid="variant-label"
                        className="block truncate text-sm font-medium text-foreground"
                      >
                        {label}
                      </span>
                      <span
                        data-testid="variant-price"
                        className={cn(
                          "mt-0.5 block text-xs",
                          isSelected ? "text-primary-text" : "text-muted-foreground",
                        )}
                      >
                        {formatPrice(variant.price, variant.currency, locale)}
                      </span>
                    </span>
                    {isSelected ? (
                      <CheckCircle2
                        className="size-4 shrink-0 text-primary-text"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <WhatsAppOrderButton
            productName={productName}
            sku={sku}
            formattedPrice={formattedPrice}
            productPath={`/${locale}/products/${product.slug}`}
            variantLabel={selectedLabel || undefined}
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
  );
}
