import { loadDemoState, updateDemoState } from "@/data/demo-store";
import type { UserProfile, UserProfileInput } from "@/domain/profile";

import type { ProfileRepository } from "../types";
import { toRepositoryError } from "./helpers";

export const mockProfileRepository: ProfileRepository = {
  async get(): Promise<UserProfile> {
    return loadDemoState().profile;
  },

  async update(input: Partial<UserProfileInput>): Promise<UserProfile> {
    try {
      return updateDemoState((state) => {
        state.profile = { ...state.profile, ...input };
        return state.profile;
      });
    } catch (error) {
      toRepositoryError(error);
    }
  },
};
