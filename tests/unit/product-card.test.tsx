import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { ProductCard } from "@/components/public/product-card";
import { seedProducts } from "@/data/seed/products";

import arMessages from "../../messages/ar.json";
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
  ProductMedia: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test double
    <img src={src} alt={alt} />
  ),
}));

const product = seedProducts[0]!;

describe("ProductCard", () => {
  it("renders the product name, SKU, price and detail links", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ProductCard product={product} categoryName="3D Printers" locale="en" />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("heading", { name: product.name.en })).toBeInTheDocument();
    expect(screen.getByText(product.sku)).toHaveAttribute("dir", "ltr");
    expect(screen.getByText(/\$14,500/)).toBeInTheDocument();
    expect(screen.getByText("3D Printers")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /View details/ })[0]).toHaveAttribute(
      "href",
      `/products/${product.slug}`,
    );
  });

  it("renders Arabic content and the unconfigured WhatsApp state", () => {
    render(
      <NextIntlClientProvider locale="ar" messages={arMessages}>
        <ProductCard product={product} categoryName="طابعات ثلاثية الأبعاد" locale="ar" />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("heading", { name: product.name.ar })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `${arMessages.whatsapp.unavailable} — ${product.name.ar}` }),
    ).toBeInTheDocument();

    const links = screen.getAllByRole("link");
    expect(links.some((link) => link.getAttribute("href")?.includes("wa.me"))).toBe(false);
  });
});
