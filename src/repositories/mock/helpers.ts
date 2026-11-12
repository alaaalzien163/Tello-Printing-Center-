import type { ActivityAction } from "@/domain/activity";
import type { LocalizedText } from "@/domain/common";
import { createDemoId, DemoStorageError, type DemoState } from "@/data/demo-store";

import { RepositoryError } from "../types";

export function nowIso(): string {
  return new Date().toISOString();
}

export function toRepositoryError(error: unknown): never {
  if (error instanceof RepositoryError) throw error;
  if (error instanceof DemoStorageError) {
    throw new RepositoryError("STORAGE_ERROR", "Demo data could not be saved in this browser.", {
      cause: error,
    });
  }
  throw new RepositoryError("INVALID_INPUT", "The catalog operation could not be completed.", {
    cause: error,
  });
}

export function ensureCategoryExists(state: DemoState, categoryId: string): void {
  const exists = state.categories.some((category) => category.id === categoryId);
  if (!exists) {
    throw new RepositoryError("CATEGORY_NOT_FOUND", "The selected category does not exist.");
  }
}

export function buildActivityName(name: LocalizedText): LocalizedText {
  return { en: name.en, ar: name.ar };
}

export function pushActivity(
  state: DemoState,
  action: ActivityAction,
  entityId: string,
  entityName: LocalizedText,
): void {
  state.activity.unshift({
    id: createDemoId("act"),
    action,
    entityId,
    entityName: buildActivityName(entityName),
    createdAt: nowIso(),
  });
  state.activity = state.activity.slice(0, 50);
}
