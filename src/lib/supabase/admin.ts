import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "./config";

let cached: { url: string; key: string; client: SupabaseClient } | null = null;

const CONFIG_SCOPE = "[supabase] privileged client unavailable";

function reportConfigurationIssue(reason: string, details: string[]): void {
  // Only surface configuration problems during development. Production
  // responses stay generic so deployment details are never leaked.
  if (process.env.NODE_ENV === "production") return;

  console.error(CONFIG_SCOPE, { reason, details });
}

/**
 * Server-only privileged client for print request intake and private storage.
 *
 * Uses `SUPABASE_SECRET_KEY`, which must never be exposed to the browser or
 * prefixed with `NEXT_PUBLIC_`. Import this module only from server routes,
 * server actions and server components.
 */
export function getPrivilegedSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!url || !publishableKey || !secret) {
    const missing: string[] = [];
    if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!publishableKey) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    if (!secret) missing.push("SUPABASE_SECRET_KEY");
    reportConfigurationIssue("missing-environment-variable", missing);
    return null;
  }

  const config = getSupabaseConfig();
  if (!config) {
    reportConfigurationIssue("invalid-supabase-url", ["NEXT_PUBLIC_SUPABASE_URL"]);
    return null;
  }

  if (secret === publishableKey || secret.startsWith("sb_publishable_")) {
    reportConfigurationIssue("publishable-key-used-as-secret", [
      "SUPABASE_SECRET_KEY must be a server secret key (sb_secret_... or legacy service_role), not the publishable key.",
    ]);
    return null;
  }

  if (cached?.url === config.url && cached.key === secret) return cached.client;

  const client = createClient(config.url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  cached = { url: config.url, key: secret, client };
  return client;
}

export function isPrivilegedSupabaseConfigured(): boolean {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  return Boolean(
    getSupabaseConfig() &&
      secret &&
      secret !== publishableKey &&
      !secret.startsWith("sb_publishable_"),
  );
}
