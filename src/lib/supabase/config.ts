export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

/**
 * Reads the public Supabase configuration. Only the publishable key is used,
 * so this module is safe to import from client and server code.
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) return null;

  return { url, publishableKey };
}
