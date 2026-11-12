import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AdminShell } from "@/components/admin/admin-shell";
import type { Locale } from "@/i18n/routing";

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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
