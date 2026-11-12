import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ContactSection } from "@/components/public/contact-section";
import { ContactWhatsAppButton } from "@/components/public/contact-channels";
import type { Locale } from "@/i18n/routing";
import { localizedAlternates } from "@/lib/metadata";

interface ContactPageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("contactTitle"),
    alternates: localizedAlternates(locale, "/contact"),
  };
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("contact");

  return (
    <>
      <section className="surface-glow border-b border-border/70">
        <div className="container-page flex flex-col items-start justify-between gap-6 py-14 md:flex-row md:items-end md:py-18">
          <div className="max-w-2xl">
            <span className="eyebrow">{t("eyebrow")}</span>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
              {t("description")}
            </p>
          </div>
          <ContactWhatsAppButton />
        </div>
      </section>
      <ContactSection className="section-space" showHeading={false} />
    </>
  );
}
