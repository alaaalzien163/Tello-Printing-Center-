import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildImagePath,
  extensionForImage,
  ImageValidationError,
  isImagePathFor,
  MAX_IMAGE_UPLOAD_BYTES,
  publicStorageUrl,
  STORAGE_BUCKET,
  validateImageFile,
} from "@/lib/storage/image-upload";

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const VARIANT_ID = "22222222-2222-4222-8222-222222222222";
const FILE_ID = "33333333-3333-4333-8333-333333333333";

function pngFile(name = "photo.png", type = "image/png"): File {
  const bytes = new Uint8Array(16);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return new File([bytes], name, { type });
}

async function expectValidationCode(file: File, code: ImageValidationError["code"]) {
  await expect(validateImageFile(file)).rejects.toMatchObject({
    name: "ImageValidationError",
    code,
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("image storage validation", () => {
  it("accepts a valid PNG and returns its extension", async () => {
    await expect(validateImageFile(pngFile())).resolves.toEqual({ extension: "png" });
  });

  it("rejects unsupported MIME types", async () => {
    await expectValidationCode(pngFile("photo.gif", "image/gif"), "TYPE");
  });

  it("rejects a filename extension that does not match the MIME type", async () => {
    await expectValidationCode(pngFile("photo.png", "image/jpeg"), "EXTENSION");
  });

  it("rejects files larger than 10 MB before reading them", async () => {
    const file = pngFile();
    Object.defineProperty(file, "size", { value: MAX_IMAGE_UPLOAD_BYTES + 1 });
    await expectValidationCode(file, "SIZE");
  });

  it("rejects files whose signature is not a supported image", async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4])], "photo.webp", {
      type: "image/webp",
    });
    await expectValidationCode(file, "CONTENT");
  });

  it("maps accepted MIME types to safe extensions", () => {
    expect(extensionForImage("photo.jpeg", "image/jpeg")).toBe("jpeg");
    expect(extensionForImage("photo.jpg", "image/jpeg")).toBe("jpg");
    expect(extensionForImage("photo.webp", "image/webp")).toBe("webp");
    expect(extensionForImage("photo.svg", "image/png")).toBeNull();
    expect(extensionForImage("photo.png", "text/plain")).toBeNull();
  });
});

describe("storage paths", () => {
  it("builds product and variant paths from a UUID and generated file name", () => {
    expect(buildImagePath("product", PRODUCT_ID, "png", FILE_ID)).toBe(
      `products/${PRODUCT_ID}/${FILE_ID}.png`,
    );
    expect(buildImagePath("variant", VARIANT_ID, "webp", FILE_ID)).toBe(
      `variants/${VARIANT_ID}/${FILE_ID}.webp`,
    );
  });

  it("rejects non-UUID record identifiers and unsafe extensions", () => {
    expect(() => buildImagePath("product", "../../etc", "png", FILE_ID)).toThrow(
      ImageValidationError,
    );
    expect(() => buildImagePath("product", PRODUCT_ID, "../png", FILE_ID)).toThrow(
      ImageValidationError,
    );
  });

  it("only accepts paths generated for the same record and kind", () => {
    expect(
      isImagePathFor("product", PRODUCT_ID, `products/${PRODUCT_ID}/${FILE_ID}.jpg`),
    ).toBe(true);
    expect(
      isImagePathFor("variant", VARIANT_ID, `variants/${VARIANT_ID}/${FILE_ID}.png`),
    ).toBe(true);
    expect(
      isImagePathFor("product", PRODUCT_ID, `variants/${PRODUCT_ID}/${FILE_ID}.png`),
    ).toBe(false);
    expect(
      isImagePathFor("product", PRODUCT_ID, `products/${VARIANT_ID}/${FILE_ID}.png`),
    ).toBe(false);
    expect(
      isImagePathFor("product", PRODUCT_ID, `products/${PRODUCT_ID}/../secret.png`),
    ).toBe(false);
    expect(
      isImagePathFor("product", PRODUCT_ID, `products/${PRODUCT_ID}/${FILE_ID}.gif`),
    ).toBe(false);
  });

  it("builds an encoded public URL for the catalog bucket", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co/");

    expect(publicStorageUrl(`products/${PRODUCT_ID}/${FILE_ID}.png`)).toBe(
      `https://example.supabase.co/storage/v1/object/public/${STORAGE_BUCKET}/products/${PRODUCT_ID}/${FILE_ID}.png`,
    );
    expect(publicStorageUrl(` variants/${VARIANT_ID}/${FILE_ID}.png `)).toBe(
      `https://example.supabase.co/storage/v1/object/public/${STORAGE_BUCKET}/variants/${VARIANT_ID}/${FILE_ID}.png`,
    );
    expect(publicStorageUrl(null)).toBeNull();
    expect(publicStorageUrl("   ")).toBeNull();
  });
});
