import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { SocialLinks } from "@/components/shared/social-links";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { pickLocalized } from "@/lib/format";
import { buildWhatsAppContactUrl, externalLinkProps } from "@/lib/whatsapp";

export async function ContactChannels() {
  const [t, locale] = await Promise.all([getTranslations("contact"), getLocale()]);
  const hasDetails = Boolean(
    siteConfig.contact.email || siteConfig.contact.phone || siteConfig.contact.address,
  );

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 sm:p-8">
      <h3 className="text-lg font-semibold text-foreground">{t("infoTitle")}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("infoDescription")}</p>

      {hasDetails ? (
        <ul className="mt-6 space-y-4 text-sm">
          {siteConfig.contact.email ? (
            <li className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Mail className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {t("emailLabel")}
                </span>
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="mt-0.5 block truncate font-medium text-foreground hover:text-primary"
                >
                  {siteConfig.contact.email}
                </a>
              </span>
            </li>
          ) : null}

          {siteConfig.contact.phone ? (
            <li className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Phone className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {t("phoneLabel")}
                </span>
                <a
                  href={`tel:${siteConfig.contact.phone.replace(/[^\d+]/g, "")}`}
                  className="mt-0.5 block font-medium text-foreground hover:text-primary"
                  dir="ltr"
                >
                  {siteConfig.contact.phone}
                </a>
              </span>
            </li>
          ) : null}

          {siteConfig.contact.address ? (
            <li className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <MapPin className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {t("addressLabel")}
                </span>
                <span className="mt-0.5 block font-medium text-foreground">
                  {pickLocalized(siteConfig.contact.address, locale)}
                </span>
              </span>
            </li>
          ) : null}
        </ul>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">
          {t("notConfigured")}
        </div>
      )}

      {siteConfig.socialLinks.length > 0 ? (
        <div className="mt-6 border-t border-border pt-5">
          <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t("followLabel")}
          </h4>
          <SocialLinks
            links={siteConfig.socialLinks}
            className="mt-3 flex-wrap"
            linkClassName="size-9 rounded-lg border border-border bg-background text-muted-foreground hover:border-primary/30 hover:bg-background hover:text-primary"
          />
        </div>
      ) : null}

      <p className="mt-auto pt-8 text-xs leading-5 text-muted-foreground">{t("responseTime")}</p>
    </div>
  );
}

export async function ContactWhatsAppButton() {
  const t = await getTranslations("contact");
  const locale = await getLocale();
  const whatsappHref = buildWhatsAppContactUrl(siteConfig.whatsappNumber, locale);

  if (!whatsappHref) {
    return (
      <Button variant="outline" size="lg" disabled>
        <MessageCircle aria-hidden="true" />
        {t("whatsappCta")}
      </Button>
    );
  }

  return (
    <Button asChild variant="whatsapp" size="lg">
      <a href={whatsappHref} {...externalLinkProps}>
        <MessageCircle aria-hidden="true" />
        {t("whatsappCta")}
      </a>
    </Button>
  );
}
