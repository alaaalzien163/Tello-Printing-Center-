"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Category } from "@/domain/category";
import { createAdminCategory, updateAdminCategory } from "@/lib/actions/admin-catalog";
import {
  adminCategoryFormToInput,
  adminCategoryToFormValues,
  createAdminCategorySchema,
  emptyAdminCategoryFormValues,
  type AdminCategoryFormValues,
} from "@/schemas/admin-category";

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  onSaved: () => Promise<void> | void;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  );
}

function CategoryForm({
  category,
  onOpenChange,
  onSaved,
}: Omit<CategoryFormDialogProps, "open">) {
  const t = useTranslations("admin.categories");
  const tf = useTranslations("admin.categories.fields");
  const tv = useTranslations("validation");
  const tc = useTranslations("common");
  const schema = useMemo(() => createAdminCategorySchema(tv), [tv]);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AdminCategoryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: category ? adminCategoryToFormValues(category) : emptyAdminCategoryFormValues(),
    mode: "onBlur",
  });

  async function onSubmit(values: AdminCategoryFormValues) {
    const input = adminCategoryFormToInput(values);

    try {
      const result = category
        ? await updateAdminCategory(category.id, input)
        : await createAdminCategory(input);

      if (!result.ok) {
        if (result.error === "SLUG_TAKEN") {
          setError("slug", { message: t("slugTaken") });
          return;
        }
        toast.error(category ? t("updateError") : t("createError"));
        return;
      }

      toast.success(category ? t("updateSuccess") : t("createSuccess"));
      await onSaved();
      onOpenChange(false);
    } catch {
      toast.error(category ? t("updateError") : t("createError"));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6" id="category-form">
      <section className="space-y-4">
        <h3 className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          {t("sections.identity")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="category-name-en">
              {tf("nameEn")} <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="category-name-en"
              dir="ltr"
              aria-invalid={Boolean(errors.nameEn)}
              aria-describedby={errors.nameEn ? "category-name-en-error" : undefined}
              {...register("nameEn")}
            />
            <FieldError id="category-name-en-error" message={errors.nameEn?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category-name-ar">
              {tf("nameAr")} <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="category-name-ar"
              dir="rtl"
              aria-invalid={Boolean(errors.nameAr)}
              aria-describedby={errors.nameAr ? "category-name-ar-error" : undefined}
              {...register("nameAr")}
            />
            <FieldError id="category-name-ar-error" message={errors.nameAr?.message} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="category-slug">
            {tf("slug")} <span aria-hidden="true">*</span>
          </Label>
          <Input
            id="category-slug"
            dir="ltr"
            aria-invalid={Boolean(errors.slug)}
            aria-describedby={errors.slug ? "category-slug-error" : "category-slug-hint"}
            {...register("slug")}
          />
          <p id="category-slug-hint" className="text-xs text-muted-foreground">
            {tf("slugHint")}
          </p>
          <FieldError id="category-slug-error" message={errors.slug?.message} />
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-5">
        <h3 className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          {t("sections.content")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="category-description-en">{tf("descriptionEn")}</Label>
            <Textarea
              id="category-description-en"
              dir="ltr"
              rows={4}
              aria-invalid={Boolean(errors.descriptionEn)}
              aria-describedby={errors.descriptionEn ? "category-description-en-error" : undefined}
              {...register("descriptionEn")}
            />
            <FieldError id="category-description-en-error" message={errors.descriptionEn?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category-description-ar">{tf("descriptionAr")}</Label>
            <Textarea
              id="category-description-ar"
              dir="rtl"
              rows={4}
              aria-invalid={Boolean(errors.descriptionAr)}
              aria-describedby={errors.descriptionAr ? "category-description-ar-error" : undefined}
              {...register("descriptionAr")}
            />
            <FieldError id="category-description-ar-error" message={errors.descriptionAr?.message} />
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-5">
        <h3 className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          {t("sections.visibility")}
        </h3>
        <Controller
          control={control}
          name="active"
          render={({ field }) => (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
              <div>
                <Label htmlFor="category-active">{tf("active")}</Label>
                <p className="mt-1 text-xs text-muted-foreground">{tf("activeHint")}</p>
              </div>
              <Switch id="category-active" checked={field.value} onCheckedChange={field.onChange} />
            </div>
          )}
        />
      </section>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {isSubmitting ? tc("saving") : category ? tc("save") : tc("create")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  onSaved,
}: CategoryFormDialogProps) {
  const t = useTranslations("admin.categories");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{category ? t("editTitle") : t("createTitle")}</DialogTitle>
          <DialogDescription>{t("formDescription")}</DialogDescription>
        </DialogHeader>
        {open ? (
          <CategoryForm
            key={category?.id ?? "new"}
            category={category}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
