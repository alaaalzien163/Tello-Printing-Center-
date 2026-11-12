import { createDemoId, loadDemoState, updateDemoState } from "@/data/demo-store";
import type { Product, ProductInput } from "@/domain/product";

import type { ListOptions, ProductRepository } from "../types";
import { RepositoryError } from "../types";
import {
  ensureCategoryExists,
  nowIso,
  pushActivity,
  toRepositoryError,
} from "./helpers";

function normalizeInput(input: ProductInput): ProductInput {
  return {
    ...input,
    sku: input.sku.trim().toUpperCase(),
    slug: input.slug.trim().toLowerCase(),
    name: { en: input.name.en.trim(), ar: input.name.ar.trim() },
    description: { en: input.description.en.trim(), ar: input.description.ar.trim() },
    image: {
      url: input.image.url.trim(),
      alt: { en: input.image.alt.en.trim(), ar: input.image.alt.ar.trim() },
    },
  };
}

function findProduct(state: ReturnType<typeof loadDemoState>, id: string): Product {
  const product = state.products.find((candidate) => candidate.id === id);
  if (!product) {
    throw new RepositoryError("NOT_FOUND", "The product does not exist.");
  }
  return product;
}

function assertUniqueSku(
  state: ReturnType<typeof loadDemoState>,
  sku: string,
  ignoreId?: string,
): void {
  const duplicate = state.products.some(
    (product) => product.id !== ignoreId && product.sku.toLowerCase() === sku.toLowerCase(),
  );
  if (duplicate) {
    throw new RepositoryError("SKU_TAKEN", "This SKU is already in use.");
  }
}

function assertUniqueSlug(
  state: ReturnType<typeof loadDemoState>,
  slug: string,
  ignoreId?: string,
): void {
  const duplicate = state.products.some(
    (product) => product.id !== ignoreId && product.slug.toLowerCase() === slug.toLowerCase(),
  );
  if (duplicate) {
    throw new RepositoryError("SLUG_TAKEN", "This product slug is already in use.");
  }
}

export const mockProductRepository: ProductRepository = {
  async list(options: ListOptions = {}): Promise<Product[]> {
    const products = loadDemoState().products;
    return options.includeInactive === false
      ? products.filter((product) => product.active)
      : [...products];
  },

  async getById(id: string): Promise<Product | null> {
    return loadDemoState().products.find((product) => product.id === id) ?? null;
  },

  async getBySlug(slug: string): Promise<Product | null> {
    return loadDemoState().products.find((product) => product.slug === slug) ?? null;
  },

  async create(input: ProductInput): Promise<Product> {
    try {
      const normalized = normalizeInput(input);

      return updateDemoState((state) => {
        ensureCategoryExists(state, normalized.categoryId);
        assertUniqueSku(state, normalized.sku);
        assertUniqueSlug(state, normalized.slug);

        const timestamp = nowIso();
        const product: Product = {
          ...normalized,
          id: createDemoId("prd"),
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        state.products.unshift(product);
        pushActivity(state, "product.created", product.id, product.name);
        return product;
      });
    } catch (error) {
      toRepositoryError(error);
    }
  },

  async update(id: string, input: ProductInput): Promise<Product> {
    try {
      const normalized = normalizeInput(input);

      return updateDemoState((state) => {
        const product = findProduct(state, id);
        ensureCategoryExists(state, normalized.categoryId);
        assertUniqueSku(state, normalized.sku, id);
        assertUniqueSlug(state, normalized.slug, id);

        Object.assign(product, normalized, { updatedAt: nowIso() });
        pushActivity(state, "product.updated", product.id, product.name);
        return product;
      });
    } catch (error) {
      toRepositoryError(error);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      updateDemoState((state) => {
        const product = findProduct(state, id);
        state.products = state.products.filter((candidate) => candidate.id !== id);
        pushActivity(state, "product.deleted", product.id, product.name);
      });
    } catch (error) {
      toRepositoryError(error);
    }
  },

  async setActive(id: string, active: boolean): Promise<Product> {
    try {
      return updateDemoState((state) => {
        const product = findProduct(state, id);
        if (product.active !== active) {
          product.active = active;
          product.updatedAt = nowIso();
          pushActivity(
            state,
            active ? "product.activated" : "product.deactivated",
            product.id,
            product.name,
          );
        }
        return product;
      });
    } catch (error) {
      toRepositoryError(error);
    }
  },

  async setFeatured(id: string, featured: boolean): Promise<Product> {
    try {
      return updateDemoState((state) => {
        const product = findProduct(state, id);
        if (product.featured !== featured) {
          product.featured = featured;
          product.updatedAt = nowIso();
          pushActivity(
            state,
            featured ? "product.featured" : "product.unfeatured",
            product.id,
            product.name,
          );
        }
        return product;
      });
    } catch (error) {
      toRepositoryError(error);
    }
  },
};
