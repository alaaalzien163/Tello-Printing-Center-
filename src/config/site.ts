import type { LocalizedText } from "@/domain/common";

const FALLBACK_SITE_URL = "http://localhost:3000";

function readPublicEnv(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeSiteUrl(value: string | undefined): string {
  const candidate = readPublicEnv(value) ?? FALLBACK_SITE_URL;
  try {
    const url = new URL(candidate);
    return url.origin.replace(/\/$/, "");
  } catch {
    return FALLBACK_SITE_URL;
  }
}

function isPublicHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export interface SocialLink {
  key: "linkedin" | "instagram" | "x";
  href: string;
}

const socialCandidates: Array<{ key: SocialLink["key"]; value: string | undefined }> = [
  { key: "linkedin", value: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN },
  { key: "instagram", value: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM },
  { key: "x", value: process.env.NEXT_PUBLIC_SOCIAL_X },
];

const addressEn = readPublicEnv(process.env.NEXT_PUBLIC_CONTACT_ADDRESS_EN);
const addressAr = readPublicEnv(process.env.NEXT_PUBLIC_CONTACT_ADDRESS_AR);

const contactAddress: LocalizedText | null =
  addressEn || addressAr
    ? {
        en: addressEn ?? addressAr ?? "",
        ar: addressAr ?? addressEn ?? "",
      }
    : null;

export const siteConfig = {
  name: "Tello Printing Center",
  url: normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
  whatsappNumber: readPublicEnv(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER),
  contact: {
    email: readPublicEnv(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
    phone: readPublicEnv(process.env.NEXT_PUBLIC_CONTACT_PHONE),
    address: contactAddress,
  },
  socialLinks: socialCandidates.flatMap<SocialLink>(({ key, value }) => {
    const href = readPublicEnv(value);
    return href && isPublicHttpUrl(href) ? [{ key, href }] : [];
  }),
} as const;

/** Build an absolute URL for canonical metadata and order messages. */
export function absoluteUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${normalizedPath}`;
}
