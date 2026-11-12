"use client";

import {
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  PlusCircle,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useDemoData } from "@/components/admin/demo-data-provider";
import { CategoryFormDialog } from "@/components/admin/categories/category-form-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ProductMedia } from "@/components/shared/product-media";
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
import type { Category } from "@/domain/category";
import type { Locale } from "@/i18n/routing";
import { pickLocalized } from "@/lib/format";
import { getRepositories } from "@/repositories";
import {
  getCategoryProductCounts,
  searchAndSortCategories,
  type CategorySort,
} from "@/services/catalog";

const repositories = getRepositories();

const sortOptions: Array<{ value: CategorySort; labelKey: "sortNameAsc" | "sortNameDesc" | "sortNewest" | "sortActive" }> = [
  { value: "name-asc", labelKey: "sortNameAsc" },
  { value: "name-desc", labelKey: "sortNameDesc" },
  { value: "newest", labelKey: "sortNewest" },
  { value: "active", labelKey: "sortActive" },
];

export function CategoriesManager() {
  const t = useTranslations("admin.categories");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const { categories, products, loading, error, reload } = useDemoData();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<CategorySort>("name-asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [blocked, setBlocked] = useState<Category | null>(null);
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

  const counts = useMemo(() => getCategoryProductCounts(products), [products]);

  const filtered = useMemo(
    () => searchAndSortCategories(categories, search, sort, locale),
    [categories, search, sort, locale],
  );

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setDialogOpen(true);
  }

  function removeCategory(category: Category) {
    if ((counts[category.id] ?? 0) > 0) {
      setBlocked(category);
    } else {
      setDeleting(category);
    }
  }

  async function toggleActive(category: Category) {
    setBusyId(category.id);
    try {
      await repositories.categories.setActive(category.id, !category.active);
      await reload();
      toast.success(category.active ? t("deactivateSuccess") : t("activateSuccess"));
    } catch {
      toast.error(t("activationError"));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await repositories.categories.delete(deleting.id);
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
        <Skeleton className="h-80 rounded-xl" />
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
          {t("addCategory")}
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
        <div className="grid gap-3 sm:grid-cols-[1fr_14rem_auto] sm:items-end">
          <div className="grid gap-2">
            <Label htmlFor="admin-category-search" className="text-xs text-muted-foreground">
              {tc("search")}
            </Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="admin-category-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className="ps-9"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="admin-category-sort" className="text-xs text-muted-foreground">
              {t("sortLabel")}
            </Label>
            <Select value={sort} onValueChange={(value) => setSort(value as CategorySort)}>
              <SelectTrigger id="admin-category-sort" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setSort("name-asc");
            }}
            disabled={!search && sort === "name-asc"}
          >
            <X aria-hidden="true" />
            {tc("reset")}
          </Button>
        </div>
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground" aria-live="polite">
          {tc("results", { count: filtered.length })}
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Tags}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button variant="outline" onClick={search ? () => setSearch("") : openCreate}>
              {search ? tc("clear") : t("addCategory")}
            </Button>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-soft md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.category")}</TableHead>
                  <TableHead>{t("table.slug")}</TableHead>
                  <TableHead>{t("table.products")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead className="text-end">{t("table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((category) => {
                  const name = pickLocalized(category.name, locale);
                  const count = counts[category.id] ?? 0;
                  const busy = busyId === category.id;

                  return (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                            <ProductMedia
                              src={category.image.url}
                              alt={pickLocalized(category.image.alt, locale)}
                              sizes="40px"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{name}</p>
                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              {pickLocalized(category.description, locale)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground" dir="ltr">
                        {category.slug}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{t("productCount", { count })}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={category.active ? "secondary" : "outline"}>
                          {category.active ? tc("active") : tc("inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <CategoryRowActions
                            category={category}
                            name={name}
                            busy={busy}
                            onEdit={() => openEdit(category)}
                            onToggleActive={() => void toggleActive(category)}
                            onDelete={() => removeCategory(category)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 md:hidden">
            {filtered.map((category) => {
              const name = pickLocalized(category.name, locale);
              const count = counts[category.id] ?? 0;
              const busy = busyId === category.id;

              return (
                <div
                  key={category.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-soft"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <ProductMedia
                        src={category.image.url}
                        alt={pickLocalized(category.image.alt, locale)}
                        sizes="56px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                      <p className="mt-0.5 font-mono text-[0.68rem] text-muted-foreground" dir="ltr">
                        {category.slug}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("productCount", { count })}
                      </p>
                    </div>
                    <CategoryRowActions
                      category={category}
                      name={name}
                      busy={busy}
                      onEdit={() => openEdit(category)}
                      onToggleActive={() => void toggleActive(category)}
                      onDelete={() => removeCategory(category)}
                    />
                  </div>
                  <div className="mt-3 flex justify-end border-t border-border pt-3">
                    <Badge variant={category.active ? "secondary" : "outline"}>
                      {category.active ? tc("active") : tc("inactive")}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editing}
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

      <AlertDialog open={Boolean(blocked)} onOpenChange={(open) => !open && setBlocked(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteBlockedTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteBlockedDescription", {
                name: blocked ? pickLocalized(blocked.name, locale) : "",
                count: blocked ? (counts[blocked.id] ?? 0) : 0,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("close")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                setBlocked(null);
              }}
            >
              {tc("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CategoryRowActionsProps {
  category: Category;
  name: string;
  busy: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

function CategoryRowActions({
  category,
  name,
  busy,
  onEdit,
  onToggleActive,
  onDelete,
}: CategoryRowActionsProps) {
  const t = useTranslations("admin.categories");
  const tc = useTranslations("common");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" disabled={busy} aria-label={t("table.actions")}>
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil className="size-4" aria-hidden="true" />
          {tc("edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onToggleActive}>
          {category.active ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
          {category.active ? tc("inactive") : tc("active")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 className="size-4" aria-hidden="true" />
          {t("delete", { name })}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
