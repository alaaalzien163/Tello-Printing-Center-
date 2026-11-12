import { describe, expect, it } from "vitest";

import {
  createCategorySchema,
  emptyCategoryFormValues,
  categoryFormToInput,
} from "@/schemas/category";
import {
  createContactSchema,
  createLoginSchema,
  createProfileSchema,
} from "@/schemas/contact";
import {
  createProductSchema,
  emptyProductFormValues,
  productFormToInput,
} from "@/schemas/product";
import type { ValidationTranslator } from "@/schemas/shared";

const t: ValidationTranslator = (key) => key;

const validProduct = {
  nameEn: "Tello Forge X2",
  nameAr: "تيلو فورج X2",
  sku: "TEL-FDM-002",
  slug: "forge-x2",
  categoryId: "cat-3d-printers",
  price: 15000,
  currency: "USD" as const,
  descriptionEn: "A reliable production printer for engineering parts.",
  descriptionAr: "طابعة إنتاج موثوقة للقطع الهندسية.",
  imageUrl: "/images/product-printer.svg",
  imageAltEn: "Tello Forge X2 printer",
  imageAltAr: "طابعة تيلو فورج X2",
  active: true,
  featured: false,
};

const validCategory = {
  nameEn: "Printer Parts and Accessories",
  nameAr: "قطع غيار وملحقات الطابعات",
  descriptionEn: "Printer parts, maintenance kits and accessories.",
  descriptionAr: "قطع غيار وأطقم صيانة وملحقات للطابعات.",
  slug: "printer-parts-accessories",
  imageUrl: "/images/consumables.svg",
  imageAltEn: "Printer parts and accessories",
  imageAltAr: "قطع غيار وملحقات طابعات",
  active: true,
};

function firstIssueMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? null : result.error?.issues[0]?.message;
}

describe("product schema", () => {
  it("accepts a valid product input", () => {
    expect(createProductSchema(t).safeParse(validProduct).success).toBe(true);
  });

  it("rejects empty required fields with localized keys", () => {
    const result = createProductSchema(t).safeParse(emptyProductFormValues());
    expect(result.success).toBe(false);
    expect(firstIssueMessage(result)).toBe("productNameRequired");
  });

  it("rejects invalid SKU, slug, price, category and image values", () => {
    const schema = createProductSchema(t);

    expect(firstIssueMessage(schema.safeParse({ ...validProduct, sku: "x" }))).toBe("skuInvalid");
    expect(firstIssueMessage(schema.safeParse({ ...validProduct, slug: "Not A Slug" }))).toBe(
      "slugInvalid",
    );
    expect(firstIssueMessage(schema.safeParse({ ...validProduct, price: 0 }))).toBe("pricePositive");
    expect(firstIssueMessage(schema.safeParse({ ...validProduct, price: 20_000_000 }))).toBe(
      "priceMax",
    );
    expect(firstIssueMessage(schema.safeParse({ ...validProduct, categoryId: "" }))).toBe(
      "categoryRequired",
    );
    expect(firstIssueMessage(schema.safeParse({ ...validProduct, imageUrl: "javascript:alert(1)" }))).toBe(
      "imageUrlInvalid",
    );
  });

  it("requires short descriptions to be at least 10 characters", () => {
    const result = createProductSchema(t).safeParse({ ...validProduct, descriptionEn: "short" });
    expect(firstIssueMessage(result)).toBe("descriptionMin");
  });

  it("maps form values to the repository input shape", () => {
    expect(productFormToInput(validProduct)).toMatchObject({
      name: { en: "Tello Forge X2", ar: "تيلو فورج X2" },
      sku: "TEL-FDM-002",
      image: {
        url: "/images/product-printer.svg",
        alt: { en: "Tello Forge X2 printer", ar: "طابعة تيلو فورج X2" },
      },
    });
  });
});

describe("category schema", () => {
  it("accepts a valid category and rejects missing names", () => {
    const schema = createCategorySchema(t);

    expect(schema.safeParse(validCategory).success).toBe(true);
    expect(firstIssueMessage(schema.safeParse({ ...validCategory, nameEn: "" }))).toBe(
      "categoryNameRequired",
    );
    expect(firstIssueMessage(schema.safeParse({ ...validCategory, slug: "bad slug" }))).toBe(
      "slugInvalid",
    );
    expect(firstIssueMessage(schema.safeParse({ ...validCategory, imageUrl: "" }))).toBe(
      "imageRequired",
    );
  });

  it("starts new categories as active with empty fields", () => {
    expect(emptyCategoryFormValues()).toMatchObject({ active: true, nameEn: "", nameAr: "" });
  });

  it("maps category form values to the repository input shape", () => {
    expect(categoryFormToInput(validCategory)).toMatchObject({
      slug: "printer-parts-accessories",
      name: { en: "Printer Parts and Accessories", ar: "قطع غيار وملحقات الطابعات" },
      active: true,
    });
  });
});

describe("contact, login and profile schemas", () => {
  it("validates contact submissions", () => {
    const schema = createContactSchema(t);
    const valid = {
      name: "Test User",
      email: "user@example.com",
      phone: "+966 55 123 4567",
      message: "I would like to request a quote.",
    };

    expect(schema.safeParse(valid).success).toBe(true);
    expect(firstIssueMessage(schema.safeParse({ ...valid, email: "not-an-email" }))).toBe(
      "emailInvalid",
    );
    expect(firstIssueMessage(schema.safeParse({ ...valid, message: "too short" }))).toBe(
      "messageMin",
    );
    expect(firstIssueMessage(schema.safeParse({ ...valid, phone: "abc" }))).toBe("phoneInvalid");
  });

  it("allows an empty optional phone number", () => {
    const schema = createContactSchema(t);
    const result = schema.safeParse({
      name: "Test User",
      email: "user@example.com",
      phone: "",
      message: "I would like to request a quote.",
    });

    expect(result.success).toBe(true);
  });

  it("requires a valid demo login email and an 8-character password", () => {
    const schema = createLoginSchema(t);

    expect(schema.safeParse({ email: "admin@tello.example", password: "password123" }).success).toBe(
      true,
    );
    expect(firstIssueMessage(schema.safeParse({ email: "bad", password: "password123" }))).toBe(
      "emailInvalid",
    );
    expect(firstIssueMessage(schema.safeParse({ email: "admin@tello.example", password: "short" }))).toBe(
      "passwordMin",
    );
  });

  it("validates profile names", () => {
    const schema = createProfileSchema(t);

    expect(schema.safeParse({ name: "Tello Admin" }).success).toBe(true);
    expect(firstIssueMessage(schema.safeParse({ name: "A" }))).toBe("nameMin");
  });
});
