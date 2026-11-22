import { NextResponse } from "next/server";

import { supabaseProjectIdentity } from "@/lib/supabase/project-reference";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Non-sensitive project identity used by the E2E write guard to prove that the
 * server under test targets the same Supabase project as `.env.test.local`.
 *
 * Disabled on Production. Preview, local development and Staging return only a
 * truncated SHA-256 fingerprint, never the URL, keys or reference.
 */
export async function GET() {
  const vercelEnvironment = process.env.VERCEL_ENV?.trim().toLocaleLowerCase();
  const isLocalDevelopment = process.env.NODE_ENV !== "production";

  if (
    vercelEnvironment === "production" ||
    (!isLocalDevelopment && vercelEnvironment !== "preview")
  ) {
    return NextResponse.json(
      { error: "NOT_FOUND" },
      { status: 404, headers: { "cache-control": "no-store" } },
    );
  }

  const identity = supabaseProjectIdentity(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!identity) {
    return NextResponse.json(
      { error: "NOT_CONFIGURED" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  return NextResponse.json(
    { projectFingerprint: identity.fingerprint },
    { headers: { "cache-control": "no-store" } },
  );
}
