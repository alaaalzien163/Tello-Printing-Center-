import type { Currency, LocalizedImage, LocalizedText } from "./common";

export interface Product {
  id: string;
  sku: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  categoryId: string;
  price: number;
  currency: Currency;
  image: LocalizedImage;
  active: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Values accepted by the repository when creating or replacing a product. */
export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt">;
