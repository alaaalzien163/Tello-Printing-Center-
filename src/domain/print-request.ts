/**
 * Print request lifecycle. `uploading` is a transient server state used while
 * attachments are still being written to private storage; it is never shown to
 * customers and cannot be selected manually by administrators.
 */
export const printRequestStatuses = [
  "uploading",
  "pending",
  "reviewing",
  "quoted",
  "approved",
  "completed",
  "rejected",
  "cancelled",
] as const;

export type PrintRequestStatus = (typeof printRequestStatuses)[number];

/** Statuses an administrator may choose in the dashboard. */
export const adminPrintRequestStatuses = [
  "pending",
  "reviewing",
  "quoted",
  "approved",
  "completed",
  "rejected",
  "cancelled",
] as const satisfies readonly PrintRequestStatus[];

export type AdminPrintRequestStatus = (typeof adminPrintRequestStatuses)[number];

export function isPrintRequestStatus(value: unknown): value is PrintRequestStatus {
  return (
    typeof value === "string" &&
    (printRequestStatuses as readonly string[]).includes(value)
  );
}

export function isAdminPrintRequestStatus(
  value: unknown,
): value is AdminPrintRequestStatus {
  return (
    typeof value === "string" &&
    (adminPrintRequestStatuses as readonly string[]).includes(value)
  );
}

export interface PrintRequestFile {
  id: string;
  requestId: string;
  originalName: string;
  extension: string;
  contentType: string;
  sizeBytes: number;
  uploaded: boolean;
  createdAt: string;
}

export interface PrintRequestSummary {
  id: string;
  requestNumber: string;
  customerName: string;
  phone: string;
  locale: "en" | "ar";
  status: PrintRequestStatus;
  isRead: boolean;
  fileCount: number;
  totalBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface PrintRequestDetail extends PrintRequestSummary {
  details: string;
  adminNotes: string | null;
  files: PrintRequestFile[];
}

export type PrintRequestSort = "newest" | "oldest";

export interface PrintRequestFilters {
  status?: PrintRequestStatus | "all";
  query?: string;
  sort?: PrintRequestSort;
  page?: number;
  pageSize?: number;
}

export interface PrintRequestListResult {
  items: PrintRequestSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PrintRequestStats {
  total: number;
  unread: number;
  pending: number;
}

/** File metadata supplied by the browser. Contents are never sent to Next.js. */
export interface PrintRequestFileInput {
  name: string;
  size: number;
  type: string;
}

export const PRINT_REQUEST_PAGE_SIZE = 12;
