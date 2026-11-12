import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AboutSection } from "@/components/public/about-section";
import { CategoriesSection } from "@/components/public/categories-section";
import { ContactSection } from "@/components/public/contact-section";
import { FeaturedProductsSection } from "@/components/public/featured-products-section";
import { HeroSection } from "@/components/public/hero-section";
import type { Locale } from "@/i18n/routing";
import { localizedAlternates } from "@/lib/metadata";
import { getPublicCatalog } from "@/repositories/public-catalog";

interface HomePageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: { absolute: t("defaultTitle") },
    alternates: localizedAlternates(locale),
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const catalog = await getPublicCatalog();
  const featured = [
    ...catalog.products.filter((product) => product.featured),
    ...catalog.products.filter((product) => !product.featured),
  ].slice(0, 4);

  return (
    <>
      <HeroSection />
      <AboutSection />
      <CategoriesSection
        categories={catalog.categories}
        products={catalog.products}
        locale={locale}
      />
      <FeaturedProductsSection products={featured} categories={catalog.categories} locale={locale} />
      <ContactSection />
    </>
  );
}
