"use client";

import { ArrowUpRight, Star } from "lucide-react";
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
  const href = `/products/${product.slug}`;

  return (
    <Card
      className={cn(
        "group h-full gap-0 overflow-hidden border-0 py-0 ring-1 ring-border/80 transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-lift",
        className,
      )}
    >
      <Link
        href={href}
        className="relative block aspect-[4/3] overflow-hidden bg-muted focus-visible:outline-offset-[-4px]"
        aria-label={`${t("viewDetails")} — ${name}`}
      >
        <ProductMedia
          src={product.image.url}
          alt={pickLocalized(product.image.alt, locale)}
          sizes="(min-width: 1280px) 22rem, (min-width: 768px) 33vw, 90vw"
          imageClassName="transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/35 via-transparent to-transparent opacity-70" />
        {product.featured ? (
          <Badge className="absolute start-3 top-3 gap-1 bg-card/90 text-foreground shadow-sm backdrop-blur">
            <Star className="size-3 fill-warning text-warning" aria-hidden="true" />
            {t("featured")}
          </Badge>
        ) : null}
      </Link>

      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[0.68rem] font-semibold tracking-[0.14em] text-primary uppercase">
            {categoryName}
          </span>
          <span className="font-mono text-[0.68rem] tracking-wide text-muted-foreground" dir="ltr">
            {product.sku}
          </span>
        </div>

        <h3 className="text-[1.05rem] leading-snug font-semibold text-foreground">
          <Link href={href} className="transition-colors hover:text-primary">
            {name}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{description}</p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div>
            <span className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
              {t("price")}
            </span>
            <p className="text-lg font-semibold text-foreground">{price}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <WhatsAppOrderButton
              productName={name}
              sku={product.sku}
              formattedPrice={price}
              productPath={`/${locale}${href}`}
              size="icon-sm"
              iconOnly
              className="rounded-lg"
            />
            <Link
              href={href}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={`${t("viewDetails")} — ${name}`}
            >
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
