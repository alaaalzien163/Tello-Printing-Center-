import { defineRouting } from "next-intl/routing";

export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ar";

export const localeNames: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

export const localeDirection: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  ar: "rtl",
};

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "ar";
}

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  // HTML metadata and the sitemap already expose complete hreflang links.
  // Disable next-intl's HTTP Link header so it cannot disagree with them.
  alternateLinks: false,
  // Arabic is the site's default language. Automatic Accept-Language
  // detection is disabled so unprefixed URLs always resolve to Arabic;
  // visitors can still switch to English explicitly or open /en.
  localeDetection: false,
});
