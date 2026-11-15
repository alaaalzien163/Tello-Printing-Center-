import type { Category } from "./category";
import type { Currency, LocalizedText } from "./common";
import type { Product } from "./product";

/** Administrator-facing product with its variants and storage path. */
export interface AdminProduct extends Product {
  imagePath: string | null;
  variants: AdminProductVariant[];
}

export interface AdminProductVariant {
  id: string;
  productId: string;
  sizeLabel: LocalizedText;
  price: number;
  sku: string;
  imagePath: string | null;
  imageUrl: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCatalog {
  products: AdminProduct[];
  categories: Category[];
}

export interface AdminProductInput {
  name: LocalizedText;
  slug: string;
  categoryId: string;
  price: number;
  currency: Currency;
  description: LocalizedText;
  active: boolean;
  featured: boolean;
}

export interface AdminVariantInput {
  id?: string;
  sizeLabel: LocalizedText;
  price: number;
  sku: string;
  active: boolean;
  sortOrder?: number;
}

export interface AdminCategoryInput {
  name: LocalizedText;
  description: LocalizedText;
  slug: string;
  active: boolean;
}
