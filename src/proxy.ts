import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";

import { routing } from "@/i18n/routing";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

const intlMiddleware = createMiddleware(routing);
const ADMIN_PATH = /^\/(?:en|ar)\/admin(?:\/|$)/;

export async function proxy(request: NextRequest) {
  // Admin routes are always locale-prefixed; they only need the Supabase
  // session refresh, not locale negotiation.
  if (ADMIN_PATH.test(request.nextUrl.pathname)) {
    return updateSupabaseSession(request);
  }

  // Redirect unprefixed public URLs (including `/`) to the default locale and
  // keep `/en` and `/ar` in sync with next-intl routing.
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
