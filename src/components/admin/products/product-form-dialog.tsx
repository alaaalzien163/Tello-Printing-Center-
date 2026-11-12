"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { ProductMedia } from "@/components/shared/product-media";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { currencies } from "@/domain/common";
import type { Category } from "@/domain/category";
import type { Product } from "@/domain/product";
import type { Locale } from "@/i18n/routing";
import {
  fileToDemoImageDataUrl,
  IMAGE_ACCEPT_ATTRIBUTE,
  ImageUploadError,
} from "@/lib/image-file";
import { pickLocalized } from "@/lib/format";
import { getRepositories, RepositoryError } from "@/repositories";
import {
  createProductSchema,
  emptyProductFormValues,
  productFormToInput,
  productToFormValues,
  type ProductFormValues,
} from "@/schemas/product";

const repositories = getRepositories();

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  categories: Category[];
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

function ProductForm({
  product,
  categories,
  onOpenChange,
  onSaved,
}: Omit<ProductFormDialogProps, "open">) {
  const t = useTranslations("admin.products");
  const tf = useTranslations("admin.products.fields");
  const tv = useTranslations("validation");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const schema = useMemo(() => createProductSchema(tv), [tv]);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(schema),
    defaultValues: product ? productToFormValues(product) : emptyProductFormValues(),
    mode: "onBlur",
  });

  const imageUrl = useWatch({ control, name: "imageUrl" });
  const imageAltEn = useWatch({ control, name: "imageAltEn" });

  async function handleImageFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await fileToDemoImageDataUrl(file);
      setValue("imageUrl", dataUrl, { shouldValidate: true, shouldDirty: true });
    } catch (error) {
      if (error instanceof ImageUploadError) {
        const message =
          error.code === "TYPE"
            ? t("imageTypeError")
            : error.code === "SIZE"
              ? t("imageSizeError")
              : t("imageUploadError");
        toast.error(message);
      } else {
        toast.error(t("imageUploadError"));
      }
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(values: ProductFormValues) {
    try {
      const input = productFormToInput(values);
      if (product) {
        await repositories.products.update(product.id, input);
      } else {
        await repositories.products.create(input);
      }
      toast.success(product ? t("updateSuccess") : t("createSuccess"));
      await onSaved();
      onOpenChange(false);
    } catch (error) {
      if (error instanceof RepositoryError) {
        if (error.code === "SKU_TAKEN") {
          setError("sku", { message: tv("skuTaken") });
          return;
        }
        if (error.code === "SLUG_TAKEN") {
          setError("slug", { message: tv("slugTaken") });
          return;
        }
        if (error.code === "CATEGORY_NOT_FOUND") {
          setError("categoryId", { message: tv("categoryRequired") });
          return;
        }
      }
      toast.error(product ? t("updateError") : t("createError"));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6" id="product-form">
      <section className="space-y-4">
        <h3 className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          {t("sections.identity")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="product-name-en">
              {tf("nameEn")} <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="product-name-en"
              dir="ltr"
              aria-invalid={Boolean(errors.nameEn)}
              aria-describedby={errors.nameEn ? "product-name-en-error" : undefined}
              {...register("nameEn")}
            />
            <FieldError id="product-name-en-error" message={errors.nameEn?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="product-name-ar">
              {tf("nameAr")} <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="product-name-ar"
              dir="rtl"
              aria-invalid={Boolean(errors.nameAr)}
              aria-describedby={errors.nameAr ? "product-name-ar-error" : undefined}
              {...register("nameAr")}
            />
            <FieldError id="product-name-ar-error" message={errors.nameAr?.message} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1.2fr]">
          <div className="grid gap-2">
            <Label htmlFor="product-sku">
              {tf("sku")} <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="product-sku"
              dir="ltr"
              placeholder={tf("skuPlaceholder")}
              aria-invalid={Boolean(errors.sku)}
              aria-describedby={errors.sku ? "product-sku-error" : undefined}
              {...register("sku")}
            />
            <FieldError id="product-sku-error" message={errors.sku?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="product-slug">
              {tf("slug")} <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="product-slug"
              dir="ltr"
              aria-invalid={Boolean(errors.slug)}
              aria-describedby={errors.slug ? "product-slug-error" : "product-slug-hint"}
              {...register("slug")}
            />
            <p id="product-slug-hint" className="text-xs text-muted-foreground">
              {tf("slugHint")}
            </p>
            <FieldError id="product-slug-error" message={errors.slug?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="product-category">
              {tf("category")} <span aria-hidden="true">*</span>
            </Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="product-category"
                    className="w-full"
                    aria-invalid={Boolean(errors.categoryId)}
                    aria-describedby={errors.categoryId ? "product-category-error" : undefined}
                  >
                    <SelectValue placeholder={tf("categoryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {pickLocalized(category.name, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError id="product-category-error" message={errors.categoryId?.message} />
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-5">
        <h3 className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          {t("sections.pricing")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="product-price">
              {tf("price")} <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="product-price"
              type="number"
              min={0}
              step="0.01"
              dir="ltr"
              aria-invalid={Boolean(errors.price)}
              aria-describedby={errors.price ? "product-price-error" : undefined}
              {...register("price", { valueAsNumber: true })}
            />
            <FieldError id="product-price-error" message={errors.price?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="product-currency">{tf("currency")}</Label>
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="product-currency" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-5">
        <h3 className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          {t("sections.content")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="product-description-en">{tf("descriptionEn")}</Label>
            <Textarea
              id="product-description-en"
              dir="ltr"
              rows={4}
              aria-invalid={Boolean(errors.descriptionEn)}
              aria-describedby={errors.descriptionEn ? "product-description-en-error" : undefined}
              {...register("descriptionEn")}
            />
            <FieldError id="product-description-en-error" message={errors.descriptionEn?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="product-description-ar">{tf("descriptionAr")}</Label>
            <Textarea
              id="product-description-ar"
              dir="rtl"
              rows={4}
              aria-invalid={Boolean(errors.descriptionAr)}
              aria-describedby={errors.descriptionAr ? "product-description-ar-error" : undefined}
              {...register("descriptionAr")}
            />
            <FieldError id="product-description-ar-error" message={errors.descriptionAr?.message} />
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-5">
        <h3 className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          {t("sections.media")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
            <ProductMedia
              src={imageUrl}
              alt={imageAltEn || tf("image")}
              sizes="160px"
            />
          </div>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="product-image-url">{tf("imageUrl")}</Label>
              <Input
                id="product-image-url"
                dir="ltr"
                placeholder={tf("imageUrlPlaceholder")}
                aria-invalid={Boolean(errors.imageUrl)}
                aria-describedby={errors.imageUrl ? "product-image-url-error" : undefined}
                {...register("imageUrl")}
              />
              <FieldError id="product-image-url-error" message={errors.imageUrl?.message} />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="product-image-upload"
                className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted"
              >
                {uploading ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <ImagePlus className="size-3.5" aria-hidden="true" />
                )}
                {tf("upload")}
              </Label>
              <input
                id="product-image-upload"
                type="file"
                accept={IMAGE_ACCEPT_ATTRIBUTE}
                className="sr-only"
                onChange={(event) => {
                  void handleImageFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <p className="text-xs text-muted-foreground">{tf("imageHint")}</p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="product-image-alt-en">{tf("imageAltEn")}</Label>
            <Input
              id="product-image-alt-en"
              dir="ltr"
              aria-invalid={Boolean(errors.imageAltEn)}
              aria-describedby={errors.imageAltEn ? "product-image-alt-en-error" : undefined}
              {...register("imageAltEn")}
            />
            <FieldError id="product-image-alt-en-error" message={errors.imageAltEn?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="product-image-alt-ar">{tf("imageAltAr")}</Label>
            <Input
              id="product-image-alt-ar"
              dir="rtl"
              aria-invalid={Boolean(errors.imageAltAr)}
              aria-describedby={errors.imageAltAr ? "product-image-alt-ar-error" : undefined}
              {...register("imageAltAr")}
            />
            <FieldError id="product-image-alt-ar-error" message={errors.imageAltAr?.message} />
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-5">
        <h3 className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          {t("sections.visibility")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="active"
            render={({ field }) => (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
                <div>
                  <Label htmlFor="product-active">{tf("active")}</Label>
                  <p className="mt-1 text-xs text-muted-foreground">{tf("activeHint")}</p>
                </div>
                <Switch
                  id="product-active"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />
          <Controller
            control={control}
            name="featured"
            render={({ field }) => (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
                <div>
                  <Label htmlFor="product-featured">{tf("featured")}</Label>
                  <p className="mt-1 text-xs text-muted-foreground">{tf("featuredHint")}</p>
                </div>
                <Switch
                  id="product-featured"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />
        </div>
      </section>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={isSubmitting || uploading}>
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : null}
          {isSubmitting ? tc("saving") : product ? tc("save") : tc("create")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
  onSaved,
}: ProductFormDialogProps) {
  const t = useTranslations("admin.products");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{product ? t("editTitle") : t("createTitle")}</DialogTitle>
          <DialogDescription>{t("formDescription")}</DialogDescription>
        </DialogHeader>
        {open ? (
          <ProductForm
            key={product?.id ?? "new"}
            product={product}
            categories={categories}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
