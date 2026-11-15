import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { PrintRequestFileInput, PrintRequestStatus } from "@/domain/print-request";
import {
  createPrintRequestSchema,
  isUuid,
} from "@/schemas/print-request";
import type { ValidationTranslator } from "@/schemas/shared";
import { getPrivilegedSupabaseClient } from "@/lib/supabase/admin";
import { logSupabaseError } from "@/lib/supabase/errors";

import { inspectFileSignature, signatureSampleSize } from "./file-signatures";
import {
  buildPrintRequestStoragePath,
  fileExtension,
  PRINT_REQUEST_BUCKET,
  sanitizeOriginalName,
  validateFileList,
} from "./files";
import {
  PRINT_REQUEST_RATE_LIMIT,
  PRINT_REQUEST_RATE_WINDOW_SECONDS,
} from "./rate-limit";
import type { TurnstileVerification } from "./turnstile";
import { verifyTurnstileToken } from "./turnstile";

const schemaTranslator: ValidationTranslator = (key) => key;

export const ABANDONED_REQUEST_AGE_MS = 24 * 60 * 60 * 1000;

export type PrintRequestErrorCode =
  | "INVALID_INPUT"
  | "SPAM"
  | "CAPTCHA"
  | "CAPTCHA_NOT_CONFIGURED"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "NOT_CONFIGURED"
  | "NOT_FOUND"
  | "STORAGE"
  | "UPLOAD_INCOMPLETE"
  | "UNKNOWN";

export interface UploadAuthorization {
  fileId: string;
  originalName: string;
  path: string;
  token: string;
  signedUrl: string;
}

export interface InitiateSuccess {
  ok: true;
  requestId: string;
  requestNumber: string;
  status: "pending" | "uploading";
  uploads: UploadAuthorization[];
}

export interface InitiateFailure {
  ok: false;
  code: PrintRequestErrorCode;
  status: number;
  retryAfterSeconds?: number;
  failedFileIds?: string[];
}

export type InitiateResult = InitiateSuccess | InitiateFailure;

export interface InitiateContext {
  clientHash: string;
  clientIp: string;
}

export interface ServiceDependencies {
  supabase?: SupabaseClient | null;
  verifyCaptcha?: (token: string | undefined, ip: string) => Promise<TurnstileVerification>;
  now?: () => Date;
}

interface RequestRow {
  id: string;
  request_number: number | string;
  status: PrintRequestStatus;
}

type FileUploadStatus = "pending" | "uploaded" | "failed";

interface FileRow {
  id: string;
  storage_path: string;
  original_filename: string;
  file_extension: string;
  mime_type: string;
  size_bytes: number;
  upload_status: FileUploadStatus;
}

function failure(
  code: PrintRequestErrorCode,
  status: number,
  extra: Partial<InitiateFailure> = {},
): InitiateFailure {
  return { ok: false, code, status, ...extra };
}

function log(scope: string, error: unknown): void {
  logSupabaseError(`[print-requests] ${scope}`, error);
}

function requestNumberOf(row: RequestRow): string {
  return String(row.request_number);
}

async function signedUploadFor(
  supabase: SupabaseClient,
  path: string,
): Promise<{ token: string; signedUrl: string } | null> {
  const { data, error } = await supabase.storage
    .from(PRINT_REQUEST_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !data?.token) return null;
  return { token: data.token, signedUrl: data.signedUrl ?? "" };
}

type LookupResult =
  | { ok: true; request: RequestRow | null }
  | { ok: false };

async function findRequestByToken(
  supabase: SupabaseClient,
  clientToken: string,
): Promise<LookupResult> {
  const { data, error } = await supabase
    .from("print_requests")
    .select("id,request_number,status")
    .eq("client_token", clientToken)
    .maybeSingle();

  if (error) {
    log("idempotency lookup failed", error);
    // Failing closed keeps the retry guarantee: a transient database error
    // must not turn a repeated submission into a duplicate request.
    return { ok: false };
  }

  return { ok: true, request: (data as RequestRow | null) ?? null };
}

async function resumeRequest(
  supabase: SupabaseClient,
  request: RequestRow,
): Promise<InitiateResult> {
  if (request.status !== "uploading") {
    return {
      ok: true,
      requestId: request.id,
      requestNumber: requestNumberOf(request),
      status: "pending",
      uploads: [],
    };
  }

  const { data, error } = await supabase
    .from("print_request_files")
    .select("id,storage_path,original_filename,file_extension,mime_type,size_bytes,upload_status")
    .eq("request_id", request.id)
    .neq("upload_status", "uploaded")
    .order("created_at", { ascending: true });

  if (error) {
    log("resume file lookup failed", error);
    return failure("STORAGE", 502);
  }

  const uploads: UploadAuthorization[] = [];

  for (const row of (data ?? []) as FileRow[]) {
    const signed = await signedUploadFor(supabase, row.storage_path);
    if (!signed) return failure("STORAGE", 502);

    uploads.push({
      fileId: row.id,
      originalName: row.original_filename,
      path: row.storage_path,
      token: signed.token,
      signedUrl: signed.signedUrl,
    });
  }

  return {
    ok: true,
    requestId: request.id,
    requestNumber: requestNumberOf(request),
    status: "uploading",
    uploads,
  };
}

interface RateLimitRow {
  allowed?: unknown;
  retry_after_seconds?: unknown;
}

function positiveRetrySeconds(value: unknown): number {
  const retry = Number(value);
  return Number.isFinite(retry) && retry > 0
    ? retry
    : PRINT_REQUEST_RATE_WINDOW_SECONDS;
}

export type RateLimitParseResult =
  | { ok: true; allowed: true; retryAfterSeconds: 0 }
  | { ok: true; allowed: false; retryAfterSeconds: number }
  | { ok: false };

/**
 * The RPC must return exactly one row with a boolean `allowed` field.
 *
 * PostgREST returns `returns table (...)` functions as an array of row objects
 * (a single object is also accepted for compatibility). Anything else — an
 * empty array, null data, a legacy bare boolean, or a row without a boolean
 * `allowed` value — is treated as invalid so the caller can fail closed.
 */
export function parseRateLimitResponse(data: unknown): RateLimitParseResult {
  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== "object") return { ok: false };

  const record = row as RateLimitRow;
  if (typeof record.allowed !== "boolean") return { ok: false };

  if (record.allowed) {
    return { ok: true, allowed: true, retryAfterSeconds: 0 };
  }

  return {
    ok: true,
    allowed: false,
    retryAfterSeconds: positiveRetrySeconds(record.retry_after_seconds),
  };
}

type RateLimitOutcome =
  | { status: "allowed" }
  | { status: "denied"; retryAfterSeconds: number }
  | { status: "unavailable" };

async function consumeRateLimit(
  supabase: SupabaseClient,
  clientHash: string,
): Promise<RateLimitOutcome> {
  const { data, error } = await supabase.rpc("consume_print_request_rate_limit", {
    p_ip_hash: clientHash,
    p_max_requests: PRINT_REQUEST_RATE_LIMIT,
    p_window_seconds: PRINT_REQUEST_RATE_WINDOW_SECONDS,
  });

  if (error) {
    // Fail closed in every environment: an infrastructure failure must never
    // let a submission bypass the abuse budget. The caller answers 503 without
    // creating a request or minting upload tokens.
    log("rate limit RPC failed", error);
    return { status: "unavailable" };
  }

  const parsed = parseRateLimitResponse(data);
  if (!parsed.ok) {
    // Log only shape metadata; never log the IP hash or the RPC payload.
    console.warn("[print-requests] rate limit RPC returned an unexpected shape", {
      isArray: Array.isArray(data),
      rowType: Array.isArray(data) ? typeof data[0] : typeof data,
    });
    return { status: "unavailable" };
  }

  return parsed.allowed
    ? { status: "allowed" }
    : { status: "denied", retryAfterSeconds: parsed.retryAfterSeconds };
}

/**
 * Best-effort cleanup for requests that were initiated but never completed.
 * Runs before a new request is created and is intentionally capped.
 */
export async function cleanupAbandonedPrintRequests(
  supabase: SupabaseClient,
  now: Date = new Date(),
): Promise<number> {
  const cutoff = new Date(now.getTime() - ABANDONED_REQUEST_AGE_MS).toISOString();

  const { data, error } = await supabase
    .from("print_requests")
    .select("id")
    .eq("status", "uploading")
    .lt("created_at", cutoff)
    .limit(5);

  if (error) {
    log("abandoned lookup failed", error);
    return 0;
  }

  let removed = 0;
  for (const row of (data ?? []) as Array<{ id: string }>) {
    const ok = await removeRequestObjects(supabase, row.id);
    if (!ok) continue;

    const { error: deleteError } = await supabase
      .from("print_requests")
      .delete()
      .eq("id", row.id);

    if (deleteError) {
      log("abandoned delete failed", deleteError);
      continue;
    }
    removed += 1;
  }

  return removed;
}

/**
 * Removes every object stored under a request. Returns false when storage
 * cleanup fails so the caller can keep the database row (and retry later)
 * instead of creating orphaned objects.
 */
export async function removeRequestObjects(
  supabase: SupabaseClient,
  requestId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("print_request_files")
    .select("storage_path")
    .eq("request_id", requestId);

  if (error) {
    log("file path lookup failed", error);
    return false;
  }

  const paths = ((data ?? []) as Array<{ storage_path: string }>).map(
    (row) => row.storage_path,
  );

  if (paths.length === 0) return true;

  const { error: removeError } = await supabase.storage
    .from(PRINT_REQUEST_BUCKET)
    .remove(paths);

  if (removeError) {
    log("storage remove failed", removeError);
    return false;
  }

  return true;
}

export async function initiatePrintRequest(
  raw: unknown,
  context: InitiateContext,
  dependencies: ServiceDependencies = {},
): Promise<InitiateResult> {
  // An explicit `null` dependency means "no client configured" in tests; only
  // an omitted dependency should fall back to the server-only client.
  const supabase =
    dependencies.supabase !== undefined
      ? dependencies.supabase
      : getPrivilegedSupabaseClient();
  if (!supabase) return failure("NOT_CONFIGURED", 503);

  const parsed = createPrintRequestSchema(schemaTranslator).safeParse(raw);
  if (!parsed.success) return failure("INVALID_INPUT", 400);

  const values = parsed.data;

  if (values.website.trim().length > 0) return failure("SPAM", 400);

  const fileIssue = validateFileList(values.files);
  if (fileIssue) return failure("INVALID_INPUT", 400, { retryAfterSeconds: 0 });

  // Resuming an in-progress request must not consume the abuse budget again.
  const existing = await findRequestByToken(supabase, values.submissionId);
  if (!existing.ok) return failure("SERVICE_UNAVAILABLE", 503);
  if (existing.request) return resumeRequest(supabase, existing.request);

  const verifyCaptcha =
    dependencies.verifyCaptcha ??
    ((token: string | undefined, ip: string) => verifyTurnstileToken(token, ip));

  const captcha = await verifyCaptcha(values.turnstileToken, context.clientIp);
  if (!captcha.ok) {
    return captcha.reason === "not_configured"
      ? failure("CAPTCHA_NOT_CONFIGURED", 503)
      : failure("CAPTCHA", 400);
  }

  const rate = await consumeRateLimit(supabase, context.clientHash);
  if (rate.status === "unavailable") {
    return failure("SERVICE_UNAVAILABLE", 503);
  }
  if (rate.status === "denied") {
    return failure("RATE_LIMITED", 429, {
      retryAfterSeconds: Math.max(rate.retryAfterSeconds, 1),
    });
  }

  try {
    await cleanupAbandonedPrintRequests(supabase, dependencies.now?.() ?? new Date());
  } catch (error) {
    log("abandoned cleanup skipped", error);
  }

  const status: "pending" | "uploading" =
    values.files.length === 0 ? "pending" : "uploading";
  const totalBytes = values.files.reduce((sum, file) => sum + file.size, 0);

  const { data: created, error: createError } = await supabase
    .from("print_requests")
    .insert({
      client_token: values.submissionId,
      customer_name: values.customerName,
      phone: values.phone,
      details: values.details,
      locale: values.locale,
      status,
      client_hash: context.clientHash,
      file_count: values.files.length,
      total_bytes: totalBytes,
    })
    .select("id,request_number,status")
    .single();

  if (createError || !created) {
    if (createError?.code === "23505") {
      const raced = await findRequestByToken(supabase, values.submissionId);
      if (raced.ok && raced.request) return resumeRequest(supabase, raced.request);
    }
    log("request insert failed", createError);
    return failure("UNKNOWN", 500);
  }

  const request = created as RequestRow;
  const uploads: UploadAuthorization[] = [];

  for (const file of values.files as PrintRequestFileInput[]) {
    const extension = fileExtension(file.name);
    const fileId = randomUUID();
    const path = buildPrintRequestStoragePath(request.id, fileId, extension);

    const signed = await signedUploadFor(supabase, path);
    if (!signed) {
      await supabase.from("print_requests").delete().eq("id", request.id);
      return failure("STORAGE", 502);
    }

    const { error: fileError } = await supabase.from("print_request_files").insert({
      id: fileId,
      request_id: request.id,
      storage_path: path,
      original_filename: sanitizeOriginalName(file.name),
      file_extension: extension,
      mime_type: file.type.trim() || "application/octet-stream",
      size_bytes: file.size,
      upload_status: "pending",
    });

    if (fileError) {
      log("file metadata insert failed", fileError);
      await supabase.storage.from(PRINT_REQUEST_BUCKET).remove([path]);
      await supabase.from("print_requests").delete().eq("id", request.id);
      return failure("STORAGE", 502);
    }

    uploads.push({
      fileId,
      originalName: file.name,
      path,
      token: signed.token,
      signedUrl: signed.signedUrl,
    });
  }

  return {
    ok: true,
    requestId: request.id,
    requestNumber: requestNumberOf(request),
    status,
    uploads,
  };
}

interface StorageObject {
  name: string;
  metadata?: { size?: number } | null;
}

/**
 * Reads the first bytes of the stored object so its signature can be checked.
 *
 * Returns `unverified` whenever the sample cannot be read. Completion treats
 * that as a failure: a request may only move to `pending` after a positive
 * validity check, so a storage outage or a host that ignores Range must not
 * let unvalidated content through.
 */
async function readObjectSignature(
  supabase: SupabaseClient,
  path: string,
  extension: string,
): Promise<"ok" | "mismatch" | "unverified"> {
  try {
    const { data, error } = await supabase.storage
      .from(PRINT_REQUEST_BUCKET)
      .createSignedUrl(path, 60);

    if (error || !data?.signedUrl) return "unverified";

    const sample = signatureSampleSize(extension);
    const response = await fetch(data.signedUrl, {
      headers: { range: `bytes=0-${sample - 1}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok && response.status !== 206) return "unverified";

    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (response.status !== 206 && declaredLength > sample * 64) {
      // The storage host ignored the Range header; avoid buffering a large file.
      return "unverified";
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const result = inspectFileSignature(`file.${extension}`, bytes);
    return result === "ok" ? "ok" : "mismatch";
  } catch (error) {
    log("signature check failed", error);
    return "unverified";
  }
}

export type CompleteResult = { ok: true; requestNumber: string } | InitiateFailure;

export interface CompleteInput {
  requestId: string;
  submissionId: string;
}

export async function completePrintRequest(
  raw: unknown,
  dependencies: ServiceDependencies = {},
): Promise<CompleteResult> {
  const supabase =
    dependencies.supabase !== undefined
      ? dependencies.supabase
      : getPrivilegedSupabaseClient();
  if (!supabase) return failure("NOT_CONFIGURED", 503) as CompleteResult;

  const input = raw as Partial<CompleteInput> | null;
  if (
    !input ||
    typeof input.requestId !== "string" ||
    typeof input.submissionId !== "string" ||
    !isUuid(input.requestId) ||
    !isUuid(input.submissionId)
  ) {
    return failure("INVALID_INPUT", 400) as CompleteResult;
  }

  const { data: requestData, error: requestError } = await supabase
    .from("print_requests")
    .select("id,request_number,status")
    .eq("id", input.requestId)
    .eq("client_token", input.submissionId)
    .maybeSingle();

  if (requestError) {
    log("completion lookup failed", requestError);
    return failure("UNKNOWN", 500) as CompleteResult;
  }

  const request = requestData as RequestRow | null;
  if (!request) return failure("NOT_FOUND", 404) as CompleteResult;

  if (request.status !== "uploading") {
    // Idempotent completion: already finalized requests return their number.
    return { ok: true, requestNumber: requestNumberOf(request) };
  }

  const { data: fileData, error: fileError } = await supabase
    .from("print_request_files")
    .select("id,storage_path,original_filename,file_extension,mime_type,size_bytes,upload_status")
    .eq("request_id", request.id)
    .order("created_at", { ascending: true });

  if (fileError) {
    log("completion file lookup failed", fileError);
    return failure("UNKNOWN", 500) as CompleteResult;
  }

  const files = (fileData ?? []) as FileRow[];
  if (files.length === 0) {
    const { error } = await supabase
      .from("print_requests")
      .update({ status: "pending", file_count: 0, total_bytes: 0 })
      .eq("id", request.id)
      .eq("status", "uploading");

    if (error) return failure("UNKNOWN", 500) as CompleteResult;
    return { ok: true, requestNumber: requestNumberOf(request) };
  }

  const { data: objectData, error: listError } = await supabase.storage
    .from(PRINT_REQUEST_BUCKET)
    .list(`requests/${request.id}`, { limit: 100 });

  if (listError) {
    log("storage listing failed", listError);
    return failure("UPLOAD_INCOMPLETE", 409) as CompleteResult;
  }

  const objects = new Map<string, StorageObject>();
  for (const object of (objectData ?? []) as StorageObject[]) {
    objects.set(object.name, object);
  }

  const failed: string[] = [];
  let actualTotal = 0;

  for (const file of files) {
    const name = `${file.id}.${file.file_extension}`;
    const object = objects.get(name);
    const size = Number(object?.metadata?.size ?? 0);

    if (!object || size <= 0 || size !== Number(file.size_bytes)) {
      failed.push(file.id);
      continue;
    }

    const signature = await readObjectSignature(
      supabase,
      file.storage_path,
      file.file_extension,
    );

    // Only a positive signature check counts. A mismatch or an unreadable
    // sample keeps the request in `uploading` so the client can retry instead
    // of exposing unvalidated content to the admin.
    if (signature !== "ok") {
      failed.push(file.id);
      continue;
    }

    actualTotal += size;
  }

  if (failed.length > 0) {
    return {
      ...failure("UPLOAD_INCOMPLETE", 409),
      failedFileIds: failed,
    } as CompleteResult;
  }

  const fileIds = files.map((file) => file.id);
  const { error: markError } = await supabase
    .from("print_request_files")
    .update({ upload_status: "uploaded", uploaded_at: new Date().toISOString() })
    .in("id", fileIds);

  if (markError) {
    log("file completion update failed", markError);
    return failure("UNKNOWN", 500) as CompleteResult;
  }

  const { error: finalizeError } = await supabase
    .from("print_requests")
    .update({
      status: "pending",
      file_count: files.length,
      total_bytes: actualTotal,
    })
    .eq("id", request.id)
    .eq("status", "uploading");

  if (finalizeError) {
    log("request finalize failed", finalizeError);
    return failure("UNKNOWN", 500) as CompleteResult;
  }

  return { ok: true, requestNumber: requestNumberOf(request) };
}
