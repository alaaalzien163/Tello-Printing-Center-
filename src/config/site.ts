import type { LocalizedText } from "@/domain/common";
import { normalizeHttpOrigin, resolveSiteUrl } from "@/config/site-url";

function readPublicEnv(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * `next.config.ts` resolves the deployment origin once at build time and
 * inlines it as `NEXT_PUBLIC_RESOLVED_SITE_URL`. Reading that value keeps
 * server rendering and client hydration on the same origin, which matters for
 * Preview deployments where `VERCEL_URL` is not available in the browser.
 */
function resolveConfiguredSiteUrl(): string {
  const inlined = readPublicEnv(process.env.NEXT_PUBLIC_RESOLVED_SITE_URL);
  const normalized = inlined ? normalizeHttpOrigin(inlined) : null;
  return normalized ?? resolveSiteUrl();
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
  key: "facebook" | "instagram" | "telegram" | "linkedin" | "x";
  href: string;
}

const socialCandidates: Array<{ key: SocialLink["key"]; value: string | undefined }> = [
  { key: "instagram", value: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM },
  { key: "facebook", value: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK },
  { key: "telegram", value: process.env.NEXT_PUBLIC_SOCIAL_TELEGRAM },
  { key: "linkedin", value: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN },
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
  url: resolveConfiguredSiteUrl(),
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
  // Catalog images already arrive as absolute Supabase Storage URLs. Prefixing
  // them again produced malformed values such as
  // `https://site/https://project.supabase.co/...`.
  if (isPublicHttpUrl(path)) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${normalizedPath}`;
}
