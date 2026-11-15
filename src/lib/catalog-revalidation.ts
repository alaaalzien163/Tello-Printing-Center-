import { revalidatePath, revalidateTag } from "next/cache";

/** Shared by the cached public catalog reader and admin mutations. */
export const PUBLIC_CATALOG_TAG = "public-catalog";

/**
 * Marks the public catalog data stale and re-renders the localized public
 * routes. Admin mutations call this after a successful database write.
 */
export function revalidatePublicCatalog(): void {
  revalidateTag(PUBLIC_CATALOG_TAG, "max");
  revalidatePath("/[locale]", "layout");
}
