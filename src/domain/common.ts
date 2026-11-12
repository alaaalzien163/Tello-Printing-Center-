/** Text that has a separate value for each supported locale. */
export interface LocalizedText {
  en: string;
  ar: string;
}

export const currencies = ["USD", "SAR", "AED", "EUR"] as const;
export type Currency = (typeof currencies)[number];

export interface LocalizedImage {
  url: string;
  alt: LocalizedText;
}

export type ThemePreference = "light" | "dark" | "system";
