"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("admin.common");
  const tc = useTranslations("common");

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
      <h2 className="text-lg font-semibold text-foreground">{t("errorTitle")}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {t("errorDescription")}
      </p>
      <Button variant="outline" className="mt-5" onClick={reset}>
        <RotateCcw aria-hidden="true" />
        {tc("retry")}
      </Button>
    </div>
  );
}
