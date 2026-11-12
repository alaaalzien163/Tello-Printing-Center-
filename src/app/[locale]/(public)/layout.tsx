import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SplashScreen } from "@/components/layout/splash-screen";
import { isLocale } from "@/i18n/routing";

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("common");

  return (
    <>
      <a href="#main-content" className="skip-link">
        {t("skipToContent")}
      </a>
      <SplashScreen />
      <SiteHeader />
      <main id="main-content" className="min-h-[60vh]">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
