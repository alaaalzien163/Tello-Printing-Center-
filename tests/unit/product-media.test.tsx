import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProductMedia } from "@/components/shared/product-media";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    onError,
  }: {
    src: string;
    alt: string;
    onError?: () => void;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test double for next/image
    <img src={src} alt={alt} data-testid="next-image" onError={onError} />
  ),
}));

const primary = "https://example.supabase.co/storage/v1/object/public/catalog-images/variants/a.png";
const productFallback =
  "https://example.supabase.co/storage/v1/object/public/catalog-images/products/a.png";

describe("ProductMedia", () => {
  it("renders the primary source first", () => {
    render(<ProductMedia src={primary} alt="Large variant" sizes="100px" />);

    expect(screen.getByTestId("next-image")).toHaveAttribute("src", primary);
    expect(screen.getByAltText("Large variant")).toBeInTheDocument();
  });

  it("switches to the fallback source when the primary image fails", () => {
    render(
      <ProductMedia
        src={primary}
        fallbackSrc={productFallback}
        alt="Large variant"
        sizes="100px"
      />,
    );

    fireEvent.error(screen.getByTestId("next-image"));

    expect(screen.getByTestId("next-image")).toHaveAttribute("src", productFallback);
  });

  it("renders the themed placeholder when both sources fail", () => {
    render(
      <ProductMedia
        src={primary}
        fallbackSrc={productFallback}
        alt="Large variant"
        sizes="100px"
      />,
    );

    fireEvent.error(screen.getByTestId("next-image"));
    fireEvent.error(screen.getByTestId("next-image"));

    expect(screen.queryByTestId("next-image")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Large variant" })).toBeInTheDocument();
  });

  it("renders the placeholder when there is no source at all", () => {
    render(<ProductMedia src="" alt="No image" sizes="100px" />);

    expect(screen.getByRole("img", { name: "No image" })).toBeInTheDocument();
  });

  it("renders the placeholder when the only source fails", () => {
    render(<ProductMedia src={primary} alt="Broken image" sizes="100px" />);

    fireEvent.error(screen.getByTestId("next-image"));

    expect(screen.getByRole("img", { name: "Broken image" })).toBeInTheDocument();
  });

  it("does not reuse the primary source as a fallback for itself", () => {
    render(
      <ProductMedia
        src={primary}
        fallbackSrc={primary}
        alt="Same source"
        sizes="100px"
      />,
    );

    fireEvent.error(screen.getByTestId("next-image"));

    expect(screen.getByRole("img", { name: "Same source" })).toBeInTheDocument();
  });
});
