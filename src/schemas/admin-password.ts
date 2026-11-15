import { z } from "zod";

import type { ValidationTranslator } from "./shared";

export function createPasswordChangeSchema(t: ValidationTranslator) {
  return z
    .object({
      currentPassword: z.string().min(1, t("passwordRequired")),
      newPassword: z
        .string()
        .min(1, t("passwordRequired"))
        .min(8, t("passwordMin")),
      confirmPassword: z.string().min(1, t("passwordConfirmRequired")),
    })
    .refine((values) => values.newPassword === values.confirmPassword, {
      path: ["confirmPassword"],
      message: t("passwordConfirmMismatch"),
    })
    .refine((values) => values.newPassword !== values.currentPassword, {
      path: ["newPassword"],
      message: t("passwordSame"),
    });
}

export type PasswordChangeFormValues = z.infer<
  ReturnType<typeof createPasswordChangeSchema>
>;
