"use client";

import {
  Archive,
  CheckCircle2,
  Eye,
  EyeOff,
  LayoutGrid,
  Package,
  Pencil,
  PlusCircle,
  Star,
  StarOff,
  Tags,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";

import { useDemoData } from "@/components/admin/demo-data-provider";
import { ProductMedia } from "@/components/shared/product-media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityAction, ActivityEntry } from "@/domain/activity";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDate, formatPrice, pickLocalized } from "@/lib/format";
import {
  getCatalogStats,
  getCategoryName,
  getRecentProducts,
} from "@/services/catalog";

const activityMessageKey = {
  "product.created": "created",
  "product.updated": "updated",
  "product.deleted": "deleted",
  "product.activated": "activated",
  "product.deactivated": "deactivated",
  "product.featured": "featured",
  "product.unfeatured": "unfeatured",
  "category.created": "categoryCreated",
  "category.updated": "categoryUpdated",
  "category.deleted": "categoryDeleted",
} as const satisfies Record<ActivityAction, string>;

const activityIcon: Record<ActivityAction, LucideIcon> = {
  "product.created": PlusCircle,
  "product.updated": Pencil,
  "product.deleted": Trash2,
  "product.activated": Eye,
  "product.deactivated": EyeOff,
  "product.featured": Star,
  "product.unfeatured": StarOff,
  "category.created": Tags,
  "category.updated": Tags,
  "category.deleted": Tags,
};

const destructiveActions = new Set<ActivityAction>(["product.deleted", "category.deleted"]);

function ActivityRow({ entry, locale }: { entry: ActivityEntry; locale: Locale }) {
  const t = useTranslations("admin.overview");
  const Icon = activityIcon[entry.action];
  const name = pickLocalized(entry.entityName, locale);

  return (
    <li className="flex gap-3 py-3.5">
      <span
        className={
          destructiveActions.has(entry.action)
            ? "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
            : "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
        }
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm leading-5 text-foreground">
          {t(`activity.${activityMessageKey[entry.action]}`, { product: name, category: name })}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{formatDate(entry.createdAt, locale)}</p>
      </div>
    </li>
  );
}

export function AdminOverview() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const { products, categories, activity, loading, error, reload } = useDemoData();

  const stats = getCatalogStats(products, categories);
  const recentProducts = getRecentProducts(products, 5);

  const statCards = [
    { key: "totalProducts", label: t("overview.totalProducts"), value: stats.totalProducts, icon: Package },
    { key: "totalCategories", label: t("overview.totalCategories"), value: stats.totalCategories, icon: Tags },
    { key: "activeProducts", label: t("overview.activeProducts"), value: stats.activeProducts, icon: CheckCircle2 },
    { key: "inactiveProducts", label: t("overview.inactiveProducts"), value: stats.inactiveProducts, icon: Archive },
    { key: "featuredProducts", label: t("overview.featuredProducts"), value: stats.featuredProducts, icon: Star },
  ] as const;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="text-base font-semibold text-foreground">{t("common.errorTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("common.errorDescription")}</p>
        <Button variant="outline" className="mt-4" onClick={() => void reload()}>
          {tc("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("overview.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("overview.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/admin/products#new">
              <PlusCircle aria-hidden="true" />
              {t("overview.addProduct")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/categories#new">
              <Tags aria-hidden="true" />
              {t("overview.addCategory")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map(({ key, label, value, icon: Icon }) => (
          <div key={key} className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/8 text-primary">
                <Icon className="size-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-xl border border-border bg-card shadow-soft" aria-labelledby="recent-products-title">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h3 id="recent-products-title" className="text-sm font-semibold text-foreground">
                {t("overview.recentProducts")}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("overview.recentProductsDescription")}
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/products">{t("overview.manageProducts")}</Link>
            </Button>
          </div>

          {recentProducts.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              {t("overview.noProducts")}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentProducts.map((product) => (
                <li key={product.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <ProductMedia
                      src={product.image.url}
                      alt={pickLocalized(product.image.alt, locale)}
                      sizes="44px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {pickLocalized(product.name, locale)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {getCategoryName(categories, product.categoryId, locale)} ·{" "}
                      <span className="font-mono" dir="ltr">
                        {product.sku}
                      </span>
                    </p>
                  </div>
                  <div className="hidden text-end sm:block">
                    <p className="text-sm font-medium text-foreground">
                      {formatPrice(product.price, product.currency, locale)}
                    </p>
                    <Badge
                      variant={product.active ? "secondary" : "outline"}
                      className="mt-1 text-[0.65rem]"
                    >
                      {product.active ? tc("active") : tc("inactive")}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card shadow-soft" aria-labelledby="activity-title">
          <div className="border-b border-border px-5 py-4">
            <h3 id="activity-title" className="text-sm font-semibold text-foreground">
              {t("overview.recentActivity")}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("overview.recentActivityDescription")}
            </p>
          </div>
          {activity.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              {t("overview.noActivity")}
            </div>
          ) : (
            <ul className="divide-y divide-border px-5">
              {activity.map((entry) => (
                <ActivityRow key={entry.id} entry={entry} locale={locale} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-xs leading-5 text-muted-foreground">
        <LayoutGrid className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>{t("overview.demoDataNote")}</p>
      </div>
    </div>
  );
}
