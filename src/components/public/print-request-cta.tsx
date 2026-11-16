import { ArrowRight, FileUp } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export async function PrintRequestCta() {
  const t = await getTranslations("printRequest.cta");

  return (
    <section className="pb-14 sm:pb-16">
      <div className="container-page">
        <div className="rounded-xl border border-border bg-secondary/60 p-6 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow">{t("eyebrow")}</p>
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
