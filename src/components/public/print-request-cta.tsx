import { ArrowRight, FileUp } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export async function PrintRequestCta() {
  const t = await getTranslations("printRequest.cta");

  return (
    <section className="pb-16 sm:pb-20">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-soft sm:p-9">
          <div
            className="pointer-events-none absolute -end-12 -top-16 size-56 rounded-full bg-primary/10 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <span className="eyebrow">{t("eyebrow")}</span>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {t("title")}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                {t("description")}
              </p>
            </div>
            <Button asChild size="lg" className="shrink-0">
              <Link href="/print-request">
                <FileUp aria-hidden="true" />
                {t("action")}
                <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
