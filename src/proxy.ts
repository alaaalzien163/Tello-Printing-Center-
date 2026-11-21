import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { PRODUCTION_SITE_URL } from "@/config/site-url";
import { routing } from "@/i18n/routing";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

const intlMiddleware = createMiddleware(routing);
const ADMIN_PATH = /^\/(?:en|ar)\/admin(?:\/|$)/;
const CANONICAL_HOST = new URL(PRODUCTION_SITE_URL).host.toLowerCase();

function requestHost(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-host");
  const raw = forwarded ?? request.headers.get("host") ?? "";
  // `x-forwarded-host` can contain a comma-separated proxy chain.
  return raw.split(",")[0]!.trim().split(":")[0]!.toLowerCase();
}

/**
 * Vercel Preview deployments are noindex by default, but a custom domain or a
 * proxy can serve the app from a non-canonical host without that header. Set
 * it at request time so Preview/staging hosts cannot be indexed, while the
 * eventual canonical Production host is left indexable.
 */
function withNoindexForNonCanonicalHost(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  if (requestHost(request) !== CANONICAL_HOST) {
    response.headers.set("X-Robots-Tag", "noindex");
  }
  return response;
}

export async function proxy(request: NextRequest) {
  // Admin routes are always locale-prefixed; they only need the Supabase
  // session refresh, not locale negotiation.
  if (ADMIN_PATH.test(request.nextUrl.pathname)) {
    return withNoindexForNonCanonicalHost(
      request,
      await updateSupabaseSession(request),
    );
  }

  // The default locale is Arabic. Make the root redirect permanent so search
  // engines and browsers do not have to follow a temporary redirect chain.
  if (request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}`;
    return withNoindexForNonCanonicalHost(
      request,
      NextResponse.redirect(url, 308),
    );
  }

  // Redirect unprefixed public URLs to the default locale and keep `/en` and
  // `/ar` in sync with next-intl routing.
  return withNoindexForNonCanonicalHost(request, intlMiddleware(request));
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
