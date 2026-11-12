import { z } from "zod";

import type { Category, CategoryInput } from "@/domain/category";

import {
  isValidImageSource,
  SLUG_PATTERN,
  type ValidationTranslator,
} from "./shared";

export function createCategorySchema(t: ValidationTranslator) {
  return z.object({
    nameEn: z
      .string()
      .trim()
      .min(1, t("categoryNameRequired"))
      .min(2, t("nameMin"))
      .max(120, t("nameMax")),
    nameAr: z
      .string()
      .trim()
      .min(1, t("categoryNameRequired"))
      .min(2, t("nameMin"))
      .max(120, t("nameMax")),
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
    slug: z
      .string()
      .trim()
      .min(1, t("slugRequired"))
      .regex(SLUG_PATTERN, t("slugInvalid")),
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
  });
}

export type CategoryFormValues = z.infer<ReturnType<typeof createCategorySchema>>;

export function emptyCategoryFormValues(): CategoryFormValues {
  return {
    nameEn: "",
    nameAr: "",
    descriptionEn: "",
    descriptionAr: "",
    slug: "",
    imageUrl: "",
    imageAltEn: "",
    imageAltAr: "",
    active: true,
  };
}

export function categoryToFormValues(category: Category): CategoryFormValues {
  return {
    nameEn: category.name.en,
    nameAr: category.name.ar,
    descriptionEn: category.description.en,
    descriptionAr: category.description.ar,
    slug: category.slug,
    imageUrl: category.image.url,
    imageAltEn: category.image.alt.en,
    imageAltAr: category.image.alt.ar,
    active: category.active,
  };
}

export function categoryFormToInput(values: CategoryFormValues): CategoryInput {
  return {
    name: { en: values.nameEn, ar: values.nameAr },
    description: { en: values.descriptionEn, ar: values.descriptionAr },
    slug: values.slug,
    image: {
      url: values.imageUrl,
      alt: { en: values.imageAltEn, ar: values.imageAltAr },
    },
    active: values.active,
  };
}
