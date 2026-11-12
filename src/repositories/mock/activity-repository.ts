import { loadDemoState, resetDemoState } from "@/data/demo-store";
import type { ActivityEntry } from "@/domain/activity";

import type { ActivityRepository, DemoRepository } from "../types";
import { toRepositoryError } from "./helpers";

export const mockActivityRepository: ActivityRepository = {
  async list(limit = 10): Promise<ActivityEntry[]> {
    return loadDemoState().activity.slice(0, Math.max(0, limit));
  },
};

export const mockDemoRepository: DemoRepository = {
  async reset(): Promise<void> {
    try {
      resetDemoState();
    } catch (error) {
      toRepositoryError(error);
    }
  },
};
