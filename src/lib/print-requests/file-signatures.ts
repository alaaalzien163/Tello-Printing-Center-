import { fileExtension, isPrintRequestExtension } from "./files";

export type SignatureResult = "ok" | "mismatch" | "unsupported";

const decoder = new TextDecoder("utf-8", { fatal: false });

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((value, index) => bytes[index] === value);
}

function startsWithText(bytes: Uint8Array, text: string): boolean {
  return asciiPrefix(bytes, text.length).toLocaleLowerCase() === text.toLocaleLowerCase();
}

function asciiPrefix(bytes: Uint8Array, length: number): string {
  return String.fromCharCode(...bytes.subarray(0, Math.min(length, bytes.length)));
}

function isMostlyText(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return false;

  let printable = 0;
  for (const byte of bytes) {
    if (byte === 0) return false;
    if (byte === 9 || byte === 10 || byte === 13) {
      printable += 1;
      continue;
    }
    if (byte >= 32) printable += 1;
  }

  return printable / bytes.length >= 0.9;
}

function containsDangerousMarkup(text: string): boolean {
  const lower = text.toLocaleLowerCase();
  return [
    "<!doctype",
    "<html",
    "<head",
    "<script",
    "<svg",
    "<?xml",
    "#!/",
  ].some((needle) => lower.includes(needle));
}

function isExecutable(bytes: Uint8Array): boolean {
  return (
    startsWith(bytes, [0x4d, 0x5a]) || // MZ / PE
    startsWith(bytes, [0x7f, 0x45, 0x4c, 0x46]) || // ELF
    startsWith(bytes, [0xca, 0xfe, 0xba, 0xbe]) || // Mach-O universal
    startsWith(bytes, [0xfe, 0xed, 0xfa, 0xce]) ||
    startsWith(bytes, [0xce, 0xfa, 0xed, 0xfe]) ||
    startsWith(bytes, [0xcf, 0xfa, 0xed, 0xfe]) ||
    startsWithText(bytes, "#!")
  );
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0) |
    ((bytes[offset + 1] ?? 0) << 8) |
    ((bytes[offset + 2] ?? 0) << 16) |
    ((bytes[offset + 3] ?? 0) << 24) >>> 0
  );
}

function isZip(bytes: Uint8Array): boolean {
  return (
    startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) ||
    startsWith(bytes, [0x50, 0x4b, 0x05, 0x06]) ||
    startsWith(bytes, [0x50, 0x4b, 0x07, 0x08])
  );
}

function isStl(bytes: Uint8Array): boolean {
  if (startsWithText(bytes, "solid") && isMostlyText(bytes)) return true;
  if (bytes.length < 84) return false;

  const triangles = readUint32LE(bytes, 80);
  if (triangles <= 0 || triangles > 20_000_000) return false;

  // Binary STL is an 80-byte header plus a 4-byte count plus 50 bytes per face.
  return 84 + triangles * 50 <= bytes.length + 512;
}

function isStep(bytes: Uint8Array): boolean {
  if (!isMostlyText(bytes)) return false;
  const head = decoder.decode(bytes.subarray(0, Math.min(bytes.length, 4096)));
  return head.includes("ISO-10303-21");
}

function isDxf(bytes: Uint8Array): boolean {
  if (!isMostlyText(bytes)) return false;
  const head = decoder.decode(bytes.subarray(0, Math.min(bytes.length, 4096)));
  return /\bSECTION\b/i.test(head) || /\bEOF\b/i.test(head);
}

/**
 * Best-effort content check for the first few KiB of an uploaded object.
 * It complements the extension whitelist and the bucket's private storage.
 */
export function inspectFileSignature(
  fileName: string,
  bytes: Uint8Array,
): SignatureResult {
  const extension = fileExtension(fileName);
  if (!isPrintRequestExtension(extension)) return "unsupported";
  if (bytes.length === 0) return "mismatch";

  if (isExecutable(bytes)) return "mismatch";

  const textHead = decoder.decode(
    bytes.subarray(0, Math.min(bytes.length, 2048)),
  );
  if (containsDangerousMarkup(textHead)) return "mismatch";

  switch (extension) {
    case "pdf":
      return startsWithText(bytes, "%PDF-") ? "ok" : "mismatch";
    case "png":
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        ? "ok"
        : "mismatch";
    case "jpg":
    case "jpeg":
      return startsWith(bytes, [0xff, 0xd8, 0xff]) ? "ok" : "mismatch";
    case "webp":
      return startsWithText(bytes, "RIFF") && asciiPrefix(bytes.subarray(8), 4) === "WEBP"
        ? "ok"
        : "mismatch";
    case "zip":
    case "3mf":
      return isZip(bytes) ? "ok" : "mismatch";
    case "stl":
      return isStl(bytes) ? "ok" : "mismatch";
    case "step":
    case "stp":
      return isStep(bytes) ? "ok" : "mismatch";
    case "dxf":
      return isDxf(bytes) ? "ok" : "mismatch";
    case "obj":
    case "iges":
    case "igs":
      return isMostlyText(bytes) ? "ok" : "mismatch";
    default:
      return "unsupported";
  }
}

/** Number of leading bytes the upload-completion check needs per format. */
export function signatureSampleSize(extension: string): number {
  if (extension === "step" || extension === "stp") return 4096;
  if (extension === "dxf") return 4096;
  if (extension === "stl") return 1024;
  return 512;
}
