"use client";

import { Compass } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function AdminNotFound() {
  const t = useTranslations("admin.notFound");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Compass className="size-5" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-xl font-semibold text-foreground">{t("title")}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{t("description")}</p>
      <Button asChild className="mt-6">
        <Link href="/admin">{t("back")}</Link>
      </Button>
    </div>
  );
}
