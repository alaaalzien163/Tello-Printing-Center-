import type { Currency, LocalizedText } from "@/domain/common";

type SupportedLocale = "en" | "ar";

export function pickLocalized(text: LocalizedText, locale: SupportedLocale): string {
  return text[locale]?.trim() || text.en?.trim() || text.ar?.trim() || "";
}

export function formatPrice(price: number, currency: Currency, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: Number.isInteger(price) ? 0 : 2,
  }).format(price);
}

export function formatDate(isoDate: string, locale: SupportedLocale): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export function formatCompactNumber(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    notation: value > 999 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}
