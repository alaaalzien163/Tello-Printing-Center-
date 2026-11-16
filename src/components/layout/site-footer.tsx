import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { BrandLogo } from "@/components/brand/brand-logo";
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
    <footer className="border-t border-border bg-card">
      <div className="container-page grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.1fr] lg:gap-12">
        <div>
          <Link
            href="/"
            className="inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <BrandLogo className="w-44" />
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-6 text-muted-foreground">{t("description")}</p>
          {siteConfig.socialLinks.length > 0 ? (
            <div className="mt-5">
              <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                {t("follow")}
              </p>
              <SocialLinks
                links={siteConfig.socialLinks}
                className="mt-3"
                linkClassName="border border-border bg-background text-muted-foreground hover:border-primary/35 hover:bg-background hover:text-primary-text"
              />
            </div>
          ) : null}
        </div>

        <div>
          <h2 className="text-xs font-semibold tracking-[0.14em] text-foreground uppercase">
            {t("explore")}
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/" className="text-muted-foreground transition-colors hover:text-primary-text">
                {tNav("home")}
              </Link>
            </li>
            <li>
              <Link href="/#about" className="text-muted-foreground transition-colors hover:text-primary-text">
                {tNav("about")}
              </Link>
            </li>
            <li>
              <Link href="/products" className="text-muted-foreground transition-colors hover:text-primary-text">
                {tNav("products")}
              </Link>
            </li>
            <li>
              <Link
                href="/print-request"
                className="text-muted-foreground transition-colors hover:text-primary-text"
              >
                {tNav("printRequest")}
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-muted-foreground transition-colors hover:text-primary-text">
                {tContact("title")}
              </Link>
            </li>
            <li>
              <Link href="/admin" className="text-muted-foreground/70 transition-colors hover:text-foreground">
                {t("adminLink")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-semibold tracking-[0.14em] text-foreground uppercase">
            {t("productAreas")}
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/products/category/${category.slug}`}
                  className="text-muted-foreground transition-colors hover:text-primary-text"
                >
                  {pickLocalized(category.name, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-semibold tracking-[0.14em] text-foreground uppercase">
            {t("contact")}
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {siteConfig.contact.email ? (
              <li>
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary-text"
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
                  className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary-text"
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
                  className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary-text"
                >
                  <MessageCircle className="size-4 shrink-0 text-whatsapp" aria-hidden="true" />
                  WhatsApp
                </a>
              </li>
            ) : null}
            {siteConfig.contact.address ? (
              <li className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{pickLocalized(siteConfig.contact.address, locale)}</span>
              </li>
            ) : null}
            {!siteConfig.contact.email &&
            !siteConfig.contact.phone &&
            !whatsappHref &&
            !siteConfig.contact.address ? (
              <li className="text-muted-foreground">{t("contactPending")}</li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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
