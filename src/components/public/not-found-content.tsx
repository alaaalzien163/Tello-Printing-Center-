import { ArrowLeft, Compass } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export async function NotFoundContent() {
  const t = await getTranslations("notFound");

  return (
    <section className="surface-glow flex min-h-[70vh] items-center">
      <div className="container-page py-16 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-primary/15 bg-primary/5 text-primary">
          <Compass className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="mx-auto mt-3 max-w-xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-muted-foreground">
          {t("description")}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/">
              <ArrowLeft className="rtl:rotate-180" aria-hidden="true" />
              {t("backHome")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/products">{t("exploreProducts")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
