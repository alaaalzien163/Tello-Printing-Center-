import { ArrowRight, BadgeCheck, Layers, MessageSquare, Printer } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export async function AboutSection() {
  const t = await getTranslations("about");
  const points = [
    { key: "precision", icon: Printer, title: t("points.precisionTitle"), body: t("points.precisionDescription") },
    { key: "materials", icon: Layers, title: t("points.materialsTitle"), body: t("points.materialsDescription") },
    { key: "support", icon: MessageSquare, title: t("points.supportTitle"), body: t("points.supportDescription") },
  ] as const;

  return (
    <section id="about" className="section-space scroll-mt-24">
      <div className="container-page grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="relative order-2 lg:order-1">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
            <div className="relative aspect-[4/3] w-full">
              <Image
                src="/images/facility.svg"
                alt={t("imageAlt")}
                fill
                sizes="(min-width: 1024px) 36rem, 92vw"
                className="object-cover"
              />
            </div>
          </div>
          <div className="absolute -bottom-5 start-5 flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 shadow-lift sm:start-8">
            <span className="flex size-8 items-center justify-center rounded-full bg-success/10 text-success">
              <BadgeCheck className="size-4" aria-hidden="true" />
            </span>
            <span className="text-xs font-semibold text-foreground">{t("badge")}</span>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">{t("description")}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("body")}</p>

          <ul className="mt-8 space-y-5">
            {points.map(({ key, icon: Icon, title, body }) => (
              <li key={key} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/5 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ul>

          <Button asChild variant="outline" className="mt-8">
            <Link href="/contact">
              {t("cta")}
              <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
