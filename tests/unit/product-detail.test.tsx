import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProductDetail } from "@/components/public/product-detail";
import type { Product, ProductVariant } from "@/domain/product";

import enMessages from "../../messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/shared/product-media", () => ({
  ProductMedia: ({
    src,
    alt,
    fallbackSrc,
  }: {
    src: string;
    alt: string;
    fallbackSrc?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test double
    <img src={src} alt={alt} data-fallback-src={fallbackSrc} />
  ),
}));

const productImage = "https://cdn.example.test/products/p-1.png";

const product: Product = {
  id: "prd-1",
  sku: "SKU-BASE",
  slug: "p-1",
  name: { en: "Test Product", ar: "منتج اختبار" },
  description: { en: "A product used in tests.", ar: "منتج يستخدم في الاختبارات." },
  categoryId: "cat-1",
  price: 100,
  currency: "USD",
  image: { url: productImage, alt: { en: "Product image", ar: "صورة المنتج" } },
  active: true,
  featured: false,
  createdAt: "2026-11-14T08:00:00.000Z",
  updatedAt: "2026-11-14T08:00:00.000Z",
};

const largeImage = "https://cdn.example.test/variants/large.png";
const smallImage = "https://cdn.example.test/variants/small.png";

const variants: ProductVariant[] = [
  {
    id: "var-large",
    productId: product.id,
    sizeLabel: { en: "P - large", ar: "كبير" },
    price: 150,
    currency: "USD",
    sku: "SKU-LARGE",
    image: { url: largeImage, alt: { en: "Large variant", ar: "الخيار الكبير" } },
    active: true,
    sortOrder: 1,
  },
  {
    id: "var-small",
    productId: product.id,
    sizeLabel: { en: "Small", ar: "صغير" },
    price: 80,
    currency: "USD",
    sku: "SKU-SMALL",
    image: { url: smallImage, alt: { en: "Small variant", ar: "الخيار الصغير" } },
    active: true,
    sortOrder: 2,
  },
  {
    id: "var-no-image",
    productId: product.id,
    sizeLabel: { en: "No image", ar: "بدون صورة" },
    price: 60,
    currency: "USD",
    sku: "SKU-NO-IMAGE",
    image: { url: "", alt: { en: "No image", ar: "بدون صورة" } },
    active: true,
    sortOrder: 3,
  },
];

function renderDetail(items: ProductVariant[] = variants) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <ProductDetail product={product} variants={items} categoryName="Category One" />
    </NextIntlClientProvider>,
  );
}

function mainImage() {
  return within(screen.getByTestId("product-main-image")).getByRole("img");
}

function orderMessage(): string {
  const link = screen.getByRole("link", { name: /Order on WhatsApp/i });
  return new URL(link.getAttribute("href") ?? "").searchParams.get("text") ?? "";
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ProductDetail", () => {
  it("selects the first variant by default and shows its image, price, label and order message", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "+966551234567");
    renderDetail();

    expect(mainImage()).toHaveAttribute("src", largeImage);
    expect(screen.getByTestId("product-price")).toHaveTextContent("$150");
    expect(screen.getByTestId("selected-variant")).toHaveTextContent("P - large");

    const message = orderMessage();
    expect(message).toContain("• Option: P - large");
    expect(message).toContain("SKU-LARGE");
  });

  it("updates image, price, label and order message when another variant is selected", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "+966551234567");
    renderDetail();

    fireEvent.click(screen.getByRole("button", { name: /Small/ }));

    expect(mainImage()).toHaveAttribute("src", smallImage);
    expect(screen.getByTestId("product-price")).toHaveTextContent("$80");
    expect(screen.getByTestId("selected-variant")).toHaveTextContent("Small");

    const message = orderMessage();
    expect(message).toContain("• Option: Small");
    expect(message).not.toContain("• Option: P - large");
    expect(message).toContain("SKU-SMALL");
  });

  it("marks the selected variant as pressed", () => {
    renderDetail();

    const options = screen.getAllByTestId("variant-option");
    expect(options[0]).toHaveAttribute("aria-pressed", "true");
    expect(options[1]).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(options[1]!);

    expect(options[0]).toHaveAttribute("aria-pressed", "false");
    expect(options[1]).toHaveAttribute("aria-pressed", "true");
  });

  it("falls back to the product image when a variant has no image", () => {
    renderDetail();

    fireEvent.click(screen.getByRole("button", { name: /No image/ }));

    expect(mainImage()).toHaveAttribute("src", productImage);
    expect(screen.getByTestId("product-price")).toHaveTextContent("$60");
    expect(screen.getByTestId("selected-variant")).toHaveTextContent("No image");
  });

  it("keeps the product image and price when the product has no variants", () => {
    renderDetail([]);

    expect(mainImage()).toHaveAttribute("src", productImage);
    expect(screen.getByTestId("product-price")).toHaveTextContent("$100");
    expect(screen.queryByTestId("selected-variant")).not.toBeInTheDocument();
  });
});
