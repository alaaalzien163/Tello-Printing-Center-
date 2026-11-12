import type { LocalizedImage, LocalizedText } from "./common";

export interface Category {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  image: LocalizedImage;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Values accepted by the repository when creating or replacing a category. */
export type CategoryInput = Omit<Category, "id" | "createdAt" | "updatedAt">;
