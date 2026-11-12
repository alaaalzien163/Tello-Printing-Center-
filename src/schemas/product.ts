import { z } from "zod";

import { currencies, type Currency } from "@/domain/common";
import type { Product, ProductInput } from "@/domain/product";

import {
  isValidImageSource,
  SKU_PATTERN,
  SLUG_PATTERN,
  type ValidationTranslator,
} from "./shared";

export function createProductSchema(t: ValidationTranslator) {
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
    sku: z
      .string()
      .trim()
      .min(1, t("skuRequired"))
      .regex(SKU_PATTERN, t("skuInvalid")),
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
    imageUrl: z
      .string()
      .trim()
      .min(1, t("imageRequired"))
      .refine(isValidImageSource, t("imageUrlInvalid")),
    imageAltEn: z
      .string()
      .trim()
      .min(1, t("imageAltRequired"))
      .max(160, t("nameMax")),
    imageAltAr: z
      .string()
      .trim()
      .min(1, t("imageAltRequired"))
      .max(160, t("nameMax")),
    active: z.boolean(),
    featured: z.boolean(),
  });
}

export type ProductFormValues = z.infer<ReturnType<typeof createProductSchema>>;

export function emptyProductFormValues(currency: Currency = "USD"): ProductFormValues {
  return {
    nameEn: "",
    nameAr: "",
    sku: "",
    slug: "",
    categoryId: "",
    price: 0,
    currency,
    descriptionEn: "",
    descriptionAr: "",
    imageUrl: "",
    imageAltEn: "",
    imageAltAr: "",
    active: true,
    featured: false,
  };
}

export function productToFormValues(product: Product): ProductFormValues {
  return {
    nameEn: product.name.en,
    nameAr: product.name.ar,
    sku: product.sku,
    slug: product.slug,
    categoryId: product.categoryId,
    price: product.price,
    currency: product.currency,
    descriptionEn: product.description.en,
    descriptionAr: product.description.ar,
    imageUrl: product.image.url,
    imageAltEn: product.image.alt.en,
    imageAltAr: product.image.alt.ar,
    active: product.active,
    featured: product.featured,
  };
}

export function productFormToInput(values: ProductFormValues): ProductInput {
  return {
    name: { en: values.nameEn, ar: values.nameAr },
    sku: values.sku,
    slug: values.slug,
    categoryId: values.categoryId,
    price: values.price,
    currency: values.currency,
    description: { en: values.descriptionEn, ar: values.descriptionAr },
    image: {
      url: values.imageUrl,
      alt: { en: values.imageAltEn, ar: values.imageAltAr },
    },
    active: values.active,
    featured: values.featured,
  };
}
