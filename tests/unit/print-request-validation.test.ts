import { describe, expect, it } from "vitest";

import {
  createPrintRequestFormSchema,
  createPrintRequestSchema,
  isValidPhoneNumber,
} from "@/schemas/print-request";
import type { ValidationTranslator } from "@/schemas/shared";

const t: ValidationTranslator = (key) => key;
const submissionId = "11111111-1111-4111-8111-111111111111";

const validFields = {
  customerName: "Layla Haddad",
  phone: "+963 944 123 456",
  details: "Please print three copies of the enclosed bracket in PLA.",
};

function parseSubmission(overrides: Record<string, unknown> = {}) {
  return createPrintRequestSchema(t).safeParse({
    ...validFields,
    locale: "en",
    submissionId,
    website: "",
    files: [],
    ...overrides,
  });
}

describe("print request validation", () => {
  it("accepts reasonable international phone numbers and preserves them", () => {
    expect(isValidPhoneNumber("+963 944 123 456")).toBe(true);
    expect(isValidPhoneNumber("00963 11 555 1234")).toBe(true);
    expect(isValidPhoneNumber("+1 (555) 123-4567")).toBe(true);
    expect(isValidPhoneNumber("12345")).toBe(false);
    expect(isValidPhoneNumber("not-a-phone")).toBe(false);
    expect(isValidPhoneNumber("+1234567890123456")).toBe(false);
  });

  it("validates the customer fields", () => {
    const schema = createPrintRequestFormSchema(t);

    expect(schema.safeParse(validFields).success).toBe(true);

    expect(
      schema.safeParse({ ...validFields, customerName: "A" }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...validFields, details: "Hi" }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...validFields, phone: "123" }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...validFields, customerName: "x".repeat(121) }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...validFields, details: "x".repeat(10001) }).success,
    ).toBe(false);
  });

  it("accepts a submission without attachments", () => {
    expect(parseSubmission().success).toBe(true);
  });

  it("ignores a leftover Turnstile token from older clients", () => {
    const result = parseSubmission({ turnstileToken: "stale-token" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("turnstileToken");
    }
  });

  it("accepts supported attachment metadata", () => {
    const result = parseSubmission({
      files: [
        { name: "part.stl", size: 1024, type: "model/stl" },
        { name: "drawing.pdf", size: 2048, type: "application/pdf" },
        { name: "photo.webp", size: 4096, type: "image/webp" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts files larger than the 6 MiB TUS chunk size, up to 50 MiB", () => {
    const chunk = 6 * 1024 * 1024;

    expect(
      parseSubmission({
        files: [{ name: "large.stl", size: chunk * 2 + 1, type: "model/stl" }],
      }).success,
    ).toBe(true);

    expect(
      parseSubmission({
        files: [{ name: "max.stl", size: 50 * 1024 * 1024, type: "model/stl" }],
      }).success,
    ).toBe(true);

    expect(
      parseSubmission({
        files: [{ name: "over.stl", size: 50 * 1024 * 1024 + 1, type: "model/stl" }],
      }).success,
    ).toBe(false);
  });

  it("rejects too many files, unsupported extensions and oversized metadata", () => {
    const files = Array.from({ length: 6 }, (_, index) => ({
      name: `part-${index}.stl`,
      size: 1024,
      type: "model/stl",
    }));
    expect(parseSubmission({ files }).success).toBe(false);

    expect(
      parseSubmission({ files: [{ name: "payload.exe", size: 1024, type: "" }] }).success,
    ).toBe(false);

    expect(
      parseSubmission({
        files: [{ name: "huge.stl", size: 51 * 1024 * 1024, type: "model/stl" }],
      }).success,
    ).toBe(false);

    const oversizedTotal = Array.from({ length: 3 }, (_, index) => ({
      name: `part-${index}.zip`,
      size: 40 * 1024 * 1024,
      type: "application/zip",
    }));
    expect(parseSubmission({ files: oversizedTotal }).success).toBe(false);
  });

  it("requires a valid submission id and locale", () => {
    expect(parseSubmission({ submissionId: "not-a-uuid" }).success).toBe(false);
    expect(parseSubmission({ locale: "fr" }).success).toBe(false);
    expect(parseSubmission({ customerName: "   " }).success).toBe(false);
  });
});
