import { ArrowRight, CheckCircle2, MessageSquare, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Lazy3DContainer } from "@/components/3d/lazy-3d-container";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export async function HeroSection() {
  const t = await getTranslations("hero");
  const metrics = [
    { label: t("metricPrecision"), value: t("metricPrecisionValue") },
    { label: t("metricMaterials"), value: t("metricMaterialsValue") },
    { label: t("metricSupport"), value: t("metricSupportValue") },
  ];

  return (
    <section className="surface-glow relative overflow-hidden border-b border-border/70">
      <div className="surface-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="container-page relative grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary">
            <span className="relative flex size-1.5" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
            </span>
            {t("eyebrow")}
          </span>

          <h1 className="mt-6 text-4xl leading-[1.06] font-semibold tracking-tight text-foreground sm:text-5xl xl:text-[3.65rem]">
            {t("title")}
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground md:text-lg md:leading-8">
            {t("description")}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/products">
                {t("primaryCta")}
                <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/contact">
                <MessageSquare aria-hidden="true" />
                {t("secondaryCta")}
              </Link>
            </Button>
          </div>

          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-border pt-6">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <dt className="text-[0.65rem] leading-4 font-medium tracking-wide text-muted-foreground uppercase">
                  {metric.label}
                </dt>
                <dd className="mt-1.5 text-base font-semibold text-foreground sm:text-lg">
                  {metric.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative animate-fade-in lg:ps-4">
          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card shadow-lift">
            <div className="relative aspect-[5/4] w-full">
              <Lazy3DContainer posterAlt={t("imageAlt")} />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-navy/45 via-transparent to-transparent" />
            </div>

            <div className="absolute start-4 top-4 flex items-center gap-2 rounded-full border border-white/15 bg-brand-navy/55 px-3 py-1.5 text-[0.68rem] font-medium text-white backdrop-blur-md">
              <ShieldCheck className="size-3.5 text-brand-cyan" aria-hidden="true" />
              {t("badge")}
            </div>

            <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-brand-navy/60 px-4 py-3 text-white backdrop-blur-md">
              <div>
                <p className="text-[0.6rem] font-medium tracking-[0.16em] text-white/55 uppercase">
                  {t("panelLabel")}
                </p>
                <p className="mt-0.5 text-sm font-semibold">{t("panelValue")}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[0.65rem] font-medium text-white/85">
                <CheckCircle2 className="size-3.5 text-brand-cyan" aria-hidden="true" />
                {t("metricSupportValue")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
