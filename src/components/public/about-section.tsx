import { ArrowRight, FileText, MapPin, MessageSquare, Package, Printer, Wrench } from "lucide-react";
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
      key: "equipment",
      icon: Printer,
      title: t("services.items.equipment.title"),
      body: t("services.items.equipment.description"),
    },
    {
      key: "supplies",
      icon: Package,
      title: t("services.items.supplies.title"),
      body: t("services.items.supplies.description"),
    },
    {
      key: "documents",
      icon: FileText,
      title: t("services.items.documents.title"),
      body: t("services.items.documents.description"),
    },
    {
      key: "support",
      icon: Wrench,
      title: t("services.items.support.title"),
      body: t("services.items.support.description"),
    },
  ] as const;

  const reasons = [
    { key: "heritage", title: t("why.points.heritage.title"), body: t("why.points.heritage.description") },
    { key: "products", title: t("why.points.products.title"), body: t("why.points.products.description") },
    { key: "support", title: t("why.points.support.title"), body: t("why.points.support.description") },
  ] as const;

  return (
    <section id="about" aria-labelledby="about-title" className="section-space scroll-mt-24 border-t border-border/70">
      <div className="container-page">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <p className="eyebrow">{t("eyebrow")}</p>
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

          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <p className="eyebrow">{t("story.eyebrow")}</p>
            <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {t("story.title")}
            </h3>
            <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground md:text-base">
              <p>{t("story.paragraphs.experience")}</p>
              <p>{t("story.paragraphs.choice")}</p>
            </div>
            <p className="mt-6 flex items-center gap-2 border-t border-border pt-4 text-sm font-medium text-foreground">
              <MapPin className="size-4 text-primary-text" aria-hidden="true" />
              {t("story.location")}
            </p>
          </div>
        </div>

        <div className="mt-14 md:mt-16">
          <div className="max-w-3xl">
            <p className="eyebrow">{t("services.eyebrow")}</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {t("services.title")}
            </h3>
            <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">
              {t("services.description")}
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map(({ key, icon: Icon, title, body }) => (
              <article key={key} className="rounded-xl border border-border bg-card p-6">
                <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-secondary text-primary-text">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h4 className="mt-4 text-base font-semibold text-foreground">{title}</h4>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-14 rounded-xl border border-border bg-secondary/60 p-6 md:mt-16 md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-14">
            <div>
              <p className="eyebrow">{t("why.eyebrow")}</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {t("why.title")}
              </h3>
              <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground md:text-base">
                {t("why.description")}
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/contact">
                    <MessageSquare aria-hidden="true" />
                    {t("why.cta")}
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/products">
                    {t("why.secondaryCta")}
                    <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>

            <ul className="space-y-3">
              {reasons.map(({ key, title, body }) => (
                <li key={key} className="rounded-lg border border-border bg-card p-4">
                  <h4 className="text-sm font-semibold text-foreground">{title}</h4>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
