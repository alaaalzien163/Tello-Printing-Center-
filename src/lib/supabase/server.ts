import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getSupabaseConfig } from "./config";
import { serverSessionCookieOptions } from "./cookies";

/**
 * Request-scoped server client. Never share the returned client between
 * requests. Cookies are written in Server Actions and Route Handlers; in
 * Server Components writes are skipped because the proxy refreshes sessions.
 */
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.publishableKey, {
    cookieOptions: serverSessionCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes the session and writes the updated cookies.
        }
      },
    },
  });
}
