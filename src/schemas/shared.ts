import type messages from "../../messages/en.json";

export type ValidationMessageKey = keyof (typeof messages)["validation"];
export type ValidationTranslator = (key: ValidationMessageKey) => string;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SKU_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;

/** Accepts http(s) URLs, root-relative public paths and uploaded image data URLs. */
export function isValidImageSource(value: string): boolean {
  const source = value.trim();
  if (!source) return false;

  if (source.startsWith("/")) {
    return !source.startsWith("//");
  }

  if (source.startsWith("data:image/")) {
    return /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(source);
  }

  try {
    const url = new URL(source);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
