import type { Product } from "@/domain/product";
import type { Locale } from "@/i18n/routing";
import { absoluteUrl } from "@/config/site";
import { pickLocalized } from "@/lib/format";

export interface ProductJsonLdInput {
  product: Product;
  locale: Locale;
  /** Absolute canonical product URL. */
  url: string;
  categoryName?: string;
}

/**
 * Minimal, verifiable Product structured data.
 *
 * The catalog does not currently expose a product-level SKU, a verified brand,
 * or reliable availability/offer data. Emitting those values would make
 * unsupported claims, so only name, description, URL, image and category are
 * included. Add `offers`, `sku` and `brand` only after the client confirms the
 * underlying data.
 */
export function buildProductJsonLd({
  product,
  locale,
  url,
  categoryName,
}: ProductJsonLdInput): Record<string, unknown> {
  const name = pickLocalized(product.name, locale);
  const description = pickLocalized(product.description, locale);
  const image = product.image.url.trim() ? absoluteUrl(product.image.url) : null;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    url,
  };

  if (description) jsonLd.description = description;
  if (image) jsonLd.image = [image];
  if (categoryName) jsonLd.category = categoryName;

  return jsonLd;
}

/**
 * Serialises JSON-LD for a `<script>` element. Escaping the HTML-significant
 * characters prevents a catalog value from closing the script tag early.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
