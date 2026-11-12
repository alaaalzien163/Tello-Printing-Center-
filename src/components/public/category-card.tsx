import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ProductMedia } from "@/components/shared/product-media";
import { Badge } from "@/components/ui/badge";
import type { Category } from "@/domain/category";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pickLocalized } from "@/lib/format";
import { cn } from "@/lib/utils";

interface CategoryCardProps {
  category: Category;
  productCount: number;
  locale: Locale;
  className?: string;
}

export async function CategoryCard({
  category,
  productCount,
  locale,
  className,
}: CategoryCardProps) {
  const t = await getTranslations("categories");
  const name = pickLocalized(category.name, locale);

  return (
    <Link
      href="/products#catalog"
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card ring-1 ring-transparent transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-lift",
        className,
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <ProductMedia
          src={category.image.url}
          alt={pickLocalized(category.image.alt, locale)}
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
          imageClassName="transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/60 via-brand-navy/5 to-transparent" />
        <Badge className="absolute start-3 top-3 border-0 bg-card/90 text-foreground backdrop-blur">
          {t("itemCount", { count: productCount })}
        </Badge>
        <span className="absolute end-3 bottom-3 flex size-9 translate-y-1 items-center justify-center rounded-full bg-card/90 text-foreground opacity-0 shadow-sm backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-base font-semibold text-foreground transition-colors group-hover:text-primary">
          {name}
        </h3>
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
          {pickLocalized(category.description, locale)}
        </p>
        <span className="mt-auto pt-3 text-xs font-semibold text-primary">{t("viewProducts")}</span>
      </div>
    </Link>
  );
}
