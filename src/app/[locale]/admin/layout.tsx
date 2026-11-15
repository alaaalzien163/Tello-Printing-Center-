import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { isLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface AdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * Admin routes are always request-rendered because access depends on the
 * Supabase session. The dashboard group performs the authorization check.
 */
export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  return children;
}
