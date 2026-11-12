import type { ActivityEntry } from "@/domain/activity";
import type { Category, CategoryInput } from "@/domain/category";
import type { Product, ProductInput } from "@/domain/product";
import type { UserProfile, UserProfileInput } from "@/domain/profile";

export interface ListOptions {
  includeInactive?: boolean;
}

export type RepositoryErrorCode =
  | "NOT_FOUND"
  | "SLUG_TAKEN"
  | "SKU_TAKEN"
  | "CATEGORY_NOT_FOUND"
  | "CATEGORY_HAS_PRODUCTS"
  | "STORAGE_ERROR"
  | "INVALID_INPUT";

export class RepositoryError extends Error {
  readonly code: RepositoryErrorCode;

  constructor(code: RepositoryErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RepositoryError";
    this.code = code;
  }
}

export interface CategoryRepository {
  list(options?: ListOptions): Promise<Category[]>;
  getById(id: string): Promise<Category | null>;
  getBySlug(slug: string): Promise<Category | null>;
  create(input: CategoryInput): Promise<Category>;
  update(id: string, input: CategoryInput): Promise<Category>;
  delete(id: string): Promise<void>;
  setActive(id: string, active: boolean): Promise<Category>;
}

export interface ProductRepository {
  list(options?: ListOptions): Promise<Product[]>;
  getById(id: string): Promise<Product | null>;
  getBySlug(slug: string): Promise<Product | null>;
  create(input: ProductInput): Promise<Product>;
  update(id: string, input: ProductInput): Promise<Product>;
  delete(id: string): Promise<void>;
  setActive(id: string, active: boolean): Promise<Product>;
  setFeatured(id: string, featured: boolean): Promise<Product>;
}

export interface ActivityRepository {
  list(limit?: number): Promise<ActivityEntry[]>;
}

export interface ProfileRepository {
  get(): Promise<UserProfile>;
  update(input: Partial<UserProfileInput>): Promise<UserProfile>;
}

export interface DemoRepository {
  reset(): Promise<void>;
}

/**
 * The UI depends only on these interfaces. Phase 2 supplies Supabase-backed
 * implementations (with server-side access control and RLS) while keeping
 * the components and validation layer unchanged.
 */
export interface Repositories {
  categories: CategoryRepository;
  products: ProductRepository;
  activity: ActivityRepository;
  profile: ProfileRepository;
  demo: DemoRepository;
}
