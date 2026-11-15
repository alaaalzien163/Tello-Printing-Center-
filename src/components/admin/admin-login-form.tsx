"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Eye, EyeOff, Layers, ShieldCheck, Tags } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/navigation";
import type { AdminLoginError } from "@/lib/actions/admin-auth";
import { signInAdmin } from "@/lib/actions/admin-auth";
import { createLoginSchema, type LoginFormValues } from "@/schemas/contact";

interface AdminLoginFormProps {
  initialError?: AdminLoginError;
}

export function AdminLoginForm({ initialError }: AdminLoginFormProps) {
  const t = useTranslations("admin.login");
  const tv = useTranslations("validation");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<AdminLoginError | null>(initialError ?? null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(createLoginSchema(tv)),
    defaultValues: { email: "", password: "" },
    mode: "onBlur",
  });

  async function onSubmit(values: LoginFormValues) {
    setSubmitting(true);
    setFormError(null);
    try {
      const result = await signInAdmin(values.email, values.password);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setFormError("unavailable");
    } finally {
      setSubmitting(false);
    }
  }

  const features = [
    { icon: Layers, label: t("featureProducts") },
    { icon: Tags, label: t("featureCategories") },
    { icon: ShieldCheck, label: t("featureBilingual") },
  ];

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-brand-black p-10 text-white lg:flex lg:flex-col">
        <div className="surface-grid pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -top-24 -end-24 size-80 rounded-full bg-primary/30 blur-3xl"
          aria-hidden="true"
        />
        <Logo className="relative [&_span]:text-white [&_span:last-child]:text-white/55" />
        <div className="relative mt-auto max-w-md pb-8">
          <p className="text-xs font-semibold tracking-[0.24em] text-brand-pink-soft uppercase">
            {t("eyebrow")}
          </p>
          <p className="mt-4 text-3xl leading-tight font-semibold">{t("title")}</p>
          <p className="mt-4 text-sm leading-7 text-white/65">{t("subtitle")}</p>
          <ul className="mt-8 space-y-4">
            {features.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/8 text-brand-pink-soft">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative border-t border-white/10 pt-5 text-xs text-white/40">
          {t("secureNote")}
        </p>
      </section>

      <section className="flex flex-col bg-background">
        <header className="flex items-center justify-between px-5 py-4 sm:px-8">
          <Logo className="lg:invisible" />
          <div className="flex items-center gap-1">
            <LocaleSwitcher compact />
            <ThemeSwitcher />
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-sm">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary-text uppercase">
              {t("eyebrow")}
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              {t("title")}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("subtitle")}</p>

            <div className="mt-6 rounded-xl border border-border bg-muted/50 p-4 text-xs leading-5">
              <p className="font-semibold text-foreground">{t("accessNoticeTitle")}</p>
              <p className="mt-1 text-muted-foreground">{t("accessNoticeDescription")}</p>
            </div>

            <form
              noValidate
              onSubmit={handleSubmit(onSubmit)}
              className="mt-6 space-y-4"
              aria-label={t("title")}
            >
              <div className="grid gap-2">
                <Label htmlFor="login-email">{t("email")}</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  dir="ltr"
                  placeholder={t("emailPlaceholder")}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "login-email-error" : undefined}
                  {...register("email")}
                />
                {errors.email ? (
                  <p id="login-email-error" className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="login-password">{t("password")}</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    dir="ltr"
                    className="pe-11"
                    placeholder={t("passwordPlaceholder")}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? "login-password-error" : undefined}
                    {...register("password")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute end-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
                {errors.password ? (
                  <p id="login-password-error" className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                ) : null}
              </div>

              {formError ? (
                <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                  {t(formError)}
                </p>
              ) : null}

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? (
                  <span
                    className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                    aria-hidden="true"
                  />
                ) : null}
                {submitting ? t("signingIn") : t("signIn")}
              </Button>
            </form>

            <div className="mt-6">
              <Button asChild variant="ghost" size="sm" className="px-0 text-muted-foreground">
                <Link href="/">
                  <ArrowLeft className="rtl:rotate-180" aria-hidden="true" />
                  {t("backHome")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
