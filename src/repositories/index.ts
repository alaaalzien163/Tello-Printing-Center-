import type { Repositories } from "./types";
import { createMockRepositories } from "./mock";

export { RepositoryError } from "./types";

/**
 * Single composition point for data access.
 *
 * Phase 2: replace this factory with a Supabase implementation
 * (for example `createSupabaseRepositories(client)`), or choose the
 * implementation from an environment flag. UI components only import
 * `getRepositories` and the repository interfaces.
 */
let repositories: Repositories | null = null;

export function getRepositories(): Repositories {
  repositories ??= createMockRepositories();
  return repositories;
}

export type * from "./types";
