import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getClientIp,
  getRateLimitSecret,
  getRateLimitSecretStatus,
  hashClientIp,
  isProduction,
} from "@/lib/print-requests/rate-limit";
import { verifyTurnstileToken } from "@/lib/print-requests/turnstile";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("print request rate-limit helpers", () => {
  it("prefers Cloudflare's client IP and falls back through proxy headers", () => {
    expect(
      getClientIp(
        new Headers({
          "cf-connecting-ip": "203.0.113.10",
          "x-real-ip": "198.51.100.1",
          "x-forwarded-for": "192.0.2.1, 192.0.2.2",
        }),
      ),
    ).toBe("203.0.113.10");

    expect(
      getClientIp(new Headers({ "x-forwarded-for": "192.0.2.1, 192.0.2.2" })),
    ).toBe("192.0.2.1");

    expect(getClientIp(new Headers())).toBe("unknown");
  });

  it("hashes the IP with HMAC and never returns the raw value", () => {
    const secret = "a-secret-that-is-long-enough";
    const hash = hashClientIp("203.0.113.10", secret);

    expect(hash).toHaveLength(64);
    expect(hash).not.toContain("203.0.113.10");
    expect(hashClientIp(" 203.0.113.10 ", secret)).toBe(hash);
    expect(hashClientIp("203.0.113.10", secret)).not.toBe(hashClientIp("203.0.113.11", secret));
  });

  it("requires a sufficiently long rate-limit secret", () => {
    expect(getRateLimitSecret({})).toBeNull();
    expect(getRateLimitSecret({ PRINT_REQUEST_RATE_LIMIT_SECRET: "short" })).toBeNull();
    expect(
      getRateLimitSecret({ PRINT_REQUEST_RATE_LIMIT_SECRET: "a-secret-that-is-long-enough" }),
    ).toBe("a-secret-that-is-long-enough");
  });

  it("reports whether the rate-limit secret is missing or too short", () => {
    expect(getRateLimitSecretStatus({})).toEqual({ secret: null, issue: "missing" });
    expect(
      getRateLimitSecretStatus({ PRINT_REQUEST_RATE_LIMIT_SECRET: "   " }),
    ).toEqual({ secret: null, issue: "missing" });
    expect(
      getRateLimitSecretStatus({ PRINT_REQUEST_RATE_LIMIT_SECRET: "short" }),
    ).toEqual({ secret: null, issue: "too-short" });
    expect(
      getRateLimitSecretStatus({
        PRINT_REQUEST_RATE_LIMIT_SECRET: "a-secret-that-is-long-enough",
      }),
    ).toEqual({ secret: "a-secret-that-is-long-enough", issue: null });
  });

  it("detects production mode", () => {
    expect(isProduction({ NODE_ENV: "production" })).toBe(true);
    expect(isProduction({ NODE_ENV: "development" })).toBe(false);
  });
});

describe("Turnstile server verification", () => {
  it("skips the challenge in non-production when no secret is configured", async () => {
    const result = await verifyTurnstileToken("", "203.0.113.10", { secret: null });
    expect(result).toEqual({ ok: true, reason: "disabled" });
  });

  it("fails closed in production when the secret is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const result = await verifyTurnstileToken("token", "203.0.113.10", { secret: null });
    expect(result).toEqual({ ok: false, reason: "not_configured" });
  });

  it("requires a token when a secret is configured", async () => {
    const result = await verifyTurnstileToken("", "203.0.113.10", { secret: "secret" });
    expect(result).toEqual({ ok: false, reason: "missing" });
  });

  it("trusts only Cloudflare's siteverify success response", async () => {
    const successFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      verifyTurnstileToken("valid-token", "203.0.113.10", {
        secret: "secret",
        fetchImpl: successFetch,
      }),
    ).resolves.toEqual({ ok: true });

    const body = successFetch.mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(body.get("secret")).toBe("secret");
    expect(body.get("response")).toBe("valid-token");
    expect(body.get("remoteip")).toBe("203.0.113.10");

    const invalidFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      verifyTurnstileToken("bad-token", "203.0.113.10", {
        secret: "secret",
        fetchImpl: invalidFetch,
      }),
    ).resolves.toEqual({ ok: false, reason: "invalid" });
  });

  it("reports an unavailable verifier on network failure", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(
      verifyTurnstileToken("token", "203.0.113.10", { secret: "secret", fetchImpl }),
    ).resolves.toEqual({ ok: false, reason: "unavailable" });
  });
});
