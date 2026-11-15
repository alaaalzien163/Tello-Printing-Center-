import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AdminPrintRequestStatus,
  PrintRequestDetail,
  PrintRequestFile,
  PrintRequestFilters,
  PrintRequestListResult,
  PrintRequestStats,
  PrintRequestStatus,
  PrintRequestSummary,
} from "@/domain/print-request";
import {
  isAdminPrintRequestStatus,
  PRINT_REQUEST_PAGE_SIZE,
} from "@/domain/print-request";
import { verifyAdminClient } from "@/lib/auth/admin";
import { isUuid } from "@/schemas/print-request";
import { logSupabaseError } from "@/lib/supabase/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { PRINT_REQUEST_BUCKET } from "./files";

export type AdminRequestsError =
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "STORAGE"
  | "UNKNOWN";

export type AdminRequestsResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AdminRequestsError };

const REQUEST_COLUMNS =
  "id,request_number,customer_name,phone,locale,status,is_read,file_count,total_bytes,created_at,updated_at";

const DETAIL_COLUMNS = `${REQUEST_COLUMNS},details,admin_notes`;

const FILE_COLUMNS =
  "id,request_id,original_filename,file_extension,mime_type,size_bytes,upload_status,created_at";

interface PrintRequestRow {
  id: string;
  request_number: number | string;
  customer_name: string;
  phone: string;
  locale: string;
  status: string;
  is_read: boolean;
  file_count: number;
  total_bytes: number | string;
  created_at: string;
  updated_at: string;
  details?: string;
  admin_notes?: string | null;
}

interface PrintRequestFileRow {
  id: string;
  request_id: string;
  original_filename: string;
  file_extension: string;
  mime_type: string;
  size_bytes: number | string;
  upload_status: string;
  created_at: string;
}

function fail<T>(error: AdminRequestsError): AdminRequestsResult<T> {
  return { ok: false, error };
}

export function mapPrintRequestRow(row: PrintRequestRow): PrintRequestSummary {
  return {
    id: row.id,
    requestNumber: String(row.request_number),
    customerName: row.customer_name,
    phone: row.phone,
    locale: row.locale === "ar" ? "ar" : "en",
    status: row.status as PrintRequestStatus,
    isRead: Boolean(row.is_read),
    fileCount: Number(row.file_count ?? 0),
    totalBytes: Number(row.total_bytes ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPrintRequestFileRow(row: PrintRequestFileRow): PrintRequestFile {
  return {
    id: row.id,
    requestId: row.request_id,
    originalName: row.original_filename,
    extension: row.file_extension,
    contentType: row.mime_type,
    sizeBytes: Number(row.size_bytes ?? 0),
    uploaded: row.upload_status === "uploaded",
    createdAt: row.created_at,
  };
}

async function getAdminClient(): Promise<
  { ok: true; supabase: SupabaseClient } | { ok: false; error: AdminRequestsError }
> {
  let supabase: SupabaseClient;

  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return { ok: false, error: "UNAUTHORIZED" };
  }

  try {
    const access = await verifyAdminClient(supabase);
    if (access.status !== "authorized") return { ok: false, error: "UNAUTHORIZED" };
  } catch {
    return { ok: false, error: "UNAUTHORIZED" };
  }

  return { ok: true, supabase };
}

/** Strips characters that would break PostgREST's `or` filter grammar. */
function sanitizeSearch(value: string): string {
  return value
    .trim()
    .slice(0, 120)
    .replace(/[%_,()\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function listPrintRequestsData(
  filters: PrintRequestFilters = {},
): Promise<AdminRequestsResult<PrintRequestListResult>> {
  const client = await getAdminClient();
  if (!client.ok) return fail(client.error);

  const pageSize = Math.min(
    Math.max(Math.trunc(filters.pageSize ?? PRINT_REQUEST_PAGE_SIZE), 1),
    50,
  );
  const page = Math.max(Math.trunc(filters.page ?? 1), 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client.supabase
    .from("print_requests")
    .select(REQUEST_COLUMNS, { count: "exact" });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const search = sanitizeSearch(filters.query ?? "");
  if (search) {
    const conditions = [`customer_name.ilike.%${search}%`];
    // `request_number` is a bigint in the live schema, so it needs numeric
    // equality rather than the text-only `ilike` operator.
    if (/^\d+$/.test(search)) {
      conditions.push(`request_number.eq.${search}`);
    }
    query = query.or(conditions.join(","));
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: filters.sort === "oldest" })
    .range(from, to);

  if (error) {
    logSupabaseError("[print-requests] list failed", error);
    return fail("UNKNOWN");
  }

  const total = count ?? 0;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return {
    ok: true,
    data: {
      items: ((data ?? []) as PrintRequestRow[]).map(mapPrintRequestRow),
      total,
      page: Math.min(page, totalPages),
      pageSize,
      totalPages,
    },
  };
}

export async function getPrintRequestStatsData(): Promise<
  AdminRequestsResult<PrintRequestStats>
> {
  const client = await getAdminClient();
  if (!client.ok) return fail(client.error);

  const [totalResult, unreadResult, pendingResult] = await Promise.all([
    client.supabase
      .from("print_requests")
      .select("id", { count: "exact", head: true }),
    client.supabase
      .from("print_requests")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false),
    client.supabase
      .from("print_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  if (totalResult.error || unreadResult.error || pendingResult.error) {
    logSupabaseError(
      "[print-requests] stats failed",
      totalResult.error ?? unreadResult.error ?? pendingResult.error,
    );
    return fail("UNKNOWN");
  }

  return {
    ok: true,
    data: {
      total: totalResult.count ?? 0,
      unread: unreadResult.count ?? 0,
      pending: pendingResult.count ?? 0,
    },
  };
}

export async function getUnreadPrintRequestCountData(): Promise<
  AdminRequestsResult<number>
> {
  const client = await getAdminClient();
  if (!client.ok) return fail(client.error);

  const { count, error } = await client.supabase
    .from("print_requests")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) return fail("UNKNOWN");
  return { ok: true, data: count ?? 0 };
}

export async function getPrintRequestDetailData(
  id: string,
): Promise<AdminRequestsResult<PrintRequestDetail>> {
  if (!isUuid(id)) return fail("INVALID_INPUT");

  const client = await getAdminClient();
  if (!client.ok) return fail(client.error);

  const { data, error } = await client.supabase
    .from("print_requests")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logSupabaseError("[print-requests] detail failed", error);
    return fail("UNKNOWN");
  }
  if (!data) return fail("NOT_FOUND");

  const request = data as PrintRequestRow;

  const { data: fileData, error: fileError } = await client.supabase
    .from("print_request_files")
    .select(FILE_COLUMNS)
    .eq("request_id", id)
    .order("created_at", { ascending: true });

  if (fileError) {
    logSupabaseError("[print-requests] file list failed", fileError);
    return fail("UNKNOWN");
  }

  return {
    ok: true,
    data: {
      ...mapPrintRequestRow(request),
      details: request.details ?? "",
      adminNotes: request.admin_notes ?? null,
      files: ((fileData ?? []) as PrintRequestFileRow[]).map(mapPrintRequestFileRow),
    },
  };
}

export async function markPrintRequestReadData(
  id: string,
): Promise<AdminRequestsResult<true>> {
  if (!isUuid(id)) return fail("INVALID_INPUT");

  const client = await getAdminClient();
  if (!client.ok) return fail(client.error);

  const { error } = await client.supabase
    .from("print_requests")
    .update({ is_read: true })
    .eq("id", id);

  if (error) return fail("UNKNOWN");
  return { ok: true, data: true };
}

export async function updatePrintRequestStatusData(
  id: string,
  status: AdminPrintRequestStatus,
): Promise<AdminRequestsResult<true>> {
  if (!isUuid(id) || !isAdminPrintRequestStatus(status)) {
    return fail("INVALID_INPUT");
  }

  const client = await getAdminClient();
  if (!client.ok) return fail(client.error);

  const { error } = await client.supabase
    .from("print_requests")
    .update({ status })
    .eq("id", id);

  if (error) return fail("UNKNOWN");
  return { ok: true, data: true };
}

export async function updatePrintRequestNotesData(
  id: string,
  notes: string,
): Promise<AdminRequestsResult<true>> {
  if (!isUuid(id)) return fail("INVALID_INPUT");

  const trimmed = notes.trim();
  if (trimmed.length > 5000) return fail("INVALID_INPUT");

  const client = await getAdminClient();
  if (!client.ok) return fail(client.error);

  const { error } = await client.supabase
    .from("print_requests")
    .update({ admin_notes: trimmed || null })
    .eq("id", id);

  if (error) return fail("UNKNOWN");
  return { ok: true, data: true };
}

export async function deletePrintRequestData(
  id: string,
): Promise<AdminRequestsResult<true>> {
  if (!isUuid(id)) return fail("INVALID_INPUT");

  const client = await getAdminClient();
  if (!client.ok) return fail(client.error);

  const { data: fileRows, error: fileError } = await client.supabase
    .from("print_request_files")
    .select("storage_path")
    .eq("request_id", id);

  if (fileError) return fail("UNKNOWN");

  const paths = ((fileRows ?? []) as Array<{ storage_path: string }>).map(
    (row) => row.storage_path,
  );

  if (paths.length > 0) {
    const { error: removeError } = await client.supabase.storage
      .from(PRINT_REQUEST_BUCKET)
      .remove(paths);

    // Keep the database row when files could not be removed so the admin can
    // retry instead of leaving orphaned objects in the private bucket.
    if (removeError) {
      logSupabaseError("[print-requests] storage cleanup failed", removeError);
      return fail("STORAGE");
    }
  }

  const { error: deleteError } = await client.supabase
    .from("print_requests")
    .delete()
    .eq("id", id);

  if (deleteError) return fail("UNKNOWN");
  return { ok: true, data: true };
}
