"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { ImageUploadField } from "@/components/admin/products/image-upload-field";
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
import type { AdminProduct } from "@/domain/admin-catalog";
import type { Category } from "@/domain/category";
import { currencies } from "@/domain/common";
import type { Locale } from "@/i18n/routing";
import {
  createAdminProduct,
  deleteAdminVariant,
  finalizeProductImage,
  finalizeVariantImage,
  saveAdminVariant,
  updateAdminProduct,
  type AdminCatalogErrorCode,
} from "@/lib/actions/admin-catalog";
import { pickLocalized } from "@/lib/format";
import { CatalogUploadError, uploadCatalogImage } from "@/lib/storage/upload-client";
import {
  adminFormToProductInput,
  adminProductToFormValues,
  createAdminProductSchema,
  emptyAdminProductFormValues,
  emptyAdminVariant,
  type AdminProductFormValues,
} from "@/schemas/admin-product";

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: AdminProduct | null;
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
  const tvariants = useTranslations("admin.products.variants");
  const tu = useTranslations("admin.products.upload");
  const tv = useTranslations("validation");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const schema = useMemo(() => createAdminProductSchema(tv), [tv]);

  const [savedProductId, setSavedProductId] = useState<string | null>(product?.id ?? null);
  const [removedVariantIds, setRemovedVariantIds] = useState<string[]>([]);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productPath, setProductPath] = useState<string | null>(product?.imagePath ?? null);
  const [productRemoved, setProductRemoved] = useState(false);
  const [productProgress, setProductProgress] = useState<number | null>(null);
  const [variantFiles, setVariantFiles] = useState<Record<string, File>>({});
  const [variantPaths, setVariantPaths] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(
      (product?.variants ?? []).map((variant) => [variant.id, variant.imagePath]),
    ),
  );
  const [variantRemoved, setVariantRemoved] = useState<Record<string, boolean>>({});
  const [variantProgress, setVariantProgress] = useState<Record<string, number>>({});
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AdminProductFormValues>({
    resolver: zodResolver(schema),
    defaultValues: product ? adminProductToFormValues(product) : emptyAdminProductFormValues(),
    mode: "onBlur",
  });

  const { fields, append, remove } = useFieldArray({ control, name: "variants" });
  const currency = useWatch({ control, name: "currency" });

  function handleSaveError(
    code: AdminCatalogErrorCode,
    editing: boolean,
  ) {
    if (code === "SLUG_TAKEN") {
      setError("slug", { message: tv("slugTaken") });
      return;
    }
    if (code === "CATEGORY_NOT_FOUND") {
      setError("categoryId", { message: tv("categoryRequired") });
      return;
    }
    if (code === "SKU_TAKEN") {
      toast.error(tvariants("saveError"));
      return;
    }
    if (code === "UNAUTHORIZED") {
      toast.error(tu("unauthorized"));
      return;
    }
    toast.error(editing ? t("updateError") : t("createError"));
  }

  function uploadErrorMessage(error: unknown, fallback: "error" | "variantError"): string {
    if (error instanceof CatalogUploadError) {
      switch (error.code) {
        case "UNAUTHORIZED":
          return tu("unauthorized");
        case "NETWORK":
        case "ABORTED":
          return tu("network");
        case "NOT_FOUND":
          return tu("notFound");
        case "TYPE":
          return tu("typeError");
        case "SIZE":
          return tu("sizeError");
        case "EXTENSION":
          return tu("extensionError");
        case "CONTENT":
          return tu("contentError");
        default:
          break;
      }
    }
    return tu(fallback);
  }

  function removeVariant(index: number) {
    const variant = fields[index];
    if (variant?.variantId) {
      setRemovedVariantIds((current) => [...current, variant.variantId as string]);
    }
    if (variant?.clientKey) {
      setVariantFiles((current) => {
        const next = { ...current };
        delete next[variant.clientKey];
        return next;
      });
    }
    remove(index);
  }

  async function onSubmit(values: AdminProductFormValues) {
    const editing = Boolean(savedProductId);
    let productId = savedProductId;

    try {
      // 1. Persist the product row first so a UUID exists for the storage path.
      const input = adminFormToProductInput(values);
      if (productId) {
        const result = await updateAdminProduct(productId, input);
        if (!result.ok) {
          handleSaveError(result.error, true);
          return;
        }
      } else {
        const result = await createAdminProduct(input);
        if (!result.ok) {
          handleSaveError(result.error, false);
          return;
        }
        productId = result.data.id;
        setSavedProductId(productId);
      }

      // 2. Remove variants the administrator deleted from this form.
      for (const variantId of removedVariantIds) {
        await deleteAdminVariant(variantId);
      }
      setRemovedVariantIds([]);

      // 3. Save variant metadata and keep the generated UUIDs for uploads.
      const nextVariantIds = new Map<string, string>();
      let variantSaveFailed = false;

      for (const [index, variant] of values.variants.entries()) {
        const result = await saveAdminVariant(productId, {
          id: variant.variantId,
          sizeLabel: { en: variant.sizeEn, ar: variant.sizeAr },
          price: variant.price,
          sku: variant.sku,
          active: variant.active,
          sortOrder: index,
        });

        if (!result.ok) {
          variantSaveFailed = true;
          continue;
        }

        nextVariantIds.set(variant.clientKey, result.data.id);
        if (!variant.variantId) {
          setValue(`variants.${index}.variantId`, result.data.id);
        }
      }

      if (variantSaveFailed) toast.error(tvariants("saveError"));

      // 4. Upload images after the records exist, then finalize image_path.
      let uploadFailed = false;
      setUploading(true);

      try {
        if (productFile) {
          try {
            setProductProgress(1);
            const uploaded = await uploadCatalogImage({
              file: productFile,
              kind: "product",
              recordId: productId,
              onProgress: setProductProgress,
            });
            const finalized = await finalizeProductImage(productId, uploaded.path);
            if (!finalized.ok) throw new CatalogUploadError(finalized.error);

            setProductPath(uploaded.path);
            setProductFile(null);
            setProductRemoved(false);
            setProductProgress(null);
          } catch (error) {
            uploadFailed = true;
            setProductProgress(null);
            toast.error(uploadErrorMessage(error, "error"));
          }
        } else if (productRemoved && productPath) {
          const finalized = await finalizeProductImage(productId, null);
          if (finalized.ok) {
            setProductPath(null);
            setProductRemoved(false);
          } else {
            uploadFailed = true;
            toast.error(t("updateError"));
          }
        }

        for (const variant of values.variants) {
          const key = variant.clientKey;
          const variantId = nextVariantIds.get(key) ?? variant.variantId;
          if (!variantId) continue;

          const file = variantFiles[key];
          if (file) {
            try {
              setVariantProgress((current) => ({ ...current, [key]: 1 }));
              const uploaded = await uploadCatalogImage({
                file,
                kind: "variant",
                recordId: variantId,
                onProgress: (percent) =>
                  setVariantProgress((current) => ({ ...current, [key]: percent })),
              });
              const finalized = await finalizeVariantImage(variantId, uploaded.path);
              if (!finalized.ok) throw new CatalogUploadError(finalized.error);

              setVariantPaths((current) => ({ ...current, [key]: uploaded.path }));
              setVariantFiles((current) => {
                const next = { ...current };
                delete next[key];
                return next;
              });
              setVariantProgress((current) => {
                const next = { ...current };
                delete next[key];
                return next;
              });
            } catch (error) {
              uploadFailed = true;
              setVariantProgress((current) => {
                const next = { ...current };
                delete next[key];
                return next;
              });
              toast.error(uploadErrorMessage(error, "variantError"));
            }
          } else if (variantRemoved[key] && variantPaths[key]) {
            const finalized = await finalizeVariantImage(variantId, null);
            if (finalized.ok) {
              setVariantPaths((current) => ({ ...current, [key]: null }));
              setVariantRemoved((current) => {
                const next = { ...current };
                delete next[key];
                return next;
              });
            } else {
              uploadFailed = true;
              toast.error(t("updateError"));
            }
          }
        }
      } finally {
        setUploading(false);
      }

      await onSaved();

      if (variantSaveFailed || uploadFailed) {
        // Keep the dialog open. The saved record is intact so the administrator
        // can retry the failed upload without losing entered data.
        return;
      }

      toast.success(editing ? t("updateSuccess") : t("createSuccess"));
      onOpenChange(false);
    } catch {
      toast.error(editing ? t("updateError") : t("createError"));
    }
  }

  const busy = isSubmitting || uploading;

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

        <div className="grid gap-4 sm:grid-cols-2">
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
                    {currencies.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
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
        <ImageUploadField
          label={tf("image")}
          hint={tf("imageHint")}
          dropLabel={tf("imageDrop")}
          chooseLabel={tf("chooseImage")}
          replaceLabel={tf("replaceImage")}
          removeLabel={tf("removeImage")}
          previewAlt={tf("previewAlt")}
          file={productFile}
          imagePath={productPath}
          progress={productProgress}
          disabled={busy}
          onSelect={(file) => {
            setProductFile(file);
            setProductRemoved(false);
          }}
          onRemove={() => {
            setProductFile(null);
            if (productPath) setProductRemoved(true);
          }}
        />
      </section>

      <section className="space-y-4 border-t border-border pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              {t("sections.variants")}
              {fields.length > 0 ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] tracking-normal">
                  {fields.length}
                </span>
              ) : null}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">{tvariants("description")}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy || fields.length >= 50}
            onClick={() => append(emptyAdminVariant(crypto.randomUUID()))}
          >
            <PlusCircle className="size-4" aria-hidden="true" />
            {tvariants("add")}
          </Button>
        </div>

        {fields.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
            {tvariants("empty")}
          </div>
        ) : (
          <div className="space-y-4">
            {fields.map((field, index) => {
              const key = field.clientKey;
              const imagePath = variantPaths[key] ?? null;
              const file = variantFiles[key] ?? null;

              return (
                <div
                  key={field.id}
                  className="space-y-4 rounded-xl border border-border bg-card/60 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">
                      {tvariants("untitled", { index: index + 1 })}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={busy}
                      aria-label={tvariants("remove")}
                      onClick={() => removeVariant(index)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor={`variant-size-en-${field.id}`}>
                        {tvariants("sizeEn")} <span aria-hidden="true">*</span>
                      </Label>
                      <Input
                        id={`variant-size-en-${field.id}`}
                        dir="ltr"
                        aria-invalid={Boolean(errors.variants?.[index]?.sizeEn)}
                        {...register(`variants.${index}.sizeEn`)}
                      />
                      <FieldError
                        id={`variant-size-en-${field.id}-error`}
                        message={errors.variants?.[index]?.sizeEn?.message}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`variant-size-ar-${field.id}`}>
                        {tvariants("sizeAr")} <span aria-hidden="true">*</span>
                      </Label>
                      <Input
                        id={`variant-size-ar-${field.id}`}
                        dir="rtl"
                        aria-invalid={Boolean(errors.variants?.[index]?.sizeAr)}
                        {...register(`variants.${index}.sizeAr`)}
                      />
                      <FieldError
                        id={`variant-size-ar-${field.id}-error`}
                        message={errors.variants?.[index]?.sizeAr?.message}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`variant-price-${field.id}`}>
                        {tvariants("price")} <span aria-hidden="true">*</span>
                      </Label>
                      <Input
                        id={`variant-price-${field.id}`}
                        type="number"
                        min={0}
                        step="0.01"
                        dir="ltr"
                        aria-invalid={Boolean(errors.variants?.[index]?.price)}
                        {...register(`variants.${index}.price`, { valueAsNumber: true })}
                      />
                      <FieldError
                        id={`variant-price-${field.id}-error`}
                        message={errors.variants?.[index]?.price?.message}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`variant-sku-${field.id}`}>
                        {tvariants("sku")} <span aria-hidden="true">*</span>
                      </Label>
                      <Input
                        id={`variant-sku-${field.id}`}
                        dir="ltr"
                        placeholder={tvariants("skuPlaceholder")}
                        aria-invalid={Boolean(errors.variants?.[index]?.sku)}
                        {...register(`variants.${index}.sku`)}
                      />
                      <FieldError
                        id={`variant-sku-${field.id}-error`}
                        message={errors.variants?.[index]?.sku?.message}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
                      <Label htmlFor={`variant-active-${field.id}`}>{tvariants("active")}</Label>
                      <Controller
                        control={control}
                        name={`variants.${index}.active`}
                        render={({ field: activeField }) => (
                          <Switch
                            id={`variant-active-${field.id}`}
                            checked={activeField.value}
                            onCheckedChange={activeField.onChange}
                          />
                        )}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
                      <Label>{tvariants("currency")}</Label>
                      <span className="text-sm font-medium text-foreground">{currency}</span>
                    </div>
                  </div>

                  <ImageUploadField
                    label={tvariants("image")}
                    hint={tvariants("imageHint")}
                    dropLabel={tf("imageDrop")}
                    chooseLabel={tf("chooseImage")}
                    replaceLabel={tf("replaceImage")}
                    removeLabel={tf("removeImage")}
                    previewAlt={tvariants("image")}
                    file={file}
                    imagePath={imagePath}
                    progress={variantProgress[key] ?? null}
                    disabled={busy}
                    className="sm:grid-cols-[8rem_1fr]"
                    onSelect={(selected) => {
                      setVariantFiles((current) => ({ ...current, [key]: selected }));
                      setVariantRemoved((current) => {
                        const next = { ...current };
                        delete next[key];
                        return next;
                      });
                    }}
                    onRemove={() => {
                      setVariantFiles((current) => {
                        const next = { ...current };
                        delete next[key];
                        return next;
                      });
                      if (imagePath) {
                        setVariantRemoved((current) => ({ ...current, [key]: true }));
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
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
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {busy ? tc("saving") : product ? tc("save") : tc("create")}
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
