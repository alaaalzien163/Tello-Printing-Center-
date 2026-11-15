import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "./config";

let cached: { url: string; client: SupabaseClient } | null = null;

/**
 * Anonymous server client for public catalog reads.
 *
 * Public pages must stay request-independent so they can be prerendered and
 * cached. This client never reads cookies or persists a session; RLS policies
 * limit it to published rows.
 */
export function getPublicSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config) return null;

  if (cached?.url === config.url) return cached.client;

  const client = createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  cached = { url: config.url, client };
  return client;
}
