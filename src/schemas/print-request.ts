import { z } from "zod";

import { adminPrintRequestStatuses } from "@/domain/print-request";
import {
  fileExtension,
  isPrintRequestExtension,
  MAX_PRINT_REQUEST_FILE_BYTES,
  MAX_PRINT_REQUEST_FILES,
  MAX_PRINT_REQUEST_TOTAL_BYTES,
} from "@/lib/print-requests/files";

import type { ValidationTranslator } from "./shared";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** Reasonable international phone check; the submitted text is preserved. */
export function isValidPhoneNumber(value: string): boolean {
  const trimmed = value.trim();
  if (!/^\+?[0-9][0-9\s().-]{5,23}$/.test(trimmed)) return false;

  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function createFileMetadataSchema(t: ValidationTranslator) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t("printRequestFileType"))
      .max(255, t("printRequestFileType"))
      .refine((value) => {
        const extension = fileExtension(value);
        return Boolean(extension) && isPrintRequestExtension(extension);
      }, t("printRequestFileType")),
    size: z
      .number()
      .int()
      .positive(t("printRequestFileEmpty"))
      .max(MAX_PRINT_REQUEST_FILE_BYTES, t("printRequestFileSize")),
    type: z.string().max(255),
  });
}

export function createPrintRequestFormSchema(t: ValidationTranslator) {
  return z.object({
    customerName: z
      .string()
      .trim()
      .min(1, t("printRequestNameRequired"))
      .min(2, t("printRequestNameMin"))
      .max(120, t("printRequestNameMax")),
    phone: z
      .string()
      .trim()
      .min(1, t("printRequestPhoneRequired"))
      .refine(isValidPhoneNumber, t("printRequestPhone")),
    details: z
      .string()
      .trim()
      .min(1, t("printRequestDetailsRequired"))
      .min(5, t("printRequestDetailsMin"))
      .max(10000, t("printRequestDetailsMax")),
  });
}

export type PrintRequestFieldsValues = z.infer<
  ReturnType<typeof createPrintRequestFormSchema>
>;

export function createPrintRequestSchema(t: ValidationTranslator) {
  return z
    .object({
      customerName: z
        .string()
        .trim()
        .min(1, t("printRequestNameRequired"))
        .min(2, t("printRequestNameMin"))
        .max(120, t("printRequestNameMax")),
      phone: z
        .string()
        .trim()
        .min(1, t("printRequestPhoneRequired"))
        .refine(isValidPhoneNumber, t("printRequestPhone")),
      details: z
        .string()
        .trim()
        .min(1, t("printRequestDetailsRequired"))
        .min(5, t("printRequestDetailsMin"))
        .max(10000, t("printRequestDetailsMax")),
      locale: z.enum(["en", "ar"]),
      submissionId: z.string().regex(UUID_PATTERN, t("printRequestSubmissionId")),
      turnstileToken: z.string().max(4096).optional().default(""),
      website: z.string().max(200).optional().default(""),
      files: z
        .array(createFileMetadataSchema(t))
        .max(MAX_PRINT_REQUEST_FILES, t("printRequestFilesMax")),
    })
    .superRefine((values, context) => {
      const total = values.files.reduce((sum, file) => sum + file.size, 0);
      if (total > MAX_PRINT_REQUEST_TOTAL_BYTES) {
        context.addIssue({
          code: "custom",
          path: ["files"],
          message: t("printRequestTotalSize"),
        });
      }
    });
}

export type PrintRequestFormValues = z.infer<
  ReturnType<typeof createPrintRequestSchema>
>;

export function createPrintRequestStatusSchema() {
  return z.enum(adminPrintRequestStatuses);
}

export function createAdminNotesSchema(t: ValidationTranslator) {
  return z.object({
    adminNotes: z.string().max(5000, t("printRequestNotesMax")),
  });
}
