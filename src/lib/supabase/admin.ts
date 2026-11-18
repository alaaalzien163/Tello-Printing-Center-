import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "./config";

let cached: { url: string; key: string; client: SupabaseClient } | null = null;

const CONFIG_SCOPE = "[supabase] privileged client unavailable";

/**
 * Reports configuration problems with variable names and reasons only.
 * Values, keys and customer data are never included, so this is safe to log in
 * production where it is needed to diagnose a 503 NOT_CONFIGURED response.
 */
function reportConfigurationIssue(
  reason: string,
  details: string[],
  correlationId?: string,
): void {
  console.error(CONFIG_SCOPE, {
    ...(correlationId ? { correlationId } : {}),
    reason,
    details,
  });
}

/**
 * Server-only privileged client for print request intake and private storage.
 *
 * Uses `SUPABASE_SECRET_KEY`, which must never be exposed to the browser or
 * prefixed with `NEXT_PUBLIC_`. Import this module only from server routes,
 * server actions and server components.
 */
export function getPrivilegedSupabaseClient(
  correlationId?: string,
): SupabaseClient | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const rawPublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!rawUrl || !rawPublishableKey || !secret) {
    const missing: string[] = [];
    if (!rawUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!rawPublishableKey) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    if (!secret) missing.push("SUPABASE_SECRET_KEY");
    reportConfigurationIssue(
      "missing-environment-variable",
      missing,
      correlationId,
    );
    return null;
  }

  const config = getSupabaseConfig();
  if (!config) {
    reportConfigurationIssue(
      "invalid-environment-variable",
      ["NEXT_PUBLIC_SUPABASE_URL"],
      correlationId,
    );
    return null;
  }

  if (secret === config.publishableKey || secret.startsWith("sb_publishable_")) {
    reportConfigurationIssue(
      "publishable-key-used-as-secret",
      [
        "SUPABASE_SECRET_KEY must be a server secret key (sb_secret_... or legacy service_role), not the publishable key.",
      ],
      correlationId,
    );
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
