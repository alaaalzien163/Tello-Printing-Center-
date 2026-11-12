import type { Repositories } from "../types";
import { mockActivityRepository, mockDemoRepository } from "./activity-repository";
import { mockCategoryRepository } from "./category-repository";
import { mockProductRepository } from "./product-repository";
import { mockProfileRepository } from "./profile-repository";

export function createMockRepositories(): Repositories {
  return {
    categories: mockCategoryRepository,
    products: mockProductRepository,
    activity: mockActivityRepository,
    profile: mockProfileRepository,
    demo: mockDemoRepository,
  };
}
