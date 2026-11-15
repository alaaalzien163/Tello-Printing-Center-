"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changeAdminPassword,
  type AdminPasswordError,
} from "@/lib/actions/admin-password";
import {
  createPasswordChangeSchema,
  type PasswordChangeFormValues,
} from "@/schemas/admin-password";

const emptyValues: PasswordChangeFormValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function AdminPasswordForm() {
  const t = useTranslations("admin.profile");
  const tv = useTranslations("validation");
  const [showPasswords, setShowPasswords] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(createPasswordChangeSchema(tv)),
    defaultValues: emptyValues,
    mode: "onBlur",
  });

  function messageFor(error: AdminPasswordError): string {
    switch (error) {
      case "INVALID_CURRENT":
        return t("passwordInvalidCurrent");
      case "WEAK_PASSWORD":
        return t("passwordWeak");
      case "SAME_PASSWORD":
        return t("passwordSame");
      case "RATE_LIMITED":
        return t("passwordRateLimited");
      case "UNAUTHORIZED":
        return t("passwordUnauthorized");
      default:
        return t("passwordError");
    }
  }

  async function onSubmit(values: PasswordChangeFormValues) {
    try {
      const result = await changeAdminPassword(
        values.currentPassword,
        values.newPassword,
      );

      if (!result.ok) {
        toast.error(messageFor(result.error));
        return;
      }

      reset(emptyValues);
      setShowPasswords(false);
      toast.success(t("passwordChanged"));
    } catch {
      toast.error(t("passwordError"));
    }
  }

  const inputType = showPasswords ? "text" : "password";

  return (
    <section
      className="rounded-xl border border-border bg-card p-5 shadow-soft sm:p-6"
      aria-labelledby="admin-password-title"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <KeyRound className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h3
            id="admin-password-title"
            className="text-base font-semibold text-foreground"
          >
            {t("passwordTitle")}
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {t("passwordSubtitle")}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-5 grid gap-4"
      >
        <div className="grid gap-2">
          <Label htmlFor="admin-current-password">{t("currentPassword")}</Label>
          <Input
            id="admin-current-password"
            type={inputType}
            autoComplete="current-password"
            aria-invalid={Boolean(errors.currentPassword)}
            aria-describedby={
              errors.currentPassword ? "admin-current-password-error" : undefined
            }
            {...register("currentPassword")}
          />
          {errors.currentPassword ? (
            <p id="admin-current-password-error" className="text-xs text-destructive">
              {errors.currentPassword.message}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="admin-new-password">{t("newPassword")}</Label>
          <Input
            id="admin-new-password"
            type={inputType}
            autoComplete="new-password"
            aria-invalid={Boolean(errors.newPassword)}
            aria-describedby={
              errors.newPassword ? "admin-new-password-error" : "admin-password-hint"
            }
            {...register("newPassword")}
          />
          {errors.newPassword ? (
            <p id="admin-new-password-error" className="text-xs text-destructive">
              {errors.newPassword.message}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="admin-confirm-password">{t("confirmPassword")}</Label>
          <Input
            id="admin-confirm-password"
            type={inputType}
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={
              errors.confirmPassword ? "admin-confirm-password-error" : undefined
            }
            {...register("confirmPassword")}
          />
          {errors.confirmPassword ? (
            <p id="admin-confirm-password-error" className="text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          ) : null}
        </div>

        <p id="admin-password-hint" className="text-xs text-muted-foreground">
          {t("passwordHint")}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check aria-hidden="true" />
            )}
            {isSubmitting ? t("changingPassword") : t("changePassword")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPasswords((current) => !current)}
          >
            {showPasswords ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
            {showPasswords ? t("hidePasswords") : t("showPasswords")}
          </Button>
        </div>
      </form>
    </section>
  );
}
