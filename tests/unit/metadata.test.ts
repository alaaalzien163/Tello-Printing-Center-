import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";
import {
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_OG_IMAGE_WIDTH,
  localizedAlternates,
  pageSocialMetadata,
} from "@/lib/metadata";

interface SocialImage {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

function firstImage(metadata: ReturnType<typeof pageSocialMetadata>): SocialImage {
  const images = metadata.openGraph?.images;
  const list = Array.isArray(images) ? images : images ? [images] : [];
  return list[0] as SocialImage;
}

describe("localizedAlternates", () => {
  it("keeps canonical, English, Arabic and x-default URLs aligned", () => {
    expect(localizedAlternates("en", "/products/m1-pro")).toEqual({
      canonical: "/en/products/m1-pro",
      languages: {
        en: "/en/products/m1-pro",
        ar: "/ar/products/m1-pro",
        "x-default": "/ar/products/m1-pro",
      },
    });
    expect(localizedAlternates("ar", "/products/category/printers")).toEqual({
      canonical: "/ar/products/category/printers",
      languages: {
        en: "/en/products/category/printers",
        ar: "/ar/products/category/printers",
        "x-default": "/ar/products/category/printers",
      },
    });
  });
});

describe("pageSocialMetadata", () => {
  it("gives every page its own absolute Open Graph URL", () => {
    const metadata = pageSocialMetadata({
      locale: "en",
      title: "Products",
      description: "Browse products.",
      path: "/products",
      siteName: "Tello Printing Center",
    });

    expect(metadata.openGraph?.url).toBe(`${siteConfig.url}/en/products`);
    expect(metadata.openGraph?.title).toBe("Products");
    expect(metadata.openGraph?.description).toBe("Browse products.");
    expect(metadata.openGraph?.locale).toBe("en_US");
  });

  it("uses the 1200×630 default social card when no page image is supplied", () => {
    const metadata = pageSocialMetadata({
      locale: "ar",
      title: "المنتجات",
      description: "تصفح المنتجات.",
      path: "/products",
      siteName: "مركز تيلو للطباعة",
    });
    const image = firstImage(metadata);

    expect(image.url).toBe(`${siteConfig.url}${DEFAULT_OG_IMAGE_PATH}`);
    expect(image.width).toBe(DEFAULT_OG_IMAGE_WIDTH);
    expect(image.height).toBe(DEFAULT_OG_IMAGE_HEIGHT);
    expect(metadata.openGraph?.locale).toBe("ar_SA");
  });

  it("preserves an absolute product image and prefixes a relative one", () => {
    const absolute = pageSocialMetadata({
      locale: "en",
      title: "M1 Pro",
      description: "A printer.",
      path: "/products/m1-pro",
      siteName: "Tello Printing Center",
      image: { url: "https://cdn.example.test/m1.png", alt: "M1 Pro" },
    });
    expect(firstImage(absolute).url).toBe("https://cdn.example.test/m1.png");

    const relative = pageSocialMetadata({
      locale: "en",
      title: "M1 Pro",
      description: "A printer.",
      path: "/products/m1-pro",
      siteName: "Tello Printing Center",
      image: { url: "/images/product-printer.svg", alt: "M1 Pro" },
    });
    expect(firstImage(relative).url).toBe(
      `${siteConfig.url}/images/product-printer.svg`,
    );
  });

  it("provides matching Twitter card metadata", () => {
    const metadata = pageSocialMetadata({
      locale: "en",
      title: "Contact",
      description: "Contact us.",
      path: "/contact",
      siteName: "Tello Printing Center",
    });

    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Contact",
      description: "Contact us.",
    });
    expect(metadata.twitter?.images).toEqual([
      `${siteConfig.url}${DEFAULT_OG_IMAGE_PATH}`,
    ]);
  });
});
