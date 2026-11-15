import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AdminShell } from "@/components/admin/admin-shell";
import { isLocale, type Locale } from "@/i18n/routing";
import { getAdminAccess } from "@/lib/auth/admin";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("adminTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const access = await getAdminAccess();

  if (access.status !== "authorized") {
    const query = access.status === "forbidden" ? "?reason=forbidden" : "";
    redirect(`/${locale}/admin/login${query}`);
  }

  return <AdminShell session={access.session}>{children}</AdminShell>;
}
