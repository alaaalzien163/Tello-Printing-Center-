import type { LocalizedText } from "./common";

/**
 * Categories are intentionally image-free: the catalog presents them with
 * typography only, and no category image column exists in the database.
 */
export interface Category {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Values accepted by the repository when creating or replacing a category. */
export type CategoryInput = Omit<Category, "id" | "createdAt" | "updatedAt">;
