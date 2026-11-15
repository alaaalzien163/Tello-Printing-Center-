import { createHmac } from "node:crypto";

/** Initial abuse budget: three requests per client IP every fifteen minutes. */
export const PRINT_REQUEST_RATE_LIMIT = 3;
export const PRINT_REQUEST_RATE_WINDOW_SECONDS = 15 * 60;

/**
 * Cloudflare forwards the visitor IP in `cf-connecting-ip`. Local proxies use
 * `x-forwarded-for`; the first address is the original client.
 */
export function getClientIp(headers: Headers): string {
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for")?.split(",")[0],
  ];

  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) return trimmed;
  }

  return "unknown";
}

/**
 * Raw IPs are never stored. The database only receives this HMAC digest, and
 * rotating `PRINT_REQUEST_RATE_LIMIT_SECRET` resets the ledger.
 */
export function hashClientIp(ip: string, secret: string): string {
  return createHmac("sha256", secret).update(ip.trim().toLocaleLowerCase()).digest("hex");
}

export function getRateLimitSecret(
  env: { PRINT_REQUEST_RATE_LIMIT_SECRET?: string; NODE_ENV?: string } = process.env,
): string | null {
  const secret = env.PRINT_REQUEST_RATE_LIMIT_SECRET?.trim();
  return secret && secret.length >= 16 ? secret : null;
}

export function isProduction(env: { NODE_ENV?: string } = process.env): boolean {
  return env.NODE_ENV === "production";
}
