import { ChevronRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  label: string;
  className?: string;
}

/**
 * Semantic, locale-aware breadcrumb trail.
 * The last item is rendered as the current page and is never a link.
 */
export function Breadcrumbs({ items, label, className }: BreadcrumbsProps) {
  return (
    <nav aria-label={label} className={className}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <li
              key={`${item.href ?? "current"}-${index}`}
              className="flex min-w-0 items-center gap-1.5"
            >
              {index > 0 ? (
                <ChevronRight
                  className="size-3.5 shrink-0 text-muted-foreground/60 rtl:rotate-180"
                  aria-hidden="true"
                />
              ) : null}

              {isCurrent ? (
                <span
                  aria-current="page"
                  title={item.label}
                  className="max-w-[16rem] truncate font-medium text-foreground sm:max-w-[24rem]"
                >
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  title={item.label}
                  className={cn(
                    "max-w-[10rem] truncate rounded-sm transition-colors hover:text-foreground",
                    "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                    "sm:max-w-[16rem]",
                  )}
                >
                  {item.label}
                </Link>
              ) : (
                <span title={item.label} className="max-w-[10rem] truncate sm:max-w-[16rem]">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
