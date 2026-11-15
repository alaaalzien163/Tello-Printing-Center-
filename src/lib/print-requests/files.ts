/** Attachment policy shared by the browser form and the server endpoints. */

export const MAX_PRINT_REQUEST_FILES = 5;
export const MAX_PRINT_REQUEST_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_PRINT_REQUEST_TOTAL_BYTES = 100 * 1024 * 1024;

export const PRINT_REQUEST_BUCKET = "print-request-files";

export const PRINT_REQUEST_EXTENSIONS = [
  "stl",
  "obj",
  "3mf",
  "step",
  "stp",
  "iges",
  "igs",
  "dxf",
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "zip",
] as const;

export type PrintRequestExtension = (typeof PRINT_REQUEST_EXTENSIONS)[number];

const DECLARED_TYPES: Record<PrintRequestExtension, readonly string[]> = {
  stl: [
    "model/stl",
    "application/sla",
    "application/vnd.ms-pki.stl",
    "application/octet-stream",
    "text/plain",
  ],
  obj: ["model/obj", "text/plain", "application/octet-stream"],
  "3mf": [
    "model/3mf",
    "application/vnd.ms-package.3dmanufacturing-3dmodel+xml",
    "application/zip",
    "application/octet-stream",
  ],
  step: ["application/step", "text/plain", "application/octet-stream"],
  stp: ["application/step", "text/plain", "application/octet-stream"],
  iges: ["model/iges", "application/iges", "text/plain", "application/octet-stream"],
  igs: ["model/iges", "application/iges", "text/plain", "application/octet-stream"],
  dxf: [
    "image/vnd.dxf",
    "application/dxf",
    "application/x-dxf",
    "text/plain",
    "application/octet-stream",
  ],
  pdf: ["application/pdf"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
  zip: ["application/zip", "application/x-zip-compressed", "application/octet-stream"],
};

/** Extensions rejected even though a whitelist already excludes them. */
export const BLOCKED_EXTENSIONS = [
  "exe",
  "dll",
  "bat",
  "cmd",
  "com",
  "msi",
  "scr",
  "ps1",
  "sh",
  "js",
  "mjs",
  "cjs",
  "html",
  "htm",
  "xhtml",
  "svg",
  "php",
] as const;

export const PRINT_REQUEST_ACCEPT_ATTRIBUTE = PRINT_REQUEST_EXTENSIONS.map(
  (extension) => `.${extension}`,
).join(",");

const extensionSet = new Set<string>(PRINT_REQUEST_EXTENSIONS);

export type FileValidationCode =
  | "FILE_COUNT"
  | "FILE_SIZE"
  | "FILE_TOTAL_SIZE"
  | "FILE_TYPE"
  | "FILE_EMPTY"
  | "FILE_NAME";

export interface FileValidationIssue {
  code: FileValidationCode;
  fileName?: string;
}

export function fileExtension(name: string): string {
  const trimmed = name.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0 || dot === trimmed.length - 1) return "";
  return trimmed.slice(dot + 1).toLocaleLowerCase();
}

export function isPrintRequestExtension(value: string): value is PrintRequestExtension {
  return extensionSet.has(value);
}

export function isAllowedDeclaredType(extension: string, declaredType: string): boolean {
  if (!isPrintRequestExtension(extension)) return false;
  const type = declaredType.trim().toLocaleLowerCase();
  if (!type) return true;
  return DECLARED_TYPES[extension].includes(type);
}

/**
 * Keeps a human-readable name for the dashboard while stripping paths,
 * control characters and reserved characters. The storage path never uses it.
 */
export function sanitizeOriginalName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>:"|?*]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "attachment";
  if (cleaned.length <= 180) return cleaned;

  const extension = fileExtension(cleaned);
  const suffix = extension ? `.${extension}` : "";
  return `${cleaned.slice(0, 180 - suffix.length)}${suffix}`;
}

/** `requests/{requestId}/{fileUuid}.{extension}` — never client supplied. */
export function buildPrintRequestStoragePath(
  requestId: string,
  fileId: string,
  extension: string,
): string {
  return `requests/${requestId}/${fileId}.${extension}`;
}

export function isPrintRequestStoragePath(path: string): boolean {
  return /^requests\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]{2,5}$/i.test(path);
}

export interface FileMetadataLike {
  name: string;
  size: number;
  type: string;
}

/** Validates one browser-supplied metadata record. Contents are checked later. */
export function validateFileMetadata(file: FileMetadataLike): FileValidationIssue | null {
  const name = file.name.trim();
  if (!name || name.length > 255) return { code: "FILE_NAME", fileName: name };

  const extension = fileExtension(name);
  if (!extension || !isPrintRequestExtension(extension)) {
    return { code: "FILE_TYPE", fileName: name };
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { code: "FILE_EMPTY", fileName: name };
  }

  if (file.size > MAX_PRINT_REQUEST_FILE_BYTES) {
    return { code: "FILE_SIZE", fileName: name };
  }

  if (!isAllowedDeclaredType(extension, file.type)) {
    return { code: "FILE_TYPE", fileName: name };
  }

  return null;
}

export function validateFileList(files: readonly FileMetadataLike[]): FileValidationIssue | null {
  if (files.length > MAX_PRINT_REQUEST_FILES) {
    return { code: "FILE_COUNT" };
  }

  let total = 0;

  for (const file of files) {
    const issue = validateFileMetadata(file);
    if (issue) return issue;
    total += file.size;
  }

  if (total > MAX_PRINT_REQUEST_TOTAL_BYTES) {
    return { code: "FILE_TOTAL_SIZE" };
  }

  return null;
}
