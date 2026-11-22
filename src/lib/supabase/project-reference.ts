import { createHash } from "node:crypto";

export interface SupabaseProjectIdentity {
  reference: string;
  fingerprint: string;
}

/**
 * Extracts a Supabase project reference without exposing the full URL.
 * Hosted projects use `<ref>.supabase.co`; a local Supabase instance uses
 * `localhost` / `127.0.0.1`. Custom domains are intentionally unsupported.
 */
export function extractSupabaseProjectReference(
  url: string | undefined,
): string | null {
  if (!url) return null;

  try {
    const hostname = new URL(url).hostname.toLocaleLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1") return "local";

    const match = /^([a-z0-9]{20})\.supabase\.(?:co|in)$/.exec(hostname);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Stable, non-reversible label for logs and test output. */
export function fingerprintProjectReference(reference: string): string {
  return createHash("sha256").update(reference).digest("hex").slice(0, 8);
}

export function supabaseProjectIdentity(
  url: string | undefined,
): SupabaseProjectIdentity | null {
  const reference = extractSupabaseProjectReference(url);
  if (!reference) return null;

  return { reference, fingerprint: fingerprintProjectReference(reference) };
}
