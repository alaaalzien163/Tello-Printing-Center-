"use client";

import type { ImageKind } from "@/lib/storage/image-upload";

export interface UploadedCatalogImage {
  path: string;
  publicUrl: string;
}

export class CatalogUploadError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "CatalogUploadError";
    this.code = code;
  }
}

interface UploadCatalogImageOptions {
  file: File;
  kind: ImageKind;
  recordId: string;
  onProgress?: (percent: number) => void;
}

/**
 * Streams the file to the authenticated upload route with XMLHttpRequest so
 * the admin UI can render real byte-level progress. The server derives the
 * storage path and enforces admin access; the client never supplies a path.
 */
export function uploadCatalogImage({
  file,
  kind,
  recordId,
  onProgress,
}: UploadCatalogImageOptions): Promise<UploadedCatalogImage> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append("kind", kind);
    body.append("id", recordId);
    body.append("file", file);

    const request = new XMLHttpRequest();
    request.open("POST", "/api/admin/uploads");
    request.responseType = "json";

    request.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      onProgress?.(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    });

    request.addEventListener("load", () => {
      const response = request.response as
        | { path?: string; publicUrl?: string; error?: string }
        | null;

      if (request.status >= 200 && request.status < 300 && response?.path) {
        onProgress?.(100);
        resolve({
          path: response.path,
          publicUrl: response.publicUrl ?? "",
        });
        return;
      }

      reject(new CatalogUploadError(response?.error ?? "STORAGE"));
    });

    request.addEventListener("error", () => reject(new CatalogUploadError("NETWORK")));
    request.addEventListener("abort", () => reject(new CatalogUploadError("ABORTED")));
    request.send(body);
  });
}
