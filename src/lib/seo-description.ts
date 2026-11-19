import type { LocalizedText } from "@/domain/common";
import type { Locale } from "@/i18n/routing";
import { pickLocalized } from "@/lib/format";

/** Search snippets are usually truncated around 155-160 characters. */
export const META_DESCRIPTION_MAX_LENGTH = 160;

/**
 * Category descriptions shorter than this are treated as missing metadata.
 * The production catalog currently contains values such as "DTF Consumables"
 * and "The best 3D printers", which are not useful search snippets.
 */
export const MIN_CATEGORY_DESCRIPTION_LENGTH = 40;

const WHITESPACE_PATTERN =
  /[\s\u00a0\u1680\u2000-\u200d\u2028\u2029\u202f\u205f\u2060\ufeff]+/g;
const TRAILING_PUNCTUATION_PATTERN = /[\s,.;:!?،؛…\-–—/|]+$/u;
const ARABIC_LETTER_PATTERN = /[\u0621-\u064a\u066e-\u06d3\u06fa-\u06ff]/u;
const LATIN_LETTER_PATTERN = /[A-Za-z]/;

/**
 * Normalizes catalog text for metadata. Newlines, tabs, non-breaking spaces
 * and repeated spaces all collapse into a single regular space.
 */
export function normalizeDescription(value: string | null | undefined): string {
  return (value ?? "").replace(WHITESPACE_PATTERN, " ").trim();
}

/**
 * Truncates at a word boundary and appends an ellipsis. Arabic and English
 * both use spaces between words, so the same logic works for both languages.
 *
 * A single unbroken token (for example a URL) is returned complete rather than
 * publishing a fragment of a word.
 */
export function truncateAtWordBoundary(
  value: string,
  maxLength = META_DESCRIPTION_MAX_LENGTH,
): string {
  const text = normalizeDescription(value);
  if (!text || text.length <= maxLength) return text;

  const ellipsis = "…";
  const budget = Math.max(1, maxLength - ellipsis.length);
  const words = text.split(" ");
  let result = "";

  for (const word of words) {
    const candidate = result ? `${result} ${word}` : word;
    if (candidate.length > budget) break;
    result = candidate;
  }

  if (!result) {
    return words[0] ?? text.slice(0, maxLength);
  }

  const trimmed = result.replace(TRAILING_PUNCTUATION_PATTERN, "").trimEnd();
  return `${trimmed || result}${ellipsis}`;
}

/**
 * Product metadata uses the localized catalog description when available,
 * normalized and cut at a word boundary. The page itself still renders the
 * original, untruncated description.
 */
export function buildProductMetaDescription(
  description: LocalizedText,
  locale: Locale,
  fallback: string,
): string {
  return (
    truncateAtWordBoundary(pickLocalized(description, locale)) ||
    normalizeDescription(fallback)
  );
}

function isUsableCategoryDescription(
  description: string,
  name: string,
  locale: Locale,
): boolean {
  const normalized = normalizeDescription(description);
  if (normalized.length < MIN_CATEGORY_DESCRIPTION_LENGTH) return false;

  const normalizedName = normalizeDescription(name).toLocaleLowerCase(locale);
  if (normalized.toLocaleLowerCase(locale) === normalizedName) return false;

  // Reject an untranslated description on the Arabic page (and vice versa)
  // instead of publishing text in the wrong language.
  if (locale === "ar" && !ARABIC_LETTER_PATTERN.test(normalized)) return false;
  if (locale === "en" && !LATIN_LETTER_PATTERN.test(normalized)) return false;

  return true;
}

export interface CategoryMetaDescriptionInput {
  name: LocalizedText;
  description: LocalizedText;
  locale: Locale;
  fallback: string;
}

/**
 * Category metadata prefers a localized, sufficiently detailed description.
 * Missing, duplicated, too-short or untranslated values fall back to the
 * localized template supplied by the translation catalog.
 */
export function buildCategoryMetaDescription({
  name,
  description,
  locale,
  fallback,
}: CategoryMetaDescriptionInput): string {
  const localized = normalizeDescription(description[locale]);

  if (isUsableCategoryDescription(localized, name[locale], locale)) {
    return truncateAtWordBoundary(localized);
  }

  return (
    truncateAtWordBoundary(fallback) ||
    truncateAtWordBoundary(name[locale])
  );
}
