"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "./config";

let browserClient: SupabaseClient | null = null;

/**
 * Request-safe browser client. The singleton avoids creating a new auth
 * listener on every render while still using the Supabase SSR cookie storage.
 */
export function createBrowserSupabaseClient(): SupabaseClient {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  browserClient ??= createBrowserClient(config.url, config.publishableKey);
  return browserClient;
}
