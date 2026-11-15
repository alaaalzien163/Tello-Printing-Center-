import { NextResponse } from "next/server";

import { verifyAdminClient } from "@/lib/auth/admin";
import { isUuid } from "@/schemas/print-request";
import { logSupabaseError } from "@/lib/supabase/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PRINT_REQUEST_BUCKET } from "@/lib/print-requests/files";
import { sanitizeOriginalName } from "@/lib/print-requests/files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string; fileId: string }>;
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

/**
 * Auth-checked download bridge. The browser never receives a permanent or
 * public storage URL: an administrator session is verified, the file is
 * resolved from the database, and a 60-second signed URL with an attachment
 * disposition is returned as a redirect.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { id, fileId } = await params;
  if (!isUuid(id) || !isUuid(fileId)) return errorResponse("NOT_FOUND", 404);

  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return errorResponse("UNAUTHORIZED", 401);
  }

  try {
    const access = await verifyAdminClient(supabase);
    if (access.status !== "authorized") return errorResponse("UNAUTHORIZED", 401);
  } catch {
    return errorResponse("UNAUTHORIZED", 401);
  }

  const { data: file, error } = await supabase
    .from("print_request_files")
    .select("request_id,storage_path,original_filename")
    .eq("id", fileId)
    .eq("request_id", id)
    .maybeSingle();

  if (error) {
    logSupabaseError("[print-requests] file download lookup failed", error);
    return errorResponse("UNKNOWN", 500);
  }
  if (!file) return errorResponse("NOT_FOUND", 404);

  const row = file as {
    request_id: string;
    storage_path: string;
    original_filename: string;
  };

  const { data, error: signError } = await supabase.storage
    .from(PRINT_REQUEST_BUCKET)
    .createSignedUrl(row.storage_path, 60, {
      download: sanitizeOriginalName(row.original_filename),
    });

  if (signError || !data?.signedUrl) {
    logSupabaseError("[print-requests] file download signing failed", signError);
    return errorResponse("STORAGE", 502);
  }

  const response = NextResponse.redirect(data.signedUrl, { status: 302 });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
