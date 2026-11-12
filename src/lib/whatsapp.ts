export interface WhatsAppOrderDetails {
  productName: string;
  sku: string;
  formattedPrice: string;
  productUrl: string;
  locale: "en" | "ar";
}

export interface WhatsAppLink {
  href: string;
  message: string;
}

const WHATSAPP_NUMBER_PATTERN = /^\d{8,15}$/;

/**
 * Normalizes an international number for wa.me.
 * Accepts common separators and a leading `+` or `00`, then requires 8–15 digits.
 * Returns null for missing or invalid values so no invalid link is created.
 */
export function normalizeWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let digits = raw.trim().replace(/[\s().-]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("00")) digits = digits.slice(2);

  return WHATSAPP_NUMBER_PATTERN.test(digits) ? digits : null;
}

export function getConfiguredWhatsAppNumber(): string | null {
  return normalizeWhatsAppNumber(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);
}

export function isWhatsAppConfigured(): boolean {
  return getConfiguredWhatsAppNumber() !== null;
}

export function buildWhatsAppOrderMessage(details: WhatsAppOrderDetails): string {
  if (details.locale === "ar") {
    return [
      "مرحباً مركز تيلو للطباعة،",
      "",
      "أرغب في طلب المنتج التالي:",
      `• المنتج: ${details.productName}`,
      `• رمز المنتج: ${details.sku}`,
      `• السعر: ${details.formattedPrice}`,
      `• رابط المنتج: ${details.productUrl}`,
      "",
      "يرجى تأكيد التوفر والخطوات التالية للطلب.",
      "",
      "شكراً لكم.",
    ].join("\n");
  }

  return [
    "Hello Tello Printing Center,",
    "",
    "I would like to order the following product:",
    `• Product: ${details.productName}`,
    `• SKU: ${details.sku}`,
    `• Price: ${details.formattedPrice}`,
    `• Product link: ${details.productUrl}`,
    "",
    "Please confirm availability and the next steps to place the order.",
    "",
    "Thank you.",
  ].join("\n");
}

/**
 * Creates a wa.me order link. Returns null when the number is not configured
 * or invalid, which lets the UI show configuration guidance instead of a
 * broken external link.
 */
export function buildWhatsAppOrderUrl(
  number: string | null | undefined,
  details: WhatsAppOrderDetails,
): WhatsAppLink | null {
  const normalized = normalizeWhatsAppNumber(number);
  if (!normalized) return null;

  const message = buildWhatsAppOrderMessage(details);
  return {
    href: `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`,
    message,
  };
}

export function buildWhatsAppContactUrl(
  number: string | null | undefined,
  locale: "en" | "ar",
): string | null {
  const normalized = normalizeWhatsAppNumber(number);
  if (!normalized) return null;

  const message =
    locale === "ar"
      ? "مرحباً مركز تيلو للطباعة،\n\nأرغب في الاستفسار عن منتجاتكم وخيارات الطلب.\n\nشكراً لكم."
      : "Hello Tello Printing Center,\n\nI would like to ask about your products and ordering options.\n\nThank you.";

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export const externalLinkProps = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const;
