import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getClientIp,
  getRateLimitSecret,
  getRateLimitSecretStatus,
  hashClientIp,
  isDeployedVercel,
  isProduction,
} from "@/lib/print-requests/rate-limit";

const DEPLOYED = { VERCEL_ENV: "production" } as const;
const PREVIEW = { VERCEL_ENV: "preview" } as const;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("print request rate-limit helpers", () => {
  it("uses Vercel's trusted header and ignores every client-controlled header", () => {
    expect(
      getClientIp(
        new Headers({
          "x-vercel-forwarded-for": "203.0.113.10",
          "cf-connecting-ip": "198.51.100.1",
          "x-real-ip": "198.51.100.2",
          "x-forwarded-for": "192.0.2.1, 192.0.2.2",
        }),
        DEPLOYED,
      ),
    ).toEqual({ ip: "203.0.113.10", source: "vercel" });
  });

  it("cannot be overridden by a forged cf-connecting-ip", () => {
    expect(
      getClientIp(
        new Headers({
          "x-vercel-forwarded-for": "203.0.113.10",
          "cf-connecting-ip": "198.51.100.1",
        }),
        DEPLOYED,
      ).ip,
    ).toBe("203.0.113.10");

    expect(
      getClientIp(
        new Headers({ "cf-connecting-ip": "198.51.100.1" }),
        DEPLOYED,
      ),
    ).toEqual({ ip: null, source: null });
  });

  it("cannot be overridden by a forged x-forwarded-for or x-real-ip", () => {
    for (const header of ["x-forwarded-for", "x-real-ip"]) {
      expect(
        getClientIp(
          new Headers({
            "x-vercel-forwarded-for": "203.0.113.10",
            [header]: "198.51.100.1",
          }),
          DEPLOYED,
        ).ip,
      ).toBe("203.0.113.10");

      expect(
        getClientIp(new Headers({ [header]: "198.51.100.1" }), DEPLOYED),
      ).toEqual({ ip: null, source: null });
    }
  });

  it("fails closed when the trusted Vercel header is missing or invalid", () => {
    expect(getClientIp(new Headers(), DEPLOYED)).toEqual({
      ip: null,
      source: null,
    });
    expect(getClientIp(new Headers(), PREVIEW)).toEqual({
      ip: null,
      source: null,
    });

    for (const invalid of [
      "not-an-ip",
      "999.999.999.999",
      "203.0.113",
      "   ",
    ]) {
      expect(
        getClientIp(new Headers({ "x-vercel-forwarded-for": invalid }), DEPLOYED),
      ).toEqual({ ip: null, source: null });
    }
  });

  it("normalizes valid IPv4 and IPv6 addresses", () => {
    expect(
      getClientIp(
        new Headers({ "x-vercel-forwarded-for": " 203.0.113.10 " }),
        DEPLOYED,
      ).ip,
    ).toBe("203.0.113.10");
    expect(
      getClientIp(
        new Headers({ "x-vercel-forwarded-for": "[2001:DB8::1]:443" }),
        DEPLOYED,
      ).ip,
    ).toBe("2001:db8::1");
    expect(
      getClientIp(
        new Headers({ "x-vercel-forwarded-for": "2001:db8::2" }),
        DEPLOYED,
      ).ip,
    ).toBe("2001:db8::2");
  });

  it("keeps local development usable without trusting headers in production", () => {
    expect(
      getClientIp(new Headers({ "x-forwarded-for": "192.0.2.1, 192.0.2.2" }), {
        NODE_ENV: "development",
      }),
    ).toEqual({ ip: "192.0.2.1", source: "local-forwarded" });

    expect(
      getClientIp(new Headers(), { NODE_ENV: "development" }),
    ).toEqual({ ip: "127.0.0.1", source: "local-loopback" });

    expect(
      getClientIp(new Headers({ "x-forwarded-for": "192.0.2.1" }), {
        NODE_ENV: "production",
      }),
    ).toEqual({ ip: null, source: null });
  });

  it("treats vercel dev as local but deployed Vercel contexts as untrusted", () => {
    expect(isDeployedVercel({ VERCEL: "1", VERCEL_ENV: "development" })).toBe(false);
    expect(isDeployedVercel({ VERCEL: "1", VERCEL_ENV: "production" })).toBe(true);
    expect(isDeployedVercel({ VERCEL: "1", VERCEL_ENV: "preview" })).toBe(true);
    expect(isDeployedVercel({ VERCEL: "1" })).toBe(true);
    expect(isDeployedVercel({})).toBe(false);
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
