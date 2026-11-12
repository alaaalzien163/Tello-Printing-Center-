"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Languages, Loader2, LogOut, Monitor, Moon, Sun, UserRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useDemoData } from "@/components/admin/demo-data-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ThemePreference } from "@/domain/common";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, locales, type Locale } from "@/i18n/routing";
import { getRepositories } from "@/repositories";
import { createProfileSchema, type ProfileFormValues } from "@/schemas/contact";
import { demoAdminAuth } from "@/services/demo-admin-auth";
import { useAdminAuthStore } from "@/stores/admin-auth-store";

const repositories = getRepositories();

const themeOptions: Array<{ value: ThemePreference; labelKey: "light" | "dark" | "system"; icon: typeof Sun }> = [
  { value: "light", labelKey: "light", icon: Sun },
  { value: "dark", labelKey: "dark", icon: Moon },
  { value: "system", labelKey: "system", icon: Monitor },
];

export function AdminProfile() {
  const t = useTranslations("admin.profile");
  const tt = useTranslations("theme");
  const tl = useTranslations("language");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading, reload } = useDemoData();
  const { theme, setTheme } = useTheme();
  const session = useAdminAuthStore((state) => state.session);
  const clearSession = useAdminAuthStore((state) => state.clearSession);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(createProfileSchema(tv)),
    defaultValues: { name: "" },
    mode: "onBlur",
  });

  useEffect(() => {
    if (profile) reset({ name: profile.name });
  }, [profile, reset]);

  async function onSubmit(values: ProfileFormValues) {
    try {
      await repositories.profile.update({ name: values.name.trim() });
      await reload();
      toast.success(t("saved"));
    } catch {
      toast.error(t("saveError"));
    }
  }

  function switchLocale(target: Locale) {
    if (target === locale) return;
    const { search, hash } = window.location;
    router.replace(`${pathname}${search}${hash}`, { locale: target, scroll: false });
  }

  async function signOut() {
    await demoAdminAuth.signOut();
    clearSession();
    router.replace("/admin/login");
  }

  const initials = profile?.name
    ? profile.name
        .split(" ")
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase()
    : "TA";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-5 shadow-soft sm:p-6">
            <div className="flex items-center gap-4">
              <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-semibold text-primary">
                {initials}
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-foreground">
                  {profile?.name ?? t("name")}
                </h3>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{session?.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("avatarHint")}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="profile-name">{t("name")}</Label>
                <Input
                  id="profile-name"
                  autoComplete="name"
                  placeholder={t("namePlaceholder")}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "profile-name-error" : undefined}
                  {...register("name")}
                />
                {errors.name ? (
                  <p id="profile-name-error" className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="profile-email">{t("email")}</Label>
                <Input
                  id="profile-email"
                  value={profile?.email ?? ""}
                  readOnly
                  disabled
                  dir="ltr"
                  aria-describedby="profile-email-hint"
                />
                <p id="profile-email-hint" className="text-xs text-muted-foreground">
                  {t("emailHint")}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={isSubmitting || !isDirty}>
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Check aria-hidden="true" />
                  )}
                  {isSubmitting ? tc("saving") : t("save")}
                </Button>
                {profile ? (
                  <span className="text-xs text-muted-foreground">{t("role")}: {profile.role}</span>
                ) : null}
              </div>
            </form>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-soft sm:p-6" aria-labelledby="preferences-title">
            <h3 id="preferences-title" className="text-base font-semibold text-foreground">
              {t("preferencesTitle")}
            </h3>

            <div className="mt-5 grid gap-5">
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5">
                  <Languages className="size-3.5" aria-hidden="true" />
                  {t("preferredLanguage")}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {locales.map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant={value === locale ? "default" : "outline"}
                      size="sm"
                      onClick={() => switchLocale(value)}
                      aria-pressed={value === locale}
                      aria-label={tl("switchTo", { language: localeNames[value] })}
                      lang={value}
                    >
                      {localeNames[value]}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{t("preferredLanguageHint")}</p>
              </div>

              <div className="grid gap-2">
                <Label>{t("themePreference")}</Label>
                <div className="flex flex-wrap gap-2">
                  {themeOptions.map(({ value, labelKey, icon: Icon }) => (
                    <Button
                      key={value}
                      type="button"
                      variant={theme === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme(value)}
                      aria-pressed={theme === value}
                    >
                      <Icon className="size-3.5" aria-hidden="true" />
                      {tt(labelKey)}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{t("themeHint")}</p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-5 shadow-soft sm:p-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <UserRound className="size-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">{t("sessionTitle")}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("sessionDescription")}</p>
            {loading ? (
              <p className="mt-2 text-xs text-muted-foreground">{tc("loading")}</p>
            ) : null}
            <Button
              variant="outline"
              className="mt-5 w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => void signOut()}
            >
              <LogOut className="size-4 rtl:rotate-180" aria-hidden="true" />
              {t("signOut")}
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
