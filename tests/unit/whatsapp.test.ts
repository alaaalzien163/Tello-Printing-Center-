import { describe, expect, it } from "vitest";

import {
  buildWhatsAppContactUrl,
  buildWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
  normalizeWhatsAppNumber,
} from "@/lib/whatsapp";

const orderDetails = {
  productName: "Tello Forge X1",
  sku: "TEL-FDM-001",
  formattedPrice: "$14,500",
  productUrl: "https://example.com/en/products/forge-x1",
  locale: "en" as const,
};

describe("normalizeWhatsAppNumber", () => {
  it("normalizes an international number with common separators", () => {
    expect(normalizeWhatsAppNumber("+966 55 123 4567")).toBe("966551234567");
    expect(normalizeWhatsAppNumber("00966-55-123-4567")).toBe("966551234567");
    expect(normalizeWhatsAppNumber("(966) 55.123.4567")).toBe("966551234567");
  });

  it("rejects missing, short, long and non-numeric values", () => {
    expect(normalizeWhatsAppNumber(null)).toBeNull();
    expect(normalizeWhatsAppNumber(undefined)).toBeNull();
    expect(normalizeWhatsAppNumber("")).toBeNull();
    expect(normalizeWhatsAppNumber("12345")).toBeNull();
    expect(normalizeWhatsAppNumber("call-me-maybe")).toBeNull();
    expect(normalizeWhatsAppNumber("1234567890123456")).toBeNull();
  });
});

describe("buildWhatsAppOrderUrl", () => {
  it("builds a wa.me URL with an encoded order message", () => {
    const link = buildWhatsAppOrderUrl("+966551234567", orderDetails);

    expect(link).not.toBeNull();
    expect(link?.href.startsWith("https://wa.me/966551234567?text=")).toBe(true);
    expect(link?.href).not.toContain(" ");
    expect(link?.message).toContain("Tello Forge X1");
    expect(link?.message).toContain("TEL-FDM-001");
    expect(link?.message).toContain("$14,500");
  });

  it("returns null instead of inventing a number when configuration is missing", () => {
    expect(buildWhatsAppOrderUrl(null, orderDetails)).toBeNull();
    expect(buildWhatsAppOrderUrl("", orderDetails)).toBeNull();
    expect(buildWhatsAppOrderUrl("invalid", orderDetails)).toBeNull();
  });

  it("writes the order message in Arabic for the Arabic locale", () => {
    const message = buildWhatsAppOrderMessage({ ...orderDetails, locale: "ar" });

    expect(message).toContain("مرحباً مركز تيلو للطباعة");
    expect(message).toContain("Tello Forge X1");
    expect(message).toContain("رابط المنتج");
  });
});

describe("buildWhatsAppContactUrl", () => {
  it("builds a localized contact link and validates the number", () => {
    expect(buildWhatsAppContactUrl("966551234567", "en")).toContain("https://wa.me/966551234567");
    expect(buildWhatsAppContactUrl("966551234567", "ar")).toContain(
      encodeURIComponent("مرحباً مركز تيلو للطباعة"),
    );
    expect(buildWhatsAppContactUrl(null, "en")).toBeNull();
  });
});
