import { createHmac } from "node:crypto";
import { isIP } from "node:net";

/** Initial abuse budget: three requests per client IP every fifteen minutes. */
export const PRINT_REQUEST_RATE_LIMIT = 3;
export const PRINT_REQUEST_RATE_WINDOW_SECONDS = 15 * 60;

export interface RateLimitEnvironment {
  NODE_ENV?: string;
  VERCEL?: string;
  VERCEL_ENV?: string;
}

export type ClientIpSource = "vercel" | "local-forwarded" | "local-loopback";

export interface ClientIpResult {
  /** A validated IP address, or `null` when the runtime cannot be trusted. */
  ip: string | null;
  source: ClientIpSource | null;
}

/**
 * Vercel owns the `x-vercel-forwarded-for` header and overwrites any value sent
 * by the client. Other forwarding headers (`cf-connecting-ip`, `x-real-ip`,
 * `x-forwarded-for`) are client-controllable in the current deployment because
 * there is no guaranteed Cloudflare proxy in front of Vercel, so they are never
 * accepted as a fallback in a deployed runtime.
 */
const TRUSTED_VERCEL_HEADER = "x-vercel-forwarded-for";

function firstHeaderValue(raw: string | null): string | null {
  if (!raw) return null;
  const first = raw.split(",")[0]?.trim();
  return first ? first : null;
}

/**
 * Accepts only syntactically valid IP addresses. Bracketed IPv6 values and
 * IPv6 values with a port are normalized to the bare address.
 */
function normalizeIp(raw: string | null): string | null {
  let candidate = firstHeaderValue(raw);
  if (!candidate) return null;

  const bracketedIpv6 = /^\[([^\]]+)\](?::\d+)?$/.exec(candidate);
  if (bracketedIpv6?.[1]) {
    candidate = bracketedIpv6[1];
  }

  const normalized = candidate.trim().toLocaleLowerCase();
  return isIP(normalized) ? normalized : null;
}

/**
 * `VERCEL=1` is set by every Vercel runtime. `VERCEL_ENV` distinguishes a
 * deployed environment from `vercel dev`; local development must keep working
 * over plain HTTP without trusting arbitrary proxy headers.
 */
export function isDeployedVercel(env: RateLimitEnvironment = process.env): boolean {
  const vercelEnvironment = env.VERCEL_ENV?.trim().toLocaleLowerCase();
  if (vercelEnvironment === "production" || vercelEnvironment === "preview") return true;
  if (vercelEnvironment === "development") return false;
  return env.VERCEL === "1" || env.VERCEL === "true";
}

/**
 * Resolves the rate-limit identity from platform-trusted request metadata.
 *
 * In Production, Preview, or any Node production runtime the absence of a
 * valid `x-vercel-forwarded-for` value fails closed (`ip: null`). Local tests
 * and `next dev` may use the first `x-forwarded-for` address so Playwright can
 * isolate clients; without one they share the loopback identity.
 */
export function getClientIp(
  headers: Headers,
  env: RateLimitEnvironment = process.env,
): ClientIpResult {
  const trustedIp = normalizeIp(headers.get(TRUSTED_VERCEL_HEADER));
  if (trustedIp) {
    return { ip: trustedIp, source: "vercel" };
  }

  if (isDeployedVercel(env) || env.NODE_ENV === "production") {
    return { ip: null, source: null };
  }

  const forwardedIp = normalizeIp(headers.get("x-forwarded-for"));
  if (forwardedIp) {
    return { ip: forwardedIp, source: "local-forwarded" };
  }

  return { ip: "127.0.0.1", source: "local-loopback" };
}

/**
 * Raw IPs are never stored. The database only receives this HMAC digest, and
 * rotating `PRINT_REQUEST_RATE_LIMIT_SECRET` resets the ledger.
 */
export function hashClientIp(ip: string, secret: string): string {
  return createHmac("sha256", secret).update(ip.trim().toLocaleLowerCase()).digest("hex");
}

export interface RateLimitSecretStatus {
  secret: string | null;
  issue: "missing" | "too-short" | null;
}

/**
 * Validates the rate-limit HMAC salt without exposing its value. A missing or
 * too-short secret is reported as an issue so production diagnostics can name
 * the variable instead of returning an opaque 503.
 */
export function getRateLimitSecretStatus(
  env: { PRINT_REQUEST_RATE_LIMIT_SECRET?: string; NODE_ENV?: string } = process.env,
): RateLimitSecretStatus {
  const secret = env.PRINT_REQUEST_RATE_LIMIT_SECRET?.trim();
  if (!secret) return { secret: null, issue: "missing" };
  if (secret.length < 16) return { secret: null, issue: "too-short" };
  return { secret, issue: null };
}

export function getRateLimitSecret(
  env: { PRINT_REQUEST_RATE_LIMIT_SECRET?: string; NODE_ENV?: string } = process.env,
): string | null {
  return getRateLimitSecretStatus(env).secret;
}

export function isProduction(env: { NODE_ENV?: string } = process.env): boolean {
  return env.NODE_ENV === "production";
}
