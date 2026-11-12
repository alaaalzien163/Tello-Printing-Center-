import { createDemoId, loadDemoState, updateDemoState } from "@/data/demo-store";
import type { Category, CategoryInput } from "@/domain/category";

import type { CategoryRepository, ListOptions } from "../types";
import { RepositoryError } from "../types";
import { nowIso, pushActivity, toRepositoryError } from "./helpers";

function normalizeInput(input: CategoryInput): CategoryInput {
  return {
    ...input,
    slug: input.slug.trim().toLowerCase(),
    name: { en: input.name.en.trim(), ar: input.name.ar.trim() },
    description: { en: input.description.en.trim(), ar: input.description.ar.trim() },
    image: {
      url: input.image.url.trim(),
      alt: { en: input.image.alt.en.trim(), ar: input.image.alt.ar.trim() },
    },
  };
}

function findCategory(state: ReturnType<typeof loadDemoState>, id: string): Category {
  const category = state.categories.find((candidate) => candidate.id === id);
  if (!category) {
    throw new RepositoryError("NOT_FOUND", "The category does not exist.");
  }
  return category;
}

function assertUniqueSlug(
  state: ReturnType<typeof loadDemoState>,
  slug: string,
  ignoreId?: string,
): void {
  const duplicate = state.categories.some(
    (category) => category.id !== ignoreId && category.slug.toLowerCase() === slug.toLowerCase(),
  );
  if (duplicate) {
    throw new RepositoryError("SLUG_TAKEN", "This category slug is already in use.");
  }
}

export const mockCategoryRepository: CategoryRepository = {
  async list(options: ListOptions = {}): Promise<Category[]> {
    const categories = loadDemoState().categories;
    return options.includeInactive === false
      ? categories.filter((category) => category.active)
      : [...categories];
  },

  async getById(id: string): Promise<Category | null> {
    return loadDemoState().categories.find((category) => category.id === id) ?? null;
  },

  async getBySlug(slug: string): Promise<Category | null> {
    return loadDemoState().categories.find((category) => category.slug === slug) ?? null;
  },

  async create(input: CategoryInput): Promise<Category> {
    try {
      const normalized = normalizeInput(input);

      return updateDemoState((state) => {
        assertUniqueSlug(state, normalized.slug);

        const timestamp = nowIso();
        const category: Category = {
          ...normalized,
          id: createDemoId("cat"),
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        state.categories.push(category);
        pushActivity(state, "category.created", category.id, category.name);
        return category;
      });
    } catch (error) {
      toRepositoryError(error);
    }
  },

  async update(id: string, input: CategoryInput): Promise<Category> {
    try {
      const normalized = normalizeInput(input);

      return updateDemoState((state) => {
        const category = findCategory(state, id);
        assertUniqueSlug(state, normalized.slug, id);

        Object.assign(category, normalized, { updatedAt: nowIso() });
        pushActivity(state, "category.updated", category.id, category.name);
        return category;
      });
    } catch (error) {
      toRepositoryError(error);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      updateDemoState((state) => {
        const category = findCategory(state, id);
        const productsInCategory = state.products.filter(
          (product) => product.categoryId === category.id,
        );
        if (productsInCategory.length > 0) {
          throw new RepositoryError(
            "CATEGORY_HAS_PRODUCTS",
            "This category still contains products and cannot be deleted.",
          );
        }

        state.categories = state.categories.filter((candidate) => candidate.id !== id);
        pushActivity(state, "category.deleted", category.id, category.name);
      });
    } catch (error) {
      toRepositoryError(error);
    }
  },

  async setActive(id: string, active: boolean): Promise<Category> {
    try {
      return updateDemoState((state) => {
        const category = findCategory(state, id);
        category.active = active;
        category.updatedAt = nowIso();
        pushActivity(state, "category.updated", category.id, category.name);
        return category;
      });
    } catch (error) {
      toRepositoryError(error);
    }
  },
};
