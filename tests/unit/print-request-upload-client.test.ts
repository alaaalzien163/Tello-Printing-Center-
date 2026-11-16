import { beforeEach, describe, expect, it, vi } from "vitest";

import { PRINT_REQUEST_BUCKET } from "@/lib/print-requests/files";
import {
  PRINT_REQUEST_UPLOAD_ENDPOINT_PATH,
  PrintRequestUploadError,
  uploadPrintRequestFile,
} from "@/lib/print-requests/upload-client";
import { getSupabaseConfig } from "@/lib/supabase/config";

const tusMock = vi.hoisted(() => {
  class FakeUpload {
    static instances: FakeUpload[] = [];

    file: unknown;
    options: Record<string, unknown> & {
      onSuccess?: () => void;
      onError?: (error: unknown) => void;
      onProgress?: (sent: number, total: number) => void;
      onUploadUrlAvailable?: () => void;
    };
    started = false;
    abortCalls: Array<boolean | undefined> = [];

    constructor(file: unknown, options: FakeUpload["options"]) {
      this.file = file;
      this.options = options;
      FakeUpload.instances.push(this);
    }

    start() {
      this.started = true;
    }

    abort(terminate?: boolean) {
      this.abortCalls.push(terminate);
      return Promise.resolve();
    }
  }

  return { FakeUpload };
});

vi.mock("tus-js-client", () => ({ Upload: tusMock.FakeUpload }));
vi.mock("@/lib/supabase/config", () => ({ getSupabaseConfig: vi.fn() }));

const mockedConfig = vi.mocked(getSupabaseConfig);

const projectUrl = "https://project.supabase.co";

function target(overrides: Partial<{ token: string; path: string; fileId: string }> = {}) {
  return {
    fileId: "11111111-1111-4111-8111-111111111111",
    originalName: "bracket.stl",
    path: "requests/req-1/22222222-2222-4222-8222-222222222222.stl",
    token: "signed-token",
    ...overrides,
  };
}

function file(name = "bracket.stl", type = "model/stl", size = 1024) {
  return new File([new Uint8Array(Math.min(size, 16))], name, { type });
}

function lastUpload() {
  return tusMock.FakeUpload.instances.at(-1)!;
}

beforeEach(() => {
  tusMock.FakeUpload.instances = [];
  mockedConfig.mockReturnValue({ url: projectUrl, publishableKey: "sb_publishable_test" });
});

describe("print request upload client", () => {
  it("targets the signed TUS route", () => {
    uploadPrintRequestFile({ file: file(), target: target() });

    expect(PRINT_REQUEST_UPLOAD_ENDPOINT_PATH).toBe("/storage/v1/upload/resumable/sign");
    expect(lastUpload().options.endpoint).toBe(
      `${projectUrl}/storage/v1/upload/resumable/sign`,
    );
  });

  it("sends the signed token in x-signature and no anonymous key", () => {
    uploadPrintRequestFile({ file: file(), target: target({ token: "token-abc" }) });

    expect(lastUpload().options.headers).toEqual({
      "x-signature": "token-abc",
      "x-upsert": "true",
    });

    const headers = lastUpload().options.headers as Record<string, string>;
    expect(headers).not.toHaveProperty("apikey");
    expect(headers).not.toHaveProperty("authorization");
  });

  it("sends the bucket and the server-chosen object path as metadata", () => {
    const path = "requests/req-1/33333333-3333-4333-8333-333333333333.pdf";
    uploadPrintRequestFile({
      file: file("drawing.pdf", "application/pdf"),
      target: target({ path }),
    });

    expect(lastUpload().options.metadata).toEqual({
      bucketName: PRINT_REQUEST_BUCKET,
      objectName: path,
      contentType: "application/pdf",
      cacheControl: "3600",
    });
  });

  it("falls back to a generic content type for an empty file type", () => {
    uploadPrintRequestFile({ file: file("model.stl", ""), target: target() });

    expect(lastUpload().options.metadata).toMatchObject({
      contentType: "application/octet-stream",
    });
  });

  it("uses 6 MiB chunks with data during creation and bounded retries", () => {
    uploadPrintRequestFile({ file: file(), target: target() });

    const options = lastUpload().options;
    expect(options.chunkSize).toBe(6 * 1024 * 1024);
    expect(options.uploadDataDuringCreation).toBe(true);
    expect(options.retryDelays).toEqual([0, 1_000, 3_000, 5_000, 10_000]);
    expect(options.storeFingerprintForResuming).toBe(false);
    expect(options.removeFingerprintOnSuccess).toBe(true);
    expect(lastUpload().started).toBe(true);
  });

  it("creates an independent upload per attachment", () => {
    uploadPrintRequestFile({
      file: file("bracket.stl", "model/stl"),
      target: target({ token: "token-one", path: "requests/req-1/one.stl" }),
    });
    uploadPrintRequestFile({
      file: file("notes.pdf", "application/pdf"),
      target: target({ token: "token-two", path: "requests/req-1/two.pdf" }),
    });

    expect(tusMock.FakeUpload.instances).toHaveLength(2);
    const [first, second] = tusMock.FakeUpload.instances;
    expect((first.options.headers as Record<string, string>)["x-signature"]).toBe("token-one");
    expect((second.options.headers as Record<string, string>)["x-signature"]).toBe("token-two");
    expect(first.options.metadata).toMatchObject({ objectName: "requests/req-1/one.stl" });
    expect(second.options.metadata).toMatchObject({ objectName: "requests/req-1/two.pdf" });
  });

  it("resolves and reports full progress when the upload succeeds", async () => {
    const onProgress = vi.fn();
    const handle = uploadPrintRequestFile({ file: file(), target: target(), onProgress });

    lastUpload().options.onProgress?.(3 * 1024 * 1024, 6 * 1024 * 1024);
    expect(onProgress).toHaveBeenLastCalledWith(50);

    lastUpload().options.onSuccess?.();
    await expect(handle.promise).resolves.toBeUndefined();
    expect(onProgress).toHaveBeenLastCalledWith(100);
  });

  it("clamps progress and ignores a zero total", () => {
    const onProgress = vi.fn();
    uploadPrintRequestFile({ file: file(), target: target(), onProgress });

    lastUpload().options.onProgress?.(0, 0);
    expect(onProgress).not.toHaveBeenCalled();

    lastUpload().options.onProgress?.(12, 10);
    expect(onProgress).toHaveBeenLastCalledWith(100);
  });

  it("rejects with UPLOAD_FAILED when TUS reports an error", async () => {
    const handle = uploadPrintRequestFile({ file: file(), target: target() });

    lastUpload().options.onError?.(new Error("403 new row violates row-level security policy"));

    await expect(handle.promise).rejects.toBeInstanceOf(PrintRequestUploadError);
    await expect(handle.promise).rejects.toMatchObject({ code: "UPLOAD_FAILED" });
  });

  it("refuses to start without a signed token", async () => {
    const handle = uploadPrintRequestFile({ file: file(), target: target({ token: "" }) });

    await expect(handle.promise).rejects.toMatchObject({ code: "UPLOAD_FAILED" });
    expect(tusMock.FakeUpload.instances).toHaveLength(0);
    await expect(handle.abort()).resolves.toBeUndefined();
  });

  it("returns NOT_CONFIGURED when the Supabase URL is missing", async () => {
    mockedConfig.mockReturnValue(null);

    const handle = uploadPrintRequestFile({ file: file(), target: target() });

    await expect(handle.promise).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
    expect(tusMock.FakeUpload.instances).toHaveLength(0);
    await expect(handle.abort()).resolves.toBeUndefined();
  });

  it("terminates the upload when aborted", async () => {
    const handle = uploadPrintRequestFile({ file: file(), target: target() });

    await handle.abort();

    expect(lastUpload().abortCalls).toEqual([true]);
  });

  it("surfaces the upload URL as soon as TUS provides it", () => {
    const onUploadUrlAvailable = vi.fn();
    uploadPrintRequestFile({ file: file(), target: target(), onUploadUrlAvailable });

    lastUpload().options.onUploadUrlAvailable?.();

    expect(onUploadUrlAvailable).toHaveBeenCalledTimes(1);
  });
});
