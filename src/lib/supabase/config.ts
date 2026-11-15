export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

/**
 * Validates and normalizes a Supabase project URL. Only http(s) origins are
 * accepted so a malformed value cannot be reported as a missing variable later.
 */
export function normalizeSupabaseUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return trimmed.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

/**
 * Reads the public Supabase configuration. Only the publishable key is used,
 * so this module is safe to import from client and server code.
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) return null;

  return { url, publishableKey };
}
