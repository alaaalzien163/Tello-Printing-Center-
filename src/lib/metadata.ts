import type { Metadata } from "next";

import type { Locale } from "@/i18n/routing";

/**
 * Language alternates for a localized public page.
 * `path` is the locale-independent path, for example `/products` or `/products/forge-x1`.
 */
export function localizedAlternates(locale: Locale, path = ""): Metadata["alternates"] {
  const suffix = path === "/" ? "" : path;

  return {
    canonical: `/${locale}${suffix}`,
    languages: {
      en: `/en${suffix}`,
      ar: `/ar${suffix}`,
      "x-default": `/en${suffix}`,
    },
  };
}
