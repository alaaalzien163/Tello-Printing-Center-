import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  CalendarClock,
  Cpu,
  Droplets,
  Factory,
  FileStack,
  HandCoins,
  Layers,
  MapPin,
  MessageSquare,
  Printer,
  ScanLine,
} from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export async function AboutSection() {
  const t = await getTranslations("about");

  const facts = [
    { label: t("facts.foundedLabel"), value: t("facts.foundedValue") },
    { label: t("facts.locationLabel"), value: t("facts.locationValue") },
    { label: t("facts.experienceLabel"), value: t("facts.experienceValue") },
  ];

  const services = [
    {
      key: "printing",
      icon: Boxes,
      title: t("services.items.printing.title"),
      body: t("services.items.printing.description"),
    },
    {
      key: "scanning",
      icon: ScanLine,
      title: t("services.items.scanning.title"),
      body: t("services.items.scanning.description"),
    },
    {
      key: "industrial",
      icon: Printer,
      title: t("services.items.industrial.title"),
      body: t("services.items.industrial.description"),
    },
    {
      key: "documents",
      icon: FileStack,
      title: t("services.items.documents.title"),
      body: t("services.items.documents.description"),
    },
  ] as const;

  const filamentChips = [
    t("materials.filaments.chips.pla"),
    t("materials.filaments.chips.petg"),
    t("materials.filaments.chips.tpu"),
    t("materials.filaments.chips.abs"),
    t("materials.filaments.chips.carbon"),
  ];

  const materialCards = [
    {
      key: "industrial",
      icon: Factory,
      title: t("materials.industrial.title"),
      body: t("materials.industrial.description"),
    },
    {
      key: "consumables",
      icon: Droplets,
      title: t("materials.consumables.title"),
      body: t("materials.consumables.description"),
    },
  ] as const;

  const reasons = [
    {
      key: "heritage",
      icon: CalendarClock,
      title: t("why.points.heritage.title"),
      body: t("why.points.heritage.description"),
    },
    {
      key: "technology",
      icon: Cpu,
      title: t("why.points.technology.title"),
      body: t("why.points.technology.description"),
    },
    {
      key: "value",
      icon: HandCoins,
      title: t("why.points.value.title"),
      body: t("why.points.value.description"),
    },
  ] as const;

  return (
    <section id="about" aria-labelledby="about-title" className="section-space scroll-mt-24">
      <div className="container-page">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <span className="eyebrow">{t("eyebrow")}</span>
            <h2
              id="about-title"
              className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              {t("title")}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-[1.05rem]">
              {t("description")}
            </p>

            <dl className="mt-8 grid max-w-xl grid-cols-3 gap-4 border-t border-border pt-6">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-[0.65rem] leading-4 font-medium tracking-[0.16em] text-muted-foreground uppercase">
                    {fact.label}
                  </dt>
                  <dd className="mt-1.5 text-base font-semibold text-foreground sm:text-lg">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-brand-navy shadow-lift">
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src="/images/about-inspection.svg"
                  alt={t("imageAlt")}
                  fill
                  sizes="(min-width: 1024px) 36rem, 92vw"
                  className="object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-navy/70 via-transparent to-transparent" />
              </div>

              <div className="absolute start-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-brand-navy/55 px-3 py-1.5 text-[0.68rem] font-medium text-white backdrop-blur-md">
                <BadgeCheck className="size-3.5 text-brand-cyan" aria-hidden="true" />
                {t("badge")}
              </div>
            </div>

            <div className="absolute -bottom-4 end-5 hidden items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-soft sm:flex">
              <MapPin className="size-4 text-primary" aria-hidden="true" />
              <span className="text-xs font-semibold text-foreground">{t("story.location")}</span>
            </div>
          </div>
        </div>

        <div className="mt-16 overflow-hidden rounded-3xl border border-border bg-card/70 shadow-soft md:mt-20">
          <div className="relative grid gap-8 p-6 md:p-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
            <div
              className="surface-grid pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-20"
              aria-hidden="true"
            />

            <div className="relative">
              <span className="eyebrow">{t("story.eyebrow")}</span>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {t("story.title")}
              </h3>
            </div>

            <div className="relative space-y-4 border-s border-primary/20 ps-5 md:ps-8">
              <p className="text-sm leading-7 text-muted-foreground md:text-base">
                {t("story.paragraphs.experience")}
              </p>
              <p className="text-sm leading-7 text-muted-foreground md:text-base">
                {t("story.paragraphs.choice")}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 md:mt-20">
          <AboutHeading
            eyebrow={t("services.eyebrow")}
            title={t("services.title")}
            description={t("services.description")}
          />

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map(({ key, icon: Icon, title, body }, index) => (
              <article
                key={key}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-soft transition-[border-color,box-shadow] duration-300 hover:border-primary/30 hover:shadow-lift"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl border border-primary/15 bg-primary/5 text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-[0.65rem] font-medium tracking-widest text-muted-foreground/70">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h4 className="mt-5 text-base font-semibold text-foreground">{title}</h4>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                <span
                  className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  aria-hidden="true"
                />
              </article>
            ))}
          </div>
        </div>

        <div className="mt-16 rounded-3xl border border-border bg-muted/40 p-6 md:mt-20 md:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
            <div>
              <span className="eyebrow">{t("materials.eyebrow")}</span>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {t("materials.title")}
              </h3>
              <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">
                {t("materials.description")}
              </p>
            </div>

            <div className="grid gap-4">
              <article className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/5 text-primary">
                    <Layers className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      {t("materials.filaments.title")}
                    </h4>
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                      {t("materials.filaments.description")}
                    </p>
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {filamentChips.map((chip) => (
                        <li
                          key={chip}
                          className="rounded-full border border-border bg-background px-2.5 py-1 text-[0.7rem] font-medium text-foreground"
                        >
                          {chip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>

              <div className="grid gap-4 sm:grid-cols-2">
                {materialCards.map(({ key, icon: Icon, title, body }) => (
                  <article
                    key={key}
                    className="rounded-2xl border border-border bg-card p-5 shadow-soft"
                  >
                    <span className="flex size-9 items-center justify-center rounded-lg border border-primary/15 bg-primary/5 text-primary">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <h4 className="mt-3 text-sm font-semibold text-foreground">{title}</h4>
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-16 overflow-hidden rounded-3xl border border-white/10 bg-brand-navy p-6 text-white md:mt-20 md:p-10">
          <div
            className="surface-grid pointer-events-none absolute inset-0 opacity-20"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -end-24 -top-24 size-72 rounded-full bg-brand-cyan/10 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-16">
            <div>
              <span className="eyebrow text-brand-cyan">{t("why.eyebrow")}</span>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                {t("why.title")}
              </h3>
              <p className="mt-4 max-w-lg text-sm leading-7 text-white/70 md:text-base">
                {t("why.description")}
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-white text-brand-navy hover:bg-white/90">
                  <Link href="/contact">
                    <MessageSquare aria-hidden="true" />
                    {t("why.cta")}
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/products">
                    {t("why.secondaryCta")}
                    <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>

            <ul className="space-y-3">
              {reasons.map(({ key, icon: Icon, title, body }) => (
                <li
                  key={key}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-brand-cyan">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold">{title}</h4>
                    <p className="mt-1 text-sm leading-6 text-white/65">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function AboutHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <span className="eyebrow">{eyebrow}</span>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h3>
      <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">{description}</p>
    </div>
  );
}
