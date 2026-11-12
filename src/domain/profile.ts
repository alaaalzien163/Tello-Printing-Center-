import type { ThemePreference } from "./common";

export type PreferencesLocale = "en" | "ar";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  preferredLocale: PreferencesLocale;
  preferredTheme: ThemePreference;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
}

export type UserProfileInput = Pick<UserProfile, "name">;
