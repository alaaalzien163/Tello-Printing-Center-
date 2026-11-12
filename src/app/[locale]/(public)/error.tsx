"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function PublicError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errorPage");

  return (
    <section className="flex min-h-[70vh] items-center">
      <div className="container-page py-16 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <TriangleAlert className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="mx-auto mt-3 max-w-xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-muted-foreground">
          {t("description")}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={reset}>
            <RotateCcw aria-hidden="true" />
            {t("retry")}
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">{t("home")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
