import type { Currency, LocalizedImage, LocalizedText } from "./common";

export interface Product {
  id: string;
  sku: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  categoryId: string;
  /** Optional merchandising metadata supplied by the catalog source. */
  brand?: LocalizedText;
  model?: string;
  price: number;
  currency: Currency;
  image: LocalizedImage;
  active: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Published product option. Currency is inherited from the parent product
 * because `public.product_variants` does not store one.
 */
export interface ProductVariant {
  id: string;
  productId: string;
  sizeLabel: LocalizedText;
  price: number;
  currency: Currency;
  sku: string;
  image: LocalizedImage;
  active: boolean;
  sortOrder: number;
}

/** Values accepted by the repository when creating or replacing a product. */
export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt">;
