import { describe, expect, it } from "vitest";

import type { LocalizedText } from "@/domain/common";
import {
  buildCategoryMetaDescription,
  buildProductMetaDescription,
  META_DESCRIPTION_MAX_LENGTH,
  MIN_CATEGORY_DESCRIPTION_LENGTH,
  normalizeDescription,
  truncateAtWordBoundary,
} from "@/lib/seo-description";

const englishProductDescription: LocalizedText = {
  en: "  A production-ready printer.\n\nIt has a heated chamber and automatic bed leveling.  ",
  ar: "  طابعة جاهزة للإنتاج.\n\nتتميز بغرفة تسخين ومعايرة تلقائية لسرير الطباعة.  ",
};

const categoryName: LocalizedText = {
  en: "3D Printers",
  ar: "طابعات ثلاثية الأبعاد",
};

const categoryDescription: LocalizedText = {
  en: "Explore 3D printers and materials at Tello Printing Center, including the Artillery M1 Pro printer and PLA, PETG, ABS and TPU filament rolls.",
  ar: "تصفح طابعات ثلاثية الأبعاد وخامات الطباعة ثلاثية الأبعاد لدى مركز تللو للطباعة، بما في ذلك طابعة Artillery M1 Pro ورولات خيوط PLA وPETG وABS وTPU بوزن 1 كغ.",
};

describe("normalizeDescription", () => {
  it("collapses newlines, tabs and repeated spaces", () => {
    expect(normalizeDescription("  Line one\n\n\tLine two   with   spaces  ")).toBe(
      "Line one Line two with spaces",
    );
  });

  it("removes non-breaking, zero-width and BOM whitespace", () => {
    expect(normalizeDescription("A\u00a0\u200b B\u2060 C\ufeff")).toBe("A B C");
  });

  it("returns an empty string for missing or blank values", () => {
    expect(normalizeDescription(undefined)).toBe("");
    expect(normalizeDescription(null)).toBe("");
    expect(normalizeDescription(" \n\t\u00a0 ")).toBe("");
  });
});

describe("truncateAtWordBoundary", () => {
  it("keeps short descriptions unchanged", () => {
    expect(truncateAtWordBoundary("Short product description.")).toBe(
      "Short product description.",
    );
  });

  it("truncates English at a complete word and respects the maximum length", () => {
    const text =
      "A long product description with several words that should be cut cleanly at a word boundary instead of in the middle of a word.";
    const truncated = truncateAtWordBoundary(text, 80);

    expect(truncated.length).toBeLessThanOrEqual(80);
    expect(truncated.endsWith("…")).toBe(true);

    const body = truncated.slice(0, -1);
    expect(text.startsWith(body)).toBe(true);
    expect(text.charAt(body.length)).toBe(" ");
    expect(body.endsWith(" ")).toBe(false);
  });

  it("truncates Arabic at a complete word and respects the maximum length", () => {
    const text =
      "طابعة ثلاثية الأبعاد احترافية مع غرفة تسخين ومعايرة تلقائية لسرير الطباعة وحجم بناء كبير لقطع هندسية قابلة للتكرار.";
    const truncated = truncateAtWordBoundary(text, 70);

    expect(truncated.length).toBeLessThanOrEqual(70);
    expect(truncated.endsWith("…")).toBe(true);
    expect(truncated).toMatch(/[\u0600-\u06ff]/);

    const body = truncated.slice(0, -1);
    expect(text.startsWith(body)).toBe(true);
    expect(text.charAt(body.length)).toBe(" ");
    expect(body.endsWith(" ")).toBe(false);
  });

  it("removes trailing punctuation before adding the ellipsis", () => {
    expect(truncateAtWordBoundary("First, second, third", 15)).toBe(
      "First, second…",
    );
  });

  it("does not split a single unbroken token", () => {
    const token = `https://example.test/${"a".repeat(200)}`;
    expect(truncateAtWordBoundary(token, 40)).toBe(token);
  });
});

describe("buildProductMetaDescription", () => {
  it("uses the English description and removes embedded line breaks", () => {
    expect(
      buildProductMetaDescription(
        englishProductDescription,
        "en",
        "Product details from Tello Printing Center.",
      ),
    ).toBe(
      "A production-ready printer. It has a heated chamber and automatic bed leveling.",
    );
  });

  it("uses the Arabic description with normalized whitespace", () => {
    expect(
      buildProductMetaDescription(
        englishProductDescription,
        "ar",
        "تفاصيل المنتج من مركز تللو للطباعة.",
      ),
    ).toBe(
      "طابعة جاهزة للإنتاج. تتميز بغرفة تسخين ومعايرة تلقائية لسرير الطباعة.",
    );
  });

  it("falls back when both descriptions are empty", () => {
    expect(
      buildProductMetaDescription(
        { en: "", ar: "   " },
        "ar",
        "تفاصيل المنتج من مركز تللو للطباعة.",
      ),
    ).toBe("تفاصيل المنتج من مركز تللو للطباعة.");
  });

  it("falls back to the other locale when the requested description is missing", () => {
    expect(
      buildProductMetaDescription(
        { en: "English-only product description.", ar: "" },
        "ar",
        "تفاصيل المنتج.",
      ),
    ).toBe("English-only product description.");
  });

  it("never mutates the original catalog description", () => {
    const original = { ...englishProductDescription };
    buildProductMetaDescription(englishProductDescription, "en", "Fallback");

    expect(englishProductDescription).toEqual(original);
  });
});

describe("buildCategoryMetaDescription", () => {
  it("uses the valid English category description", () => {
    expect(
      buildCategoryMetaDescription({
        name: categoryName,
        description: categoryDescription,
        locale: "en",
        fallback: "Browse 3D Printers products from Tello Printing Center.",
      }),
    ).toBe(categoryDescription.en);
  });

  it("uses the valid Arabic category description", () => {
    expect(
      buildCategoryMetaDescription({
        name: categoryName,
        description: categoryDescription,
        locale: "ar",
        fallback: "تصفح منتجات طابعات ثلاثية الأبعاد من مركز تللو للطباعة.",
      }),
    ).toBe(categoryDescription.ar);
  });

  it("falls back when the description only repeats the category name", () => {
    const duplicated: LocalizedText = {
      en: "3D Printers",
      ar: "طابعات ثلاثية الأبعاد",
    };
    const fallback = {
      en: "Browse 3D Printers products from Tello Printing Center.",
      ar: "تصفح منتجات طابعات ثلاثية الأبعاد من مركز تللو للطباعة.",
    };

    expect(
      buildCategoryMetaDescription({
        name: categoryName,
        description: duplicated,
        locale: "en",
        fallback: fallback.en,
      }),
    ).toBe(fallback.en);
    expect(
      buildCategoryMetaDescription({
        name: categoryName,
        description: duplicated,
        locale: "ar",
        fallback: fallback.ar,
      }),
    ).toBe(fallback.ar);
  });

  it("rejects descriptions that are shorter than the minimum", () => {
    const short: LocalizedText = {
      en: "DTF Consumables",
      ar: "مستلزمات DTF",
    };

    expect(
      buildCategoryMetaDescription({
        name: { en: "DTF Consumables", ar: "مستلزمات تقنية DTF" },
        description: short,
        locale: "en",
        fallback: "Browse DTF Consumables products from Tello Printing Center.",
      }),
    ).toBe("Browse DTF Consumables products from Tello Printing Center.");
    expect(short.en.length).toBeLessThan(MIN_CATEGORY_DESCRIPTION_LENGTH);
  });

  it("rejects an English-only description on the Arabic page", () => {
    const untranslated: LocalizedText = {
      en: "The best 3D printers and materials for professional workshops.",
      ar: "The best 3D printers and materials for professional workshops.",
    };

    expect(
      buildCategoryMetaDescription({
        name: categoryName,
        description: untranslated,
        locale: "ar",
        fallback: "تصفح منتجات طابعات ثلاثية الأبعاد من مركز تللو للطباعة.",
      }),
    ).toBe("تصفح منتجات طابعات ثلاثية الأبعاد من مركز تللو للطباعة.");
  });

  it("falls back for missing or empty descriptions", () => {
    expect(
      buildCategoryMetaDescription({
        name: categoryName,
        description: { en: "", ar: "   " },
        locale: "en",
        fallback: "Browse 3D Printers products from Tello Printing Center.",
      }),
    ).toBe("Browse 3D Printers products from Tello Printing Center.");
  });

  it("falls back to the localized category name when the template is empty", () => {
    expect(
      buildCategoryMetaDescription({
        name: categoryName,
        description: { en: "", ar: "" },
        locale: "ar",
        fallback: "",
      }),
    ).toBe("طابعات ثلاثية الأبعاد");
  });

  it("truncates a long category description at a word boundary", () => {
    const longDescription: LocalizedText = {
      en: `${categoryDescription.en} ${categoryDescription.en}`,
      ar: `${categoryDescription.ar} ${categoryDescription.ar}`,
    };
    const english = buildCategoryMetaDescription({
      name: categoryName,
      description: longDescription,
      locale: "en",
      fallback: "Fallback",
    });
    const arabic = buildCategoryMetaDescription({
      name: categoryName,
      description: longDescription,
      locale: "ar",
      fallback: "بديل",
    });

    expect(english.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX_LENGTH);
    expect(arabic.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX_LENGTH);
    expect(english.endsWith("…")).toBe(true);
    expect(arabic.endsWith("…")).toBe(true);
  });
});
