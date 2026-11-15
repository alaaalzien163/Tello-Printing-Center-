import { describe, expect, it } from "vitest";

import {
  mapPrintRequestFileRow,
  mapPrintRequestRow,
} from "@/lib/print-requests/admin";

describe("print request admin mapping", () => {
  it("maps database rows to dashboard summaries", () => {
    const summary = mapPrintRequestRow({
      id: "22222222-2222-4222-8222-222222222222",
      request_number: 1007,
      customer_name: "Layla Haddad",
      phone: "+963 944 123 456",
      locale: "ar",
      status: "reviewing",
      is_read: true,
      file_count: 2,
      total_bytes: "2048",
      created_at: "2026-11-14T10:00:00.000Z",
      updated_at: "2026-11-14T11:00:00.000Z",
    });

    expect(summary).toEqual({
      id: "22222222-2222-4222-8222-222222222222",
      requestNumber: "1007",
      customerName: "Layla Haddad",
      phone: "+963 944 123 456",
      locale: "ar",
      status: "reviewing",
      isRead: true,
      fileCount: 2,
      totalBytes: 2048,
      createdAt: "2026-11-14T10:00:00.000Z",
      updatedAt: "2026-11-14T11:00:00.000Z",
    });
  });

  it("defaults unknown locales to English and tolerates numeric strings", () => {
    const summary = mapPrintRequestRow({
      id: "22222222-2222-4222-8222-222222222222",
      request_number: 1008,
      customer_name: "Customer",
      phone: "1234567",
      locale: "fr",
      status: "pending",
      is_read: false,
      file_count: 0,
      total_bytes: null as unknown as number,
      created_at: "2026-11-14T10:00:00.000Z",
      updated_at: "2026-11-14T10:00:00.000Z",
    });

    expect(summary.locale).toBe("en");
    expect(summary.totalBytes).toBe(0);
    expect(summary.isRead).toBe(false);
  });

  it("maps file metadata without exposing storage paths", () => {
    const file = mapPrintRequestFileRow({
      id: "33333333-3333-4333-8333-333333333333",
      request_id: "22222222-2222-4222-8222-222222222222",
      original_filename: "bracket.stl",
      file_extension: "stl",
      mime_type: "model/stl",
      size_bytes: "4096",
      upload_status: "uploaded",
      created_at: "2026-11-14T10:00:00.000Z",
    });

    expect(file).toEqual({
      id: "33333333-3333-4333-8333-333333333333",
      requestId: "22222222-2222-4222-8222-222222222222",
      originalName: "bracket.stl",
      extension: "stl",
      contentType: "model/stl",
      sizeBytes: 4096,
      uploaded: true,
      createdAt: "2026-11-14T10:00:00.000Z",
    });
    expect(file).not.toHaveProperty("storage_path");
    expect(file).not.toHaveProperty("storagePath");
  });

  it("treats non-uploaded file states as pending uploads", () => {
    const file = mapPrintRequestFileRow({
      id: "33333333-3333-4333-8333-333333333333",
      request_id: "22222222-2222-4222-8222-222222222222",
      original_filename: "bracket.stl",
      file_extension: "stl",
      mime_type: "model/stl",
      size_bytes: 4096,
      upload_status: "failed",
      created_at: "2026-11-14T10:00:00.000Z",
    });

    expect(file.uploaded).toBe(false);
  });
});
