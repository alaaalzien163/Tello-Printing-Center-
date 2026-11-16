import { ArrowRight, Boxes, MessageSquare, Printer, Wrench } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export async function HeroSection() {
  const t = await getTranslations("hero");

  const highlights = [
    {
      key: "catalog",
      icon: Printer,
      title: t("highlights.catalog.title"),
      body: t("highlights.catalog.description"),
    },
    {
      key: "supplies",
      icon: Boxes,
      title: t("highlights.supplies.title"),
      body: t("highlights.supplies.description"),
    },
    {
      key: "support",
      icon: Wrench,
      title: t("highlights.support.title"),
      body: t("highlights.support.description"),
    },
  ] as const;

  return (
    <section className="border-b border-border/70 bg-background">
      <div className="container-page grid items-center gap-10 py-12 md:py-16 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14 lg:py-20">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>

          <h1 className="mt-4 max-w-2xl text-4xl leading-[1.08] font-semibold tracking-tight text-foreground sm:text-5xl xl:text-[3.4rem]">
            {t("title")}
          </h1>

          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground md:text-lg md:leading-8">
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

          <ul className="mt-10 grid gap-5 border-t border-border pt-6 sm:grid-cols-3">
            {highlights.map(({ key, icon: Icon, title, body }) => (
              <li key={key}>
                <span className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-primary-text">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-secondary">
          <Image
            src="/images/printing-equipment.svg"
            alt={t("imageAlt")}
            width={1000}
            height={760}
            priority
            sizes="(min-width: 1024px) 38rem, 92vw"
            className="h-auto w-full"
          />
        </div>
      </div>
    </section>
  );
}
