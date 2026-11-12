import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { SocialLinks } from "@/components/shared/social-links";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { pickLocalized } from "@/lib/format";
import { buildWhatsAppContactUrl, externalLinkProps } from "@/lib/whatsapp";
import { getPublicCatalog } from "@/repositories/public-catalog";

export async function SiteFooter() {
  const [t, tNav, tContact, locale, catalog] = await Promise.all([
    getTranslations("footer"),
    getTranslations("nav"),
    getTranslations("contact"),
    getLocale(),
    getPublicCatalog(),
  ]);
  const whatsappHref = buildWhatsAppContactUrl(siteConfig.whatsappNumber, locale);
  const categories = catalog.categories;
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-brand-navy text-white/80">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.1fr] lg:gap-12">
        <div>
          <Logo className="[&_span]:text-white [&_span:last-child]:text-white/55" />
          <p className="mt-5 max-w-xs text-sm leading-6 text-white/65">{t("description")}</p>
          {siteConfig.socialLinks.length > 0 ? (
            <div className="mt-6 flex items-center gap-2">
              <span className="text-xs font-medium tracking-wide text-white/50 uppercase">
                {t("follow")}
              </span>
              <SocialLinks links={siteConfig.socialLinks} />
            </div>
          ) : null}
        </div>

        <div>
          <h2 className="text-xs font-semibold tracking-[0.18em] text-white/50 uppercase">
            {t("explore")}
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <Link href="/" className="text-white/70 transition-colors hover:text-white">
                {tNav("home")}
              </Link>
            </li>
            <li>
              <Link href="/#about" className="text-white/70 transition-colors hover:text-white">
                {tNav("about")}
              </Link>
            </li>
            <li>
              <Link href="/products" className="text-white/70 transition-colors hover:text-white">
                {tNav("products")}
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-white/70 transition-colors hover:text-white">
                {tContact("title")}
              </Link>
            </li>
            <li>
              <Link href="/admin" className="text-white/40 transition-colors hover:text-white/80">
                {t("adminLink")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-semibold tracking-[0.18em] text-white/50 uppercase">
            {t("productAreas")}
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href="/products#catalog"
                  className="text-white/70 transition-colors hover:text-white"
                >
                  {pickLocalized(category.name, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-semibold tracking-[0.18em] text-white/50 uppercase">
            {t("contact")}
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            {siteConfig.contact.email ? (
              <li>
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="inline-flex items-center gap-2 text-white/70 transition-colors hover:text-white"
                >
                  <Mail className="size-4 shrink-0" aria-hidden="true" />
                  {siteConfig.contact.email}
                </a>
              </li>
            ) : null}
            {siteConfig.contact.phone ? (
              <li>
                <a
                  href={`tel:${siteConfig.contact.phone.replace(/[^\d+]/g, "")}`}
                  className="inline-flex items-center gap-2 text-white/70 transition-colors hover:text-white"
                  dir="ltr"
                >
                  <Phone className="size-4 shrink-0" aria-hidden="true" />
                  {siteConfig.contact.phone}
                </a>
              </li>
            ) : null}
            {whatsappHref ? (
              <li>
                <a
                  href={whatsappHref}
                  {...externalLinkProps}
                  className="inline-flex items-center gap-2 text-white/70 transition-colors hover:text-white"
                >
                  <MessageCircle className="size-4 shrink-0 text-whatsapp" aria-hidden="true" />
                  WhatsApp
                </a>
              </li>
            ) : null}
            {siteConfig.contact.address ? (
              <li className="flex items-start gap-2 text-white/70">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{pickLocalized(siteConfig.contact.address, locale)}</span>
              </li>
            ) : null}
            {!siteConfig.contact.email &&
            !siteConfig.contact.phone &&
            !whatsappHref &&
            !siteConfig.contact.address ? (
              <li className="text-white/50">{t("contactPending")}</li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("rights", { year })}</p>
          <p className="flex items-center gap-3">
            <span>{t("languageNote")}</span>
            <span aria-hidden="true">·</span>
            <span>{t("builtNote")}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
