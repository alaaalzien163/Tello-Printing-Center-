"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { WhatsAppOrderButton } from "@/components/public/whatsapp-order-button";
import { ProductMedia } from "@/components/shared/product-media";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Product } from "@/domain/product";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatPrice, pickLocalized } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  categoryName: string;
  locale: Locale;
  className?: string;
}

export function ProductCard({ product, categoryName, locale, className }: ProductCardProps) {
  const t = useTranslations("products");
  const name = pickLocalized(product.name, locale);
  const description = pickLocalized(product.description, locale);
  const price = formatPrice(product.price, product.currency, locale);
  const brand = product.brand ? pickLocalized(product.brand, locale) : "";
  const identity = [brand, product.model].filter(Boolean).join(" · ");
  const href = `/products/${product.slug}`;

  return (
    <Card
      className={cn(
        "group h-full gap-0 overflow-hidden border border-border py-0 shadow-none transition-[border-color,box-shadow] duration-200 hover:border-primary/35 hover:shadow-soft",
        className,
      )}
    >
      <Link
        href={href}
        className="relative block aspect-[4/3] overflow-hidden border-b border-border bg-secondary focus-visible:outline-offset-[-4px]"
        aria-label={`${t("viewDetails")} — ${name}`}
      >
        <ProductMedia
          src={product.image.url}
          alt={pickLocalized(product.image.alt, locale)}
          sizes="(min-width: 1280px) 22rem, (min-width: 768px) 33vw, 90vw"
          imageClassName="transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
        {product.featured ? (
          <Badge className="absolute start-3 top-3 border border-border bg-card text-[0.65rem] text-foreground shadow-sm">
            {t("featured")}
          </Badge>
        ) : null}
      </Link>

      <CardContent className="flex flex-1 flex-col gap-2.5 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[0.68rem] font-semibold tracking-[0.12em] text-primary-text uppercase">
            {categoryName}
          </span>
          <span className="font-mono text-[0.68rem] tracking-wide text-muted-foreground" dir="ltr">
            {product.sku}
          </span>
        </div>

        <h3 className="text-[1.05rem] leading-snug font-semibold text-foreground">
          <Link href={href} className="transition-colors hover:text-primary-text">
            {name}
          </Link>
        </h3>
        {identity ? (
          <p className="-mt-1 text-xs font-medium text-muted-foreground" dir="auto">
            {identity}
          </p>
        ) : null}
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{description}</p>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-3">
          <div>
            <span className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
              {t("price")}
            </span>
            <p className="text-lg font-semibold text-foreground">{price}</p>
          </div>
          <WhatsAppOrderButton
            productName={name}
            sku={product.sku}
            formattedPrice={price}
            productPath={`/${locale}${href}`}
            size="sm"
          />
        </div>

        <Link
          href={href}
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary-text"
        >
          {t("viewDetails")}
          <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}
