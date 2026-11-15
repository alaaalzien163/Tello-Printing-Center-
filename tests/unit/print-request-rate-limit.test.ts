import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getClientIp,
  getRateLimitSecret,
  getRateLimitSecretStatus,
  hashClientIp,
  isProduction,
} from "@/lib/print-requests/rate-limit";

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
