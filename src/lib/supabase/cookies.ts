export interface SessionCookieOptions {
  path: "/";
  sameSite: "lax";
  secure: boolean;
}

interface ServerCookieEnvironment {
  NODE_ENV?: string;
  VERCEL?: string;
  VERCEL_ENV?: string;
  SUPABASE_COOKIE_SECURE?: string;
}

/**
 * Session cookies must be marked `Secure` on every deployed origin. Vercel
 * sets `VERCEL_ENV` for Production and Preview builds; local development keeps
 * working over plain HTTP. `SUPABASE_COOKIE_SECURE=true` is the explicit
 * opt-in for a non-Vercel production deployment.
 *
 * `httpOnly` is intentionally left at the `@supabase/ssr` default (`false`)
 * because the browser client refreshes the session and must read the cookie.
 */
export function serverSessionCookieOptions(
  env: ServerCookieEnvironment = process.env,
): SessionCookieOptions {
  const vercelEnvironment = env.VERCEL_ENV?.trim().toLocaleLowerCase();
  const secure =
    vercelEnvironment === "production" ||
    vercelEnvironment === "preview" ||
    env.SUPABASE_COOKIE_SECURE === "true";

  return { path: "/", sameSite: "lax", secure };
}

/**
 * Browser-side equivalent. The deployed protocol is the only reliable signal
 * available to client code, so HTTPS always receives a `Secure` cookie while
 * `http://localhost` development stays functional.
 */
export function browserSessionCookieOptions(
  protocol: string = typeof window !== "undefined" ? window.location.protocol : "http:",
): SessionCookieOptions {
  const secure = protocol === "https:";

  return { path: "/", sameSite: "lax", secure };
}
