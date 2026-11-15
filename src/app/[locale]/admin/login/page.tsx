import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import type { Locale } from "@/i18n/routing";
import { getAdminAccess } from "@/lib/auth/admin";
import type { AdminLoginError } from "@/lib/actions/admin-auth";

interface LoginPageProps {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ reason?: string }>;
}

export async function generateMetadata({ params }: LoginPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("loginTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminLoginPage({ params, searchParams }: LoginPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const access = await getAdminAccess();
  if (access.status === "authorized") {
    redirect(`/${locale}/admin`);
  }

  const { reason } = await searchParams;
  const initialError: AdminLoginError | undefined =
    reason === "forbidden" ? "notAuthorized" : undefined;

  return <AdminLoginForm initialError={initialError} />;
}
