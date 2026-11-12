import { ArrowLeft, LockKeyhole } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { isLocale } from "@/i18n/routing";

interface AdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  // The demo dashboard is intentionally unavailable in production builds.
  // Phase 2 replaces this gate with Supabase Auth + server-side authorization.
  if (process.env.NODE_ENV === "development") {
    return children;
  }

  const t = await getTranslations("admin.login");

  return (
    <div className="surface-glow flex min-h-dvh flex-col">
      <header className="container-page flex h-(--header-height) items-center justify-between">
        <Logo />
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <ArrowLeft className="rtl:rotate-180" aria-hidden="true" />
            {t("backHome")}
          </Link>
        </Button>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-warning/15 text-warning">
            <LockKeyhole className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-xl font-semibold text-foreground">{t("disabledTitle")}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("disabledDescription")}</p>
          <Button asChild className="mt-6">
            <Link href="/">{t("backHome")}</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
