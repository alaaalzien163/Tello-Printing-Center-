import { CheckCircle2, Clock3, FileCheck2, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PrintRequestForm } from "@/components/public/print-request-form";
import { SectionHeading } from "@/components/shared/section-heading";
import type { Locale } from "@/i18n/routing";
import { localizedAlternates } from "@/lib/metadata";
import { getTurnstileSiteKey } from "@/lib/print-requests/turnstile";

interface PrintRequestPageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({
  params,
}: PrintRequestPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("printRequestTitle"),
    description: t("printRequestDescription"),
    alternates: localizedAlternates(locale, "/print-request"),
  };
}

export default async function PrintRequestPage({ params }: PrintRequestPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("printRequest");
  const turnstileSiteKey = getTurnstileSiteKey();

  const steps = [
    { icon: FileCheck2, title: t("page.stepOneTitle"), description: t("page.stepOneDescription") },
    { icon: Clock3, title: t("page.stepTwoTitle"), description: t("page.stepTwoDescription") },
    { icon: CheckCircle2, title: t("page.stepThreeTitle"), description: t("page.stepThreeDescription") },
  ];

  return (
    <div className="section-space">
      <div className="container-page">
        <SectionHeading
          as="h1"
          eyebrow={t("page.eyebrow")}
          title={t("page.title")}
          description={t("page.description")}
          className="mx-auto max-w-3xl md:flex-col md:items-center md:text-center"
        />

        <div className="mx-auto mt-10 grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <PrintRequestForm turnstileSiteKey={turnstileSiteKey} />

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h2 className="text-sm font-semibold text-foreground">{t("page.howItWorks")}</h2>
              <ol className="mt-4 space-y-4">
                {steps.map((step, index) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-text">
                      <step.icon className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        <span className="me-1 text-muted-foreground">{index + 1}.</span>
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-2xl border border-border bg-muted/30 p-5">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ShieldCheck className="size-4 text-primary-text" aria-hidden="true" />
                {t("page.privacyTitle")}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {t("page.privacyDescription")}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
