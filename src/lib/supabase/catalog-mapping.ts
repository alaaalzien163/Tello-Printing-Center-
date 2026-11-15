import type {
  AdminProduct,
  AdminProductVariant,
} from "@/domain/admin-catalog";
import type { Category } from "@/domain/category";
import { currencies, type Currency } from "@/domain/common";
import type { Product, ProductVariant } from "@/domain/product";
import { publicStorageUrl } from "@/lib/storage/image-upload";
import { sortProductsForDisplay } from "@/services/catalog";

export interface CategoryRow {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  is_active: boolean;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProductRow {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  category_id: string;
  base_price: number | string;
  currency_code: string;
  image_path: string | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number | null;
  brand: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
}

export interface VariantRow {
  id: string;
  product_id: string;
  size_label_en: string;
  size_label_ar: string;
  price: number | string;
  sku: string;
  image_path: string | null;
  is_active: boolean;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

const CATEGORY_COLUMNS =
  "id,slug,name_en,name_ar,description_en,description_ar,is_active,sort_order,created_at,updated_at";
const PRODUCT_COLUMNS =
  "id,slug,name_en,name_ar,description_en,description_ar,category_id,base_price,currency_code,image_path,is_active,is_featured,sort_order,brand,model,created_at,updated_at";
const VARIANT_COLUMNS =
  "id,product_id,size_label_en,size_label_ar,price,sku,image_path,is_active,sort_order,created_at,updated_at";

export { CATEGORY_COLUMNS, PRODUCT_COLUMNS, VARIANT_COLUMNS };

function localized(en: string | null, ar: string | null) {
  return { en: en ?? "", ar: ar ?? en ?? "" };
}

export function mapVariantRow(row: VariantRow): AdminProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    sizeLabel: { en: row.size_label_en, ar: row.size_label_ar },
    price: Number(row.price),
    sku: row.sku,
    imagePath: row.image_path,
    imageUrl: publicStorageUrl(row.image_path),
    active: row.is_active,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProductRow(row: ProductRow, variants: VariantRow[]): AdminProduct {
  const name = { en: row.name_en, ar: row.name_ar };
  const mappedVariants = [...variants]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(mapVariantRow);

  return {
    id: row.id,
    sku: mappedVariants[0]?.sku ?? "",
    slug: row.slug,
    name,
    description: localized(row.description_en, row.description_ar),
    categoryId: row.category_id,
    ...(row.brand ? { brand: { en: row.brand, ar: row.brand } } : {}),
    ...(row.model ? { model: row.model } : {}),
    price: Number(row.base_price),
    currency: row.currency_code as Currency,
    image: {
      url: publicStorageUrl(row.image_path) ?? "",
      alt: name,
    },
    imagePath: row.image_path,
    variants: mappedVariants,
    active: row.is_active,
    featured: row.is_featured,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCategoryRow(row: CategoryRow): Category {
  const name = { en: row.name_en, ar: row.name_ar };

  return {
    id: row.id,
    slug: row.slug,
    name,
    description: localized(row.description_en, row.description_ar),
    active: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface PublicCatalogSnapshot {
  categories: Category[];
  products: Product[];
  variantsByProduct: Record<string, ProductVariant[]>;
}

function isEmpty(value: string | null | undefined): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

function isSupportedCurrency(value: string): value is Currency {
  return currencies.includes(value as Currency);
}

function isValidPublicCategory(row: CategoryRow): boolean {
  return (
    row.is_active &&
    !isEmpty(row.id) &&
    !isEmpty(row.slug) &&
    !isEmpty(row.name_en) &&
    !isEmpty(row.name_ar)
  );
}

function isValidPublicProduct(row: ProductRow): boolean {
  const price = Number(row.base_price);

  return (
    row.is_active &&
    !isEmpty(row.id) &&
    !isEmpty(row.slug) &&
    !isEmpty(row.category_id) &&
    !isEmpty(row.name_en) &&
    !isEmpty(row.name_ar) &&
    isSupportedCurrency(row.currency_code) &&
    Number.isFinite(price) &&
    price >= 0
  );
}

function isValidPublicVariant(row: VariantRow): boolean {
  const price = Number(row.price);

  return (
    row.is_active &&
    !isEmpty(row.id) &&
    !isEmpty(row.product_id) &&
    !isEmpty(row.size_label_en) &&
    !isEmpty(row.size_label_ar) &&
    Number.isFinite(price) &&
    price >= 0
  );
}

export function mapPublicVariantRow(
  row: VariantRow,
  currency: Currency,
): ProductVariant {
  const sizeLabel = { en: row.size_label_en, ar: row.size_label_ar };

  return {
    id: row.id,
    productId: row.product_id,
    sizeLabel,
    price: Number(row.price),
    currency,
    sku: row.sku,
    image: { url: publicStorageUrl(row.image_path) ?? "", alt: sizeLabel },
    active: row.is_active,
    sortOrder: row.sort_order ?? 0,
  };
}

export function mapPublicProductRow(
  row: ProductRow,
  variants: ProductVariant[],
): Product {
  const name = { en: row.name_en, ar: row.name_ar };

  return {
    id: row.id,
    // The products table has no SKU column; the first published variant owns
    // the product-level SKU shown in cards and structured data.
    sku: variants[0]?.sku ?? "",
    slug: row.slug,
    name,
    description: localized(row.description_en, row.description_ar),
    categoryId: row.category_id,
    ...(row.brand ? { brand: { en: row.brand, ar: row.brand } } : {}),
    ...(row.model ? { model: row.model } : {}),
    price: Number(row.base_price),
    currency: row.currency_code as Currency,
    image: {
      url: publicStorageUrl(row.image_path) ?? "",
      alt: name,
    },
    active: row.is_active,
    featured: row.is_featured,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Filters raw catalog rows down to what anonymous visitors may see, then maps
 * them to the stable public shapes. Inactive categories hide their products,
 * and products with missing or invalid required data are dropped.
 */
export function buildPublicCatalog(
  categoryRows: CategoryRow[],
  productRows: ProductRow[],
  variantRows: VariantRow[],
): PublicCatalogSnapshot {
  const visibleCategories = new Map<string, CategoryRow>();

  for (const row of categoryRows) {
    if (isValidPublicCategory(row)) visibleCategories.set(row.id, row);
  }

  const visibleProducts = new Map<string, ProductRow>();

  for (const row of productRows) {
    if (!isValidPublicProduct(row)) continue;
    if (!visibleCategories.has(row.category_id)) continue;
    visibleProducts.set(row.id, row);
  }

  const variantsByProduct: Record<string, ProductVariant[]> = {};

  for (const row of variantRows) {
    const product = visibleProducts.get(row.product_id);
    if (!product || !isValidPublicVariant(row)) continue;

    const list = variantsByProduct[row.product_id] ?? [];
    list.push(mapPublicVariantRow(row, product.currency_code as Currency));
    variantsByProduct[row.product_id] = list;
  }

  for (const list of Object.values(variantsByProduct)) {
    list.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const categories = [...visibleCategories.values()]
    .sort((a, b) => {
      const order = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      return order !== 0 ? order : a.name_en.localeCompare(b.name_en);
    })
    .map(mapCategoryRow);

  const products = sortProductsForDisplay(
    [...visibleProducts.values()].map((row) =>
      mapPublicProductRow(row, variantsByProduct[row.id] ?? []),
    ),
  );

  return { categories, products, variantsByProduct };
}
