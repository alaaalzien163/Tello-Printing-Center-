import type { Metadata } from "next";

import { absoluteUrl } from "@/config/site";
import { defaultLocale, type Locale } from "@/i18n/routing";

export const DEFAULT_OG_IMAGE_PATH = "/images/og-default.png";
export const DEFAULT_OG_IMAGE_WIDTH = 1200;
export const DEFAULT_OG_IMAGE_HEIGHT = 630;

export interface SocialImageInput {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface PageSocialMetadataInput {
  locale: Locale;
  title: string;
  description: string;
  /** Locale-independent path, for example `/products` or `/products/forge-x1`. */
  path?: string;
  siteName: string;
  /** Product image when available; otherwise the default social card is used. */
  image?: SocialImageInput | null;
}

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
      "x-default": `/${defaultLocale}${suffix}`,
    },
  };
}

function localizedPath(locale: Locale, path = ""): string {
  const suffix = path === "/" ? "" : path;
  return `/${locale}${suffix}`;
}

function openGraphLocale(locale: Locale): string {
  return locale === "ar" ? "ar_SA" : "en_US";
}

function socialImage(input: PageSocialMetadataInput): SocialImageInput {
  if (input.image?.url.trim()) {
    return {
      url: absoluteUrl(input.image.url),
      alt: input.image.alt?.trim() || input.title,
      ...(input.image.width ? { width: input.image.width } : {}),
      ...(input.image.height ? { height: input.image.height } : {}),
    };
  }

  return {
    url: absoluteUrl(DEFAULT_OG_IMAGE_PATH),
    alt: input.title,
    width: DEFAULT_OG_IMAGE_WIDTH,
    height: DEFAULT_OG_IMAGE_HEIGHT,
  };
}

/**
 * Complete, page-specific Open Graph and Twitter metadata.
 * Every public page supplies its own absolute URL, title, description and image.
 */
export function pageSocialMetadata(
  input: PageSocialMetadataInput,
): Pick<Metadata, "openGraph" | "twitter"> {
  const image = socialImage(input);

  return {
    openGraph: {
      type: "website",
      siteName: input.siteName,
      title: input.title,
      description: input.description,
      url: absoluteUrl(localizedPath(input.locale, input.path)),
      locale: openGraphLocale(input.locale),
      alternateLocale: input.locale === "ar" ? ["en_US"] : ["ar_SA"],
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [image.url],
    },
  };
}
