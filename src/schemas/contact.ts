import { z } from "zod";

import type { ValidationTranslator } from "./shared";

const PHONE_PATTERN = /^[+()\d\s.-]{7,30}$/;

export function createContactSchema(t: ValidationTranslator) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t("nameRequired"))
      .min(2, t("nameMin"))
      .max(120, t("nameMax")),
    email: z
      .string()
      .trim()
      .min(1, t("emailRequired"))
      .email(t("emailInvalid"))
      .max(254, t("emailInvalid")),
    phone: z
      .string()
      .trim()
      .max(30, t("phoneInvalid"))
      .refine((value) => value.length === 0 || PHONE_PATTERN.test(value), t("phoneInvalid")),
    message: z
      .string()
      .trim()
      .min(1, t("messageRequired"))
      .min(10, t("messageMin"))
      .max(2000, t("messageMax")),
  });
}

export type ContactFormValues = z.infer<ReturnType<typeof createContactSchema>>;

export function createLoginSchema(t: ValidationTranslator) {
  return z.object({
    email: z
      .string()
      .trim()
      .min(1, t("emailRequired"))
      .email(t("emailInvalid")),
    password: z
      .string()
      .min(1, t("passwordRequired"))
      .min(8, t("passwordMin")),
  });
}

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;

export function createProfileSchema(t: ValidationTranslator) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t("nameRequired"))
      .min(2, t("nameMin"))
      .max(120, t("nameMax")),
  });
}

export type ProfileFormValues = z.infer<ReturnType<typeof createProfileSchema>>;
