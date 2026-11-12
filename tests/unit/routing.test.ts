import { describe, expect, it } from "vitest";

import { defaultLocale, isLocale, localeDirection, localeNames, locales } from "@/i18n/routing";
import { localizedAlternates } from "@/lib/metadata";

describe("locale configuration", () => {
  it("exposes English and Arabic with English as the default", () => {
    expect(locales).toEqual(["en", "ar"]);
    expect(defaultLocale).toBe("en");
    expect(localeNames.ar).toBe("العربية");
  });

  it("maps locales to the correct text direction", () => {
    expect(localeDirection.en).toBe("ltr");
    expect(localeDirection.ar).toBe("rtl");
  });

  it("recognizes only supported locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

describe("localizedAlternates", () => {
  it("returns canonical and language alternates for a localized path", () => {
    const alternates = localizedAlternates("ar", "/products/forge-x1");

    expect(alternates).toEqual({
      canonical: "/ar/products/forge-x1",
      languages: {
        en: "/en/products/forge-x1",
        ar: "/ar/products/forge-x1",
        "x-default": "/en/products/forge-x1",
      },
    });
  });

  it("does not duplicate the slash for the homepage", () => {
    expect(localizedAlternates("en", "/")?.canonical).toBe("/en");
  });
});
