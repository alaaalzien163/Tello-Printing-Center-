export const STORAGE_BUCKET = "catalog-images";
export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const IMAGE_ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(",");

export type ImageKind = "product" | "variant";
export type ImageValidationCode = "TYPE" | "SIZE" | "EXTENSION" | "CONTENT";

export class ImageValidationError extends Error {
  readonly code: ImageValidationCode;

  constructor(code: ImageValidationCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ImageValidationError";
    this.code = code;
  }
}

const EXTENSIONS_BY_TYPE: Record<(typeof ACCEPTED_IMAGE_TYPES)[number], string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FILE_NAME_PATTERN = /^[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function extensionForImage(fileName: string, mimeType: string): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(mimeType as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return null;
  }

  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const allowed = EXTENSIONS_BY_TYPE[mimeType as (typeof ACCEPTED_IMAGE_TYPES)[number]];
  return allowed.includes(extension) ? extension : null;
}

async function readBytes(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") {
    return blob.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

async function hasValidSignature(file: File, mimeType: string): Promise<boolean> {
  const bytes = new Uint8Array(await readBytes(file.slice(0, 12)));

  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (mimeType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return signature.every((byte, index) => bytes[index] === byte);
  }

  if (mimeType === "image/webp") {
    const riff = String.fromCharCode(...bytes.slice(0, 4));
    const webp = String.fromCharCode(...bytes.slice(8, 12));
    return riff === "RIFF" && webp === "WEBP";
  }

  return false;
}

/**
 * Validates the declared MIME type, the filename extension, the 10 MB limit and
 * the file signature. Returns the normalized extension for the generated path.
 */
export async function validateImageFile(file: File): Promise<{ extension: string }> {
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new ImageValidationError("SIZE", "Image is larger than 10 MB.");
  }

  if (
    !ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])
  ) {
    throw new ImageValidationError("TYPE", "Only JPEG, PNG and WebP images are accepted.");
  }

  const extension = extensionForImage(file.name, file.type);
  if (!extension) {
    throw new ImageValidationError(
      "EXTENSION",
      "The file extension does not match the image type.",
    );
  }

  if (!(await hasValidSignature(file, file.type))) {
    throw new ImageValidationError("CONTENT", "The file is not a valid image.");
  }

  return { extension };
}

export function buildImagePath(
  kind: ImageKind,
  recordId: string,
  extension: string,
  uniqueId: string = globalThis.crypto.randomUUID(),
): string {
  if (!isUuid(recordId)) {
    throw new ImageValidationError("CONTENT", "The record identifier is invalid.");
  }

  const safeExtension = extension.toLowerCase();
  if (!["jpg", "jpeg", "png", "webp"].includes(safeExtension)) {
    throw new ImageValidationError("EXTENSION", "Unsupported image extension.");
  }

  if (!isUuid(uniqueId)) {
    throw new ImageValidationError("CONTENT", "The generated file name is invalid.");
  }

  return `${kind === "product" ? "products" : "variants"}/${recordId}/${uniqueId}.${safeExtension}`;
}

/** Guards against user-supplied storage paths reaching an update or delete. */
export function isImagePathFor(kind: ImageKind, recordId: string, path: string): boolean {
  const prefix = kind === "product" ? "products" : "variants";
  const [folder, id, fileName, ...rest] = path.split("/");
  return (
    rest.length === 0 &&
    folder === prefix &&
    id === recordId &&
    FILE_NAME_PATTERN.test(fileName ?? "")
  );
}

export function publicStorageUrl(path: string | null): string | null {
  const cleanPath = path?.trim().replace(/^\/+/, "") ?? "";
  if (!cleanPath) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  if (!url) return null;

  const encoded = cleanPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${url}/storage/v1/object/public/${STORAGE_BUCKET}/${encoded}`;
}
