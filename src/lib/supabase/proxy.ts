import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseConfig } from "./config";

/**
 * Refreshes the Supabase session and writes rotated cookies to the response.
 * Authorization is intentionally not decided here; the admin layout verifies
 * the authenticated user against public.admin_users on the server.
 */
export async function updateSupabaseSession(request: NextRequest): Promise<NextResponse> {
  const config = getSupabaseConfig();
  if (!config) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    await supabase.auth.getClaims();
  } catch {
    // A transient auth outage must not take the admin routes down; the
    // server-side layout check still denies access without verified claims.
  }

  return response;
}
