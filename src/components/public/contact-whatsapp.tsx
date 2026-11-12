import { MessageCircle } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import {
  buildWhatsAppContactUrl,
  externalLinkProps,
  normalizeWhatsAppNumber,
} from "@/lib/whatsapp";

export async function ContactWhatsApp() {
  const [t, locale] = await Promise.all([getTranslations("contact"), getLocale()]);
  const whatsappHref = buildWhatsAppContactUrl(siteConfig.whatsappNumber, locale);
  const normalizedNumber = normalizeWhatsAppNumber(siteConfig.whatsappNumber);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 sm:p-8">
      <span className="flex size-11 items-center justify-center rounded-xl bg-whatsapp/10 text-whatsapp">
        <MessageCircle className="size-5" aria-hidden="true" />
      </span>

      <h3 className="mt-4 text-lg font-semibold text-foreground">{t("whatsappTitle")}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("whatsappDescription")}</p>

      {normalizedNumber ? (
        <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4">
          <span className="block text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t("whatsappNumberLabel")}
          </span>
          <span
            className="mt-1 block font-mono text-lg font-semibold text-foreground"
            dir="ltr"
          >
            +{normalizedNumber}
          </span>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">
          {t("whatsappNotConfigured")}
        </div>
      )}

      {whatsappHref ? (
        <Button asChild variant="whatsapp" size="lg" className="mt-6 w-full">
          <a href={whatsappHref} {...externalLinkProps}>
            <MessageCircle aria-hidden="true" />
            {t("whatsappCta")}
          </a>
        </Button>
      ) : (
        <Button variant="outline" size="lg" className="mt-6 w-full" disabled>
          <MessageCircle aria-hidden="true" />
          {t("whatsappCta")}
        </Button>
      )}

      <p className="mt-auto pt-6 text-xs leading-5 text-muted-foreground">{t("whatsappHint")}</p>
    </div>
  );
}
