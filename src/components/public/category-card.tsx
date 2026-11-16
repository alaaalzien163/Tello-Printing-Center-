import {
  ArrowRight,
  Boxes,
  Droplets,
  FileText,
  Layers,
  Printer,
  ScanLine,
  Wrench,
} from "lucide-react";
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
 * Text and icon category card. Categories deliberately have no image: the card
 * relies on a clear label, an optional description and the product count so the
 * catalog stays fast and the product photography keeps the focus.
 */
function CategoryIcon({ slug }: { slug: string }) {
  const value = slug.toLowerCase();
  const className = "size-5";

  if (value.includes("ink") || value.includes("toner")) {
    return <Droplets className={className} aria-hidden="true" />;
  }
  if (value.includes("paper") || value.includes("document")) {
    return <FileText className={className} aria-hidden="true" />;
  }
  if (value.includes("scan")) {
    return <ScanLine className={className} aria-hidden="true" />;
  }
  if (value.includes("part") || value.includes("accessor") || value.includes("spare")) {
    return <Wrench className={className} aria-hidden="true" />;
  }
  if (value.includes("finish") || value.includes("material") || value.includes("filament")) {
    return <Layers className={className} aria-hidden="true" />;
  }
  if (value.includes("print")) {
    return <Printer className={className} aria-hidden="true" />;
  }
  return <Boxes className={className} aria-hidden="true" />;
}

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
        "group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-soft",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-primary-text">
          <CategoryIcon slug={category.slug} />
        </span>
        <div className="min-w-0">
          <h3 className="text-base leading-snug font-semibold text-foreground">{name}</h3>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {t("itemCount", { count: productCount })}
          </p>
        </div>
      </div>

      {description ? (
        <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">{description}</p>
      ) : null}

      <span className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-medium text-primary-text">
        {t("viewProducts")}
        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
