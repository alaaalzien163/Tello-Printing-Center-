"use client";

import { MessageCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button, type buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { VariantProps } from "class-variance-authority";

import { absoluteUrl } from "@/config/site";
import type { Locale } from "@/i18n/routing";
import {
  buildWhatsAppOrderUrl,
  externalLinkProps,
  getConfiguredWhatsAppNumber,
} from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

interface WhatsAppOrderButtonProps {
  productName: string;
  sku: string;
  formattedPrice: string;
  productPath: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  compact?: boolean;
  iconOnly?: boolean;
  className?: string;
}

/**
 * Renders a real WhatsApp order link only when a valid number is configured.
 * Otherwise it explains how to configure the integration instead of inventing
 * a contact channel or producing a broken external link.
 */
export function WhatsAppOrderButton({
  productName,
  sku,
  formattedPrice,
  productPath,
  variant = "whatsapp",
  size = "default",
  compact = false,
  iconOnly = false,
  className,
}: WhatsAppOrderButtonProps) {
  const t = useTranslations("whatsapp");
  const locale = useLocale() as Locale;
  const link = buildWhatsAppOrderUrl(getConfiguredWhatsAppNumber(), {
    productName,
    sku,
    formattedPrice,
    productUrl: absoluteUrl(productPath),
    locale,
  });

  const label = compact || iconOnly ? t("orderShort") : t("order");

  if (link) {
    return (
      <Button asChild variant={variant} size={size} className={className}>
        <a
          href={link.href}
          {...externalLinkProps}
          aria-label={iconOnly ? `${t("order")} — ${productName}` : undefined}
          title={t("opensInNewTab")}
        >
          <MessageCircle aria-hidden="true" />
          {iconOnly ? <span className="sr-only">{t("order")}</span> : label}
        </a>
      </Button>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className={cn("text-muted-foreground", className)}
          aria-label={iconOnly ? `${t("unavailable")} — ${productName}` : undefined}
        >
          <MessageCircle aria-hidden="true" />
          {iconOnly ? <span className="sr-only">{t("unavailable")}</span> : t("unavailableShort")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("configTitle")}</DialogTitle>
          <DialogDescription>{t("configDescription")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled>
            {t("unavailableShort")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
