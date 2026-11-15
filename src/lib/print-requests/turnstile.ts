export interface TurnstileVerification {
  ok: boolean;
  reason?: "missing" | "invalid" | "unavailable" | "not_configured" | "disabled";
}

interface VerifyOptions {
  secret?: string | null;
  fetchImpl?: typeof fetch;
}

export function getTurnstileSiteKey(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const key = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return key || null;
}

export function getTurnstileSecret(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  return secret || null;
}

/**
 * Server-side verification against Cloudflare's siteverify endpoint. A token
 * received from the browser is never trusted on its own.
 *
 * Production fails closed when the secret is absent. Local development and the
 * Playwright suite run without keys and skip the challenge explicitly; this is
 * not a public bypass route because it is decided by server environment.
 */
export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp: string,
  options: VerifyOptions = {},
): Promise<TurnstileVerification> {
  const secret =
    options.secret === undefined ? getTurnstileSecret() : options.secret;
  const env = process.env.NODE_ENV;

  if (!secret) {
    if (env === "production") return { ok: false, reason: "not_configured" };
    return { ok: true, reason: "disabled" };
  }

  const value = token?.trim();
  if (!value) return { ok: false, reason: "missing" };

  const body = new URLSearchParams({ secret, response: value });
  if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

  try {
    const response = await (options.fetchImpl ?? fetch)(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body,
        headers: { "content-type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      },
    );

    if (!response.ok) return { ok: false, reason: "unavailable" };

    const payload = (await response.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };

    if (payload.success === true) return { ok: true };

    const codes = payload["error-codes"] ?? [];
    if (codes.includes("invalid-input-secret")) {
      return { ok: false, reason: "not_configured" };
    }
    if (codes.includes("internal-error")) {
      return { ok: false, reason: "unavailable" };
    }

    return { ok: false, reason: "invalid" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
