import { describe, expect, it } from "vitest";

import {
  buildPrintRequestStoragePath,
  fileExtension,
  isAllowedDeclaredType,
  isPrintRequestExtension,
  isPrintRequestStoragePath,
  MAX_PRINT_REQUEST_FILE_BYTES,
  MAX_PRINT_REQUEST_FILES,
  MAX_PRINT_REQUEST_TOTAL_BYTES,
  sanitizeOriginalName,
  validateFileList,
  validateFileMetadata,
} from "@/lib/print-requests/files";

const uuidA = "11111111-1111-4111-8111-111111111111";
const uuidB = "22222222-2222-4222-8222-222222222222";

describe("print request attachment policy", () => {
  it("extracts lowercase extensions and recognizes the whitelist", () => {
    expect(fileExtension("Part.STL")).toBe("stl");
    expect(fileExtension("archive.tar")).toBe("tar");
    expect(fileExtension("no-extension")).toBe("");
    expect(isPrintRequestExtension("3mf")).toBe(true);
    expect(isPrintRequestExtension("exe")).toBe(false);
  });

  it("rejects unsupported, executable and markup extensions", () => {
    for (const name of ["setup.exe", "app.js", "page.html", "logo.svg", "script.php"]) {
      const issue = validateFileMetadata({ name, size: 1024, type: "application/octet-stream" });
      expect(issue?.code).toBe("FILE_TYPE");
    }
  });

  it("checks declared content types when the browser supplies one", () => {
    expect(isAllowedDeclaredType("pdf", "application/pdf")).toBe(true);
    expect(isAllowedDeclaredType("pdf", "text/html")).toBe(false);
    expect(isAllowedDeclaredType("png", "image/png")).toBe(true);
    expect(isAllowedDeclaredType("png", "")).toBe(true);
  });

  it("sanitizes display names without letting paths or control characters through", () => {
    expect(sanitizeOriginalName("../../evil<name>.stl")).toBe("evil_name_.stl");
    expect(sanitizeOriginalName("   ")).toBe("attachment");
    expect(sanitizeOriginalName("a".repeat(400) + ".pdf")).toHaveLength(180);
  });

  it("builds and recognizes only server-shaped storage paths", () => {
    const path = buildPrintRequestStoragePath(uuidA, uuidB, "stl");
    expect(path).toBe(`requests/${uuidA}/${uuidB}.stl`);
    expect(isPrintRequestStoragePath(path)).toBe(true);
    expect(isPrintRequestStoragePath(`requests/${uuidA}/..%2Fsecret.stl`)).toBe(false);
    expect(isPrintRequestStoragePath(`public/${uuidA}/${uuidB}.stl`)).toBe(false);
  });

  it("enforces per-file size, count and aggregate limits", () => {
    expect(
      validateFileMetadata({
        name: "model.stl",
        size: MAX_PRINT_REQUEST_FILE_BYTES + 1,
        type: "model/stl",
      })?.code,
    ).toBe("FILE_SIZE");

    expect(
      validateFileMetadata({ name: "empty.pdf", size: 0, type: "application/pdf" })?.code,
    ).toBe("FILE_EMPTY");

    const tooMany = Array.from({ length: MAX_PRINT_REQUEST_FILES + 1 }, (_, index) => ({
      name: `file-${index}.pdf`,
      size: 100,
      type: "application/pdf",
    }));
    expect(validateFileList(tooMany)?.code).toBe("FILE_COUNT");

    const tooLarge = Array.from({ length: 3 }, (_, index) => ({
      name: `file-${index}.zip`,
      size: MAX_PRINT_REQUEST_TOTAL_BYTES / 2,
      type: "application/zip",
    }));
    expect(validateFileList(tooLarge)?.code).toBe("FILE_TOTAL_SIZE");
  });

  it("accepts empty attachment lists and supported files", () => {
    expect(validateFileList([])).toBeNull();
    expect(
      validateFileList([
        { name: "bracket.stl", size: 2048, type: "model/stl" },
        { name: "drawing.dxf", size: 2048, type: "" },
        { name: "preview.webp", size: 2048, type: "image/webp" },
      ]),
    ).toBeNull();
  });
});
