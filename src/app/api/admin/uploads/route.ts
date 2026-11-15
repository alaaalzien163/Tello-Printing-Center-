import { NextResponse } from "next/server";

import { verifyAdminClient } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  buildImagePath,
  ImageValidationError,
  STORAGE_BUCKET,
  validateImageFile,
  type ImageKind,
} from "@/lib/storage/image-upload";

export const runtime = "nodejs";

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  let supabase;

  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return errorResponse("UNAUTHORIZED", 401);
  }

  let access;
  try {
    access = await verifyAdminClient(supabase);
  } catch {
    return errorResponse("UNAUTHORIZED", 401);
  }
  if (access.status !== "authorized") return errorResponse("UNAUTHORIZED", 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse("INVALID_INPUT", 400);
  }

  const kind = form.get("kind");
  const recordId = form.get("id");
  const file = form.get("file");

  if (
    (kind !== "product" && kind !== "variant") ||
    typeof recordId !== "string" ||
    !(file instanceof File)
  ) {
    return errorResponse("INVALID_INPUT", 400);
  }

  let extension: string;
  try {
    ({ extension } = await validateImageFile(file));
  } catch (error) {
    if (error instanceof ImageValidationError) {
      return errorResponse(error.code, 400);
    }
    return errorResponse("INVALID_INPUT", 400);
  }

  const table = kind === "product" ? "products" : "product_variants";
  const { data: record, error: lookupError } = await supabase
    .from(table)
    .select("id")
    .eq("id", recordId)
    .maybeSingle();

  if (lookupError) return errorResponse("STORAGE", 500);
  if (!record) return errorResponse("NOT_FOUND", 404);

  let path: string;
  try {
    path = buildImagePath(kind as ImageKind, recordId, extension);
  } catch {
    return errorResponse("INVALID_INPUT", 400);
  }

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    console.error(`Catalog upload failed (${uploadError.name ?? "unknown"}).`);
    return errorResponse("STORAGE", 500);
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return NextResponse.json({ path, publicUrl: data.publicUrl });
}
