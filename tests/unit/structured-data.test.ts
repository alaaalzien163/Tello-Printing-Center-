import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";
import type { Product } from "@/domain/product";
import { buildProductJsonLd, serializeJsonLd } from "@/lib/structured-data";

const absoluteImage =
  "https://project.supabase.co/storage/v1/object/public/catalog-images/products/p1/image.png";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-1",
    sku: "SKU-1",
    slug: "m1-pro",
    name: { en: "M1 Pro", ar: "إم 1 برو" },
    description: { en: "A professional printer.", ar: "طابعة احترافية." },
    categoryId: "category-1",
    price: 1200,
    currency: "USD",
    image: {
      url: absoluteImage,
      alt: { en: "M1 Pro printer", ar: "طابعة إم 1 برو" },
    },
    active: true,
    featured: false,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildProductJsonLd", () => {
  it("keeps an already absolute image URL", () => {
    const jsonLd = buildProductJsonLd({
      product: product(),
      locale: "en",
      url: `${siteConfig.url}/en/products/m1-pro`,
      categoryName: "Printers",
    });

    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("Product");
    expect(jsonLd.name).toBe("M1 Pro");
    expect(jsonLd.description).toBe("A professional printer.");
    expect(jsonLd.image).toEqual([absoluteImage]);
    expect(jsonLd.url).toBe(`${siteConfig.url}/en/products/m1-pro`);
    expect(jsonLd.category).toBe("Printers");
  });

  it("prefixes a relative image path only once", () => {
    const jsonLd = buildProductJsonLd({
      product: product({
        image: {
          url: "/images/product-printer.svg",
          alt: { en: "Printer", ar: "طابعة" },
        },
      }),
      locale: "en",
      url: `${siteConfig.url}/en/products/m1-pro`,
    });

    expect(jsonLd.image).toEqual([`${siteConfig.url}/images/product-printer.svg`]);
  });

  it("does not claim SKU, brand, offers, availability or pricing", () => {
    const jsonLd = buildProductJsonLd({
      product: product({ active: true }),
      locale: "en",
      url: `${siteConfig.url}/en/products/m1-pro`,
    });

    expect(jsonLd).not.toHaveProperty("sku");
    expect(jsonLd).not.toHaveProperty("brand");
    expect(jsonLd).not.toHaveProperty("offers");
    expect(jsonLd).not.toHaveProperty("availability");
  });

  it("omits an empty description, image and category", () => {
    const jsonLd = buildProductJsonLd({
      product: product({
        description: { en: "", ar: "" },
        image: { url: "", alt: { en: "", ar: "" } },
      }),
      locale: "en",
      url: `${siteConfig.url}/en/products/m1-pro`,
    });

    expect(jsonLd).not.toHaveProperty("description");
    expect(jsonLd).not.toHaveProperty("image");
    expect(jsonLd).not.toHaveProperty("category");
  });

  it("uses the requested locale", () => {
    const jsonLd = buildProductJsonLd({
      product: product(),
      locale: "ar",
      url: `${siteConfig.url}/ar/products/m1-pro`,
      categoryName: "طابعات",
    });

    expect(jsonLd.name).toBe("إم 1 برو");
    expect(jsonLd.description).toBe("طابعة احترافية.");
    expect(jsonLd.category).toBe("طابعات");
  });
});

describe("serializeJsonLd", () => {
  it("escapes HTML-significant characters so values cannot close the script tag", () => {
    const serialized = serializeJsonLd({
      name: "</script><script>alert('x')</script>",
      note: "a & b",
    });

    expect(serialized).not.toContain("</script>");
    expect(serialized).not.toContain("<script>");
    expect(serialized).toContain("\\u003c/script\\u003e");
    expect(serialized).toContain("\\u0026");
    expect(JSON.parse(serialized)).toEqual({
      name: "</script><script>alert('x')</script>",
      note: "a & b",
    });
  });
});
