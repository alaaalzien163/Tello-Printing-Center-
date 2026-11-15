import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

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

/**
 * Typographic category card. Categories deliberately have no image: the card
 * relies on the name, optional description, product count and a subtle hover
 * state instead of artwork or decorative image placeholders.
 */
export async function CategoryCard({
  category,
  productCount,
  locale,
  className,
}: CategoryCardProps) {
  const t = await getTranslations("categories");
  const name = pickLocalized(category.name, locale);
  const description = pickLocalized(category.description, locale);

  return (
    <Link
      href={`/products/category/${category.slug}`}
      className={cn(
        "group flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-6 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lift",
        className,
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg leading-snug font-semibold text-foreground transition-colors group-hover:text-primary-text">
            {name}
          </h3>
          <ArrowUpRight
            className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition-[color,opacity] duration-300 group-hover:text-primary-text group-hover:opacity-100"
            aria-hidden="true"
          />
        </div>
        {description ? (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
        <span className="text-xs font-medium text-muted-foreground">
          {t("itemCount", { count: productCount })}
        </span>
        <span className="text-xs font-semibold text-primary-text">{t("viewProducts")}</span>
      </div>
    </Link>
  );
}
