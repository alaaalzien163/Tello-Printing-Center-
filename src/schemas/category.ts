import { z } from "zod";

import type { Category, CategoryInput } from "@/domain/category";

import {
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
    active: category.active,
  };
}

export function categoryFormToInput(values: CategoryFormValues): CategoryInput {
  return {
    name: { en: values.nameEn, ar: values.nameAr },
    description: { en: values.descriptionEn, ar: values.descriptionAr },
    slug: values.slug,
    active: values.active,
  };
}
