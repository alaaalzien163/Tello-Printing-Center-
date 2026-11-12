"use client";

import {
  Eye,
  EyeOff,
  MoreHorizontal,
  Package,
  Pencil,
  PlusCircle,
  Search,
  Star,
  StarOff,
  Trash2,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useDemoData } from "@/components/admin/demo-data-provider";
import { ProductFormDialog } from "@/components/admin/products/product-form-dialog";
import { ProductMedia } from "@/components/shared/product-media";
import { EmptyState } from "@/components/shared/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Product } from "@/domain/product";
import type { Locale } from "@/i18n/routing";
import { formatDate, formatPrice, pickLocalized } from "@/lib/format";
import { getRepositories } from "@/repositories";
import { getCategoryName } from "@/services/catalog";

const repositories = getRepositories();

type StatusFilter = "all" | "active" | "inactive";

const statusFilterKeys = {
  all: "allStatuses",
  active: "activeOnly",
  inactive: "inactiveOnly",
} as const satisfies Record<StatusFilter, string>;

export function ProductsManager() {
  const t = useTranslations("admin.products");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const { products, categories, loading, error, reload } = useDemoData();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (window.location.hash !== "#new") return;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    const timer = window.setTimeout(() => {
      setEditing(null);
      setDialogOpen(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, pickLocalized(category.name, locale)])),
    [categories, locale],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    return products
      .filter((product) => {
        if (categoryFilter !== "all" && product.categoryId !== categoryFilter) return false;
        if (statusFilter === "active" && !product.active) return false;
        if (statusFilter === "inactive" && product.active) return false;
        if (!query) return true;

        return [product.name.en, product.name.ar, product.sku]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [products, search, categoryFilter, statusFilter]);

  const hasFilters = search.trim().length > 0 || categoryFilter !== "all" || statusFilter !== "all";

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setDialogOpen(true);
  }

  function clearFilters() {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
  }

  async function toggleActive(product: Product) {
    setBusyId(product.id);
    try {
      await repositories.products.setActive(product.id, !product.active);
      await reload();
      toast.success(t("updateSuccess"));
    } catch {
      toast.error(t("updateError"));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleFeatured(product: Product) {
    setBusyId(product.id);
    try {
      await repositories.products.setFeatured(product.id, !product.featured);
      await reload();
      toast.success(t("updateSuccess"));
    } catch {
      toast.error(t("updateError"));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await repositories.products.delete(deleting.id);
      await reload();
      toast.success(t("deleteSuccess"));
      setDeleting(null);
    } catch {
      toast.error(t("deleteError"));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("emptyDescription")}</p>
        <Button variant="outline" className="mt-4" onClick={() => void reload()}>
          {tc("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <PlusCircle aria-hidden="true" />
          {t("addProduct")}
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
        <div className="grid gap-3 lg:grid-cols-[1fr_14rem_12rem_auto] lg:items-end">
          <div className="grid gap-2">
            <Label htmlFor="admin-product-search" className="text-xs text-muted-foreground">
              {tc("search")}
            </Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="admin-product-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className="ps-9"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="admin-product-category" className="text-xs text-muted-foreground">
              {t("filterCategory")}
            </Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger id="admin-product-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allCategories")}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {pickLocalized(category.name, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="admin-product-status" className="text-xs text-muted-foreground">
              {t("filterStatus")}
            </Label>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger id="admin-product-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(statusFilterKeys) as StatusFilter[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(statusFilterKeys[value])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            disabled={!hasFilters}
            className="justify-self-start lg:mb-0.5"
          >
            <X aria-hidden="true" />
            {t("clearFilters")}
          </Button>
        </div>
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground" aria-live="polite">
          {tc("results", { count: filtered.length })}
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button variant="outline" onClick={hasFilters ? clearFilters : openCreate}>
              {hasFilters ? t("clearFilters") : t("addProduct")}
            </Button>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-soft md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.product")}</TableHead>
                  <TableHead>{t("table.category")}</TableHead>
                  <TableHead>{t("table.price")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead>{t("table.featured")}</TableHead>
                  <TableHead className="hidden xl:table-cell">{t("table.updated")}</TableHead>
                  <TableHead className="text-end">{t("table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product) => {
                  const name = pickLocalized(product.name, locale);
                  const busy = busyId === product.id;

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                            <ProductMedia
                              src={product.image.url}
                              alt={pickLocalized(product.image.alt, locale)}
                              sizes="40px"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{name}</p>
                            <p className="font-mono text-[0.68rem] text-muted-foreground" dir="ltr">
                              {product.sku}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {categoryNames.get(product.categoryId) ??
                          getCategoryName(categories, product.categoryId, locale)}
                      </TableCell>
                      <TableCell className="text-sm font-medium whitespace-nowrap">
                        {formatPrice(product.price, product.currency, locale)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.active ? "secondary" : "outline"}>
                          {product.active ? tc("active") : tc("inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={busy}
                          onClick={() => void toggleFeatured(product)}
                          aria-label={
                            product.featured
                              ? t("actions.unfeature", { name })
                              : t("actions.feature", { name })
                          }
                          aria-pressed={product.featured}
                        >
                          <Star
                            className={
                              product.featured
                                ? "fill-warning text-warning"
                                : "text-muted-foreground"
                            }
                            aria-hidden="true"
                          />
                        </Button>
                      </TableCell>
                      <TableCell className="hidden text-xs whitespace-nowrap text-muted-foreground xl:table-cell">
                        {formatDate(product.updatedAt, locale)}
                      </TableCell>
                      <TableCell>
                        <ProductRowActions
                          product={product}
                          busy={busy}
                          onEdit={() => openEdit(product)}
                          onToggleActive={() => void toggleActive(product)}
                          onToggleFeatured={() => void toggleFeatured(product)}
                          onDelete={() => setDeleting(product)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 md:hidden">
            {filtered.map((product) => {
              const name = pickLocalized(product.name, locale);
              const busy = busyId === product.id;

              return (
                <div key={product.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
                  <div className="flex items-start gap-3">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <ProductMedia
                        src={product.image.url}
                        alt={pickLocalized(product.image.alt, locale)}
                        sizes="56px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                      <p className="mt-0.5 font-mono text-[0.68rem] text-muted-foreground" dir="ltr">
                        {product.sku}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {categoryNames.get(product.categoryId)}
                      </p>
                    </div>
                    <ProductRowActions
                      product={product}
                      busy={busy}
                      onEdit={() => openEdit(product)}
                      onToggleActive={() => void toggleActive(product)}
                      onToggleFeatured={() => void toggleFeatured(product)}
                      onDelete={() => setDeleting(product)}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-sm font-medium text-foreground">
                      {formatPrice(product.price, product.currency, locale)}
                    </span>
                    <div className="flex items-center gap-2">
                      {product.featured ? (
                        <Star className="size-3.5 fill-warning text-warning" aria-hidden="true" />
                      ) : null}
                      <Badge variant={product.active ? "secondary" : "outline"}>
                        {product.active ? tc("active") : tc("inactive")}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editing}
        categories={categories}
        onSaved={reload}
      />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription", {
                name: deleting ? pickLocalized(deleting.name, locale) : "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={Boolean(busyId)}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {busyId ? tc("deleting") : tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface ProductRowActionsProps {
  product: Product;
  busy: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onToggleFeatured: () => void;
  onDelete: () => void;
}

function ProductRowActions({
  product,
  busy,
  onEdit,
  onToggleActive,
  onToggleFeatured,
  onDelete,
}: ProductRowActionsProps) {
  const t = useTranslations("admin.products");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const name = pickLocalized(product.name, locale);

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" disabled={busy} aria-label={t("table.actions")}>
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil className="size-4" aria-hidden="true" />
            {tc("edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onToggleActive}>
            {product.active ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
            {product.active
              ? t("actions.deactivate", { name })
              : t("actions.activate", { name })}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onToggleFeatured}>
            {product.featured ? (
              <StarOff className="size-4" aria-hidden="true" />
            ) : (
              <Star className="size-4" aria-hidden="true" />
            )}
            {product.featured
              ? t("actions.unfeature", { name })
              : t("actions.feature", { name })}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 className="size-4" aria-hidden="true" />
            {tc("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
