export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const IMAGE_ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(",");

export class ImageUploadError extends Error {
  readonly code: "TYPE" | "SIZE" | "PROCESSING";

  constructor(code: ImageUploadError["code"], message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ImageUploadError";
    this.code = code;
  }
}

/**
 * Resizes a raster image in the browser and returns a compact data URL for the
 * demo repository. Production uploads should go to Supabase Storage instead.
 */
export async function fileToDemoImageDataUrl(file: File): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    throw new ImageUploadError("TYPE", "Unsupported image type.");
  }
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new ImageUploadError("SIZE", "Image is larger than 5 MB.");
  }

  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 1200;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new ImageUploadError("PROCESSING", "Canvas is unavailable.");

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    return canvas.toDataURL("image/webp", 0.82);
  } catch (error) {
    if (error instanceof ImageUploadError) throw error;
    throw new ImageUploadError("PROCESSING", "The image could not be processed.", {
      cause: error,
    });
  }
}
