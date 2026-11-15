import { z } from "zod";

import { currencies, type Currency } from "@/domain/common";
import type { AdminProduct, AdminProductInput } from "@/domain/admin-catalog";

import { SKU_PATTERN, SLUG_PATTERN, type ValidationTranslator } from "./shared";

export function createAdminVariantSchema(t: ValidationTranslator) {
  return z.object({
    clientKey: z.string().min(1),
    variantId: z.string().optional(),
    sizeEn: z
      .string()
      .trim()
      .min(1, t("variantSizeRequired"))
      .max(60, t("nameMax")),
    sizeAr: z
      .string()
      .trim()
      .min(1, t("variantSizeRequired"))
      .max(60, t("nameMax")),
    price: z
      .number({ message: t("priceRequired") })
      .positive(t("pricePositive"))
      .max(10_000_000, t("priceMax")),
    sku: z
      .string()
      .trim()
      .min(1, t("skuRequired"))
      .regex(SKU_PATTERN, t("skuInvalid")),
    active: z.boolean(),
  });
}

export function createAdminProductSchema(t: ValidationTranslator) {
  return z.object({
    nameEn: z
      .string()
      .trim()
      .min(1, t("productNameRequired"))
      .min(2, t("nameMin"))
      .max(120, t("nameMax")),
    nameAr: z
      .string()
      .trim()
      .min(1, t("productNameRequired"))
      .min(2, t("nameMin"))
      .max(120, t("nameMax")),
    slug: z
      .string()
      .trim()
      .min(1, t("slugRequired"))
      .regex(SLUG_PATTERN, t("slugInvalid")),
    categoryId: z.string().trim().min(1, t("categoryRequired")),
    price: z
      .number({ message: t("priceRequired") })
      .positive(t("pricePositive"))
      .max(10_000_000, t("priceMax")),
    currency: z.enum(currencies, { message: t("currencyRequired") }),
    descriptionEn: z
      .string()
      .trim()
      .min(1, t("descriptionRequired"))
      .min(10, t("descriptionMin"))
      .max(2000, t("messageMax")),
    descriptionAr: z
      .string()
      .trim()
      .min(1, t("descriptionRequired"))
      .min(10, t("descriptionMin"))
      .max(2000, t("messageMax")),
    active: z.boolean(),
    featured: z.boolean(),
    variants: z.array(createAdminVariantSchema(t)).max(50),
  });
}

export type AdminVariantFormValues = z.infer<ReturnType<typeof createAdminVariantSchema>>;
export type AdminProductFormValues = z.infer<ReturnType<typeof createAdminProductSchema>>;

export function emptyAdminVariant(clientKey: string): AdminVariantFormValues {
  return {
    clientKey,
    sizeEn: "",
    sizeAr: "",
    price: 0,
    sku: "",
    active: true,
  };
}

export function emptyAdminProductFormValues(
  currency: Currency = "USD",
): AdminProductFormValues {
  return {
    nameEn: "",
    nameAr: "",
    slug: "",
    categoryId: "",
    price: 0,
    currency,
    descriptionEn: "",
    descriptionAr: "",
    active: true,
    featured: false,
    variants: [],
  };
}

export function adminProductToFormValues(product: AdminProduct): AdminProductFormValues {
  return {
    nameEn: product.name.en,
    nameAr: product.name.ar,
    slug: product.slug,
    categoryId: product.categoryId,
    price: product.price,
    currency: product.currency,
    descriptionEn: product.description.en,
    descriptionAr: product.description.ar,
    active: product.active,
    featured: product.featured,
    variants: product.variants.map((variant) => ({
      clientKey: variant.id,
      variantId: variant.id,
      sizeEn: variant.sizeLabel.en,
      sizeAr: variant.sizeLabel.ar,
      price: variant.price,
      sku: variant.sku,
      active: variant.active,
    })),
  };
}

export function adminFormToProductInput(
  values: AdminProductFormValues,
): AdminProductInput {
  return {
    name: { en: values.nameEn, ar: values.nameAr },
    slug: values.slug,
    categoryId: values.categoryId,
    price: values.price,
    currency: values.currency,
    description: { en: values.descriptionEn, ar: values.descriptionAr },
    active: values.active,
    featured: values.featured,
  };
}
