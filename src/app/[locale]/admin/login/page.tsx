import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import type { Locale } from "@/i18n/routing";

interface LoginPageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: LoginPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("loginTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminLoginPage({ params }: LoginPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminLoginForm />;
}
