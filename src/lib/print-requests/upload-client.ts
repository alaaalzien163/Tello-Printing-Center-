"use client";

import * as tus from "tus-js-client";

import { getSupabaseConfig } from "@/lib/supabase/config";
import { PRINT_REQUEST_BUCKET } from "@/lib/print-requests/files";

/**
 * Browser-side direct upload to Supabase Storage.
 *
 * The file never passes through a Next.js route body: the API only returns a
 * short-lived signed upload token and the server-chosen storage path. The
 * publishable key travels in `apikey`; the signed token travels in
 * `x-signature`, which is the current Supabase TUS integration.
 */
export const PRINT_REQUEST_UPLOAD_CHUNK_SIZE = 6 * 1024 * 1024;

const RETRY_DELAYS = [0, 1_000, 3_000, 5_000, 10_000];

export class PrintRequestUploadError extends Error {
  readonly code: "NOT_CONFIGURED" | "UPLOAD_FAILED";

  constructor(code: "NOT_CONFIGURED" | "UPLOAD_FAILED") {
    super(code);
    this.name = "PrintRequestUploadError";
    this.code = code;
  }
}

export interface PrintRequestUploadTarget {
  fileId: string;
  originalName: string;
  path: string;
  token: string;
  signedUrl?: string;
}

interface UploadPrintRequestFileOptions {
  file: File;
  target: PrintRequestUploadTarget;
  onProgress?: (percent: number) => void;
  onUploadUrlAvailable?: () => void;
}

export interface PrintRequestUploadHandle {
  promise: Promise<void>;
  abort: () => Promise<void>;
}

export function uploadPrintRequestFile({
  file,
  target,
  onProgress,
  onUploadUrlAvailable,
}: UploadPrintRequestFileOptions): PrintRequestUploadHandle {
  const config = getSupabaseConfig();

  if (!config) {
    return {
      promise: Promise.reject(new PrintRequestUploadError("NOT_CONFIGURED")),
      abort: async () => undefined,
    };
  }

  const upload = new tus.Upload(file, {
    endpoint: `${config.url}/storage/v1/upload/resumable`,
    headers: {
      apikey: config.publishableKey,
      "x-signature": target.token,
      "x-upsert": "true",
    },
    metadata: {
      bucketName: PRINT_REQUEST_BUCKET,
      objectName: target.path,
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
    },
    chunkSize: PRINT_REQUEST_UPLOAD_CHUNK_SIZE,
    retryDelays: RETRY_DELAYS,
    uploadDataDuringCreation: true,
    // Each attempt is authorized by a fresh server token and a fixed path.
    // Reusing a previous fingerprint across attempts could bypass that flow.
    storeFingerprintForResuming: false,
    removeFingerprintOnSuccess: true,
    onProgress(bytesSent, bytesTotal) {
      if (bytesTotal <= 0) return;
      onProgress?.(Math.min(100, Math.round((bytesSent / bytesTotal) * 100)));
    },
    onUploadUrlAvailable() {
      onUploadUrlAvailable?.();
    },
  });

  const promise = new Promise<void>((resolve, reject) => {
    upload.options.onSuccess = () => {
      onProgress?.(100);
      resolve();
    };
    upload.options.onError = () => {
      reject(new PrintRequestUploadError("UPLOAD_FAILED"));
    };

    upload.start();
  });

  return {
    promise,
    abort: () => upload.abort(true).catch(() => undefined),
  };
}
