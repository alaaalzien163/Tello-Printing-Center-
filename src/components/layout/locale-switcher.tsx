"use client";

import { Check, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, locales, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

interface LocaleSwitcherProps {
  className?: string;
  compact?: boolean;
}

/**
 * Switches the locale while preserving the current path, query string and
 * hash fragment so the visitor stays exactly where they were.
 */
export function LocaleSwitcher({ className, compact = false }: LocaleSwitcherProps) {
  const t = useTranslations("language");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const nextLocale = locale === "en" ? "ar" : "en";

  function switchTo(target: Locale) {
    if (target === locale) return;

    const { search, hash } = window.location;
    startTransition(() => {
      router.replace(`${pathname}${search}${hash}`, { locale: target, scroll: false });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          className={cn("gap-2 text-muted-foreground hover:text-foreground", className)}
          aria-label={t("switchTo", { language: localeNames[nextLocale] })}
          disabled={isPending}
        >
          <Globe className="size-[1.1rem]" />
          {compact ? (
            <span className="sr-only">{t("label")}</span>
          ) : (
            <span className="text-xs font-semibold tracking-wider uppercase">{locale}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {locales.map((value) => (
          <DropdownMenuItem
            key={value}
            onSelect={() => switchTo(value)}
            className="justify-between"
            lang={value}
          >
            <span>{localeNames[value]}</span>
            {value === locale ? <Check className="size-4 text-primary" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
