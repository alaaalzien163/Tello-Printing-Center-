import { describe, expect, it } from "vitest";

import {
  LOCAL_SITE_URL,
  PRODUCTION_SITE_URL,
  isLocalhostOrigin,
  normalizeHttpOrigin,
  resolveDeploymentEnvironment,
  resolveSiteUrl,
} from "@/config/site-url";

function env(overrides: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return { ...overrides } as NodeJS.ProcessEnv;
}

describe("resolveDeploymentEnvironment", () => {
  it("detects Vercel preview and production deployments", () => {
    expect(resolveDeploymentEnvironment(env({ VERCEL_ENV: "preview" }))).toBe("preview");
    expect(resolveDeploymentEnvironment(env({ VERCEL_ENV: "production" }))).toBe(
      "production",
    );
  });

  it("treats a plain production build as production", () => {
    expect(resolveDeploymentEnvironment(env({ NODE_ENV: "production" }))).toBe(
      "production",
    );
  });

  it("defaults to local development", () => {
    expect(resolveDeploymentEnvironment(env({ NODE_ENV: "development" }))).toBe("local");
    expect(resolveDeploymentEnvironment(env({ NODE_ENV: "test" }))).toBe("local");
  });
});

describe("normalizeHttpOrigin", () => {
  it("normalizes an absolute http(s) URL to its origin", () => {
    expect(normalizeHttpOrigin("https://www.telloprintingcenter.com/")).toBe(
      "https://www.telloprintingcenter.com",
    );
    expect(normalizeHttpOrigin("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("rejects non-http protocols and URLs with paths", () => {
    expect(normalizeHttpOrigin("ftp://example.com")).toBeNull();
    expect(normalizeHttpOrigin("https://example.com/en")).toBeNull();
    expect(normalizeHttpOrigin("https://example.com?x=1")).toBeNull();
    expect(normalizeHttpOrigin("not a url")).toBeNull();
  });
});

describe("isLocalhostOrigin", () => {
  it("recognizes local development hosts", () => {
    expect(isLocalhostOrigin("http://localhost:3000")).toBe(true);
    expect(isLocalhostOrigin("http://127.0.0.1:3000")).toBe(true);
    expect(isLocalhostOrigin(PRODUCTION_SITE_URL)).toBe(false);
  });
});

describe("resolveSiteUrl", () => {
  it("uses localhost for local development", () => {
    expect(resolveSiteUrl(env({ NODE_ENV: "development" }))).toBe(LOCAL_SITE_URL);
  });

  it("uses the Vercel preview URL when no explicit URL is set", () => {
    expect(
      resolveSiteUrl(
        env({
          NODE_ENV: "production",
          VERCEL_ENV: "preview",
          VERCEL_URL: "tello-preview-abc.vercel.app",
        }),
      ),
    ).toBe("https://tello-preview-abc.vercel.app");
  });

  it("accepts an explicit preview origin and strips a trailing slash", () => {
    expect(
      resolveSiteUrl(
        env({
          NODE_ENV: "production",
          VERCEL_ENV: "preview",
          NEXT_PUBLIC_SITE_URL: "https://preview.example.com/",
        }),
      ),
    ).toBe("https://preview.example.com");
  });

  it("falls back to the canonical Production origin for Production", () => {
    expect(
      resolveSiteUrl(env({ NODE_ENV: "production", VERCEL_ENV: "production" })),
    ).toBe(PRODUCTION_SITE_URL);
  });

  it("accepts the canonical Production origin when explicitly configured", () => {
    expect(
      resolveSiteUrl(
        env({
          NODE_ENV: "production",
          VERCEL_ENV: "production",
          NEXT_PUBLIC_SITE_URL: PRODUCTION_SITE_URL,
        }),
      ),
    ).toBe(PRODUCTION_SITE_URL);
  });

  it("rejects an incorrect Production origin", () => {
    expect(() =>
      resolveSiteUrl(
        env({
          NODE_ENV: "production",
          VERCEL_ENV: "production",
          NEXT_PUBLIC_SITE_URL: "https://tello.vercel.app",
        }),
      ),
    ).toThrow(/incorrect Production site URL/i);
  });

  it("rejects the Production origin on Preview", () => {
    expect(() =>
      resolveSiteUrl(
        env({
          NODE_ENV: "production",
          VERCEL_ENV: "preview",
          NEXT_PUBLIC_SITE_URL: PRODUCTION_SITE_URL,
        }),
      ),
    ).toThrow(/Preview deployment/i);
  });

  it("rejects localhost on Preview", () => {
    expect(() =>
      resolveSiteUrl(
        env({
          NODE_ENV: "production",
          VERCEL_ENV: "preview",
          NEXT_PUBLIC_SITE_URL: LOCAL_SITE_URL,
        }),
      ),
    ).toThrow(/insecure Preview site URL/i);
  });

  it("rejects an invalid explicit URL", () => {
    expect(() =>
      resolveSiteUrl(
        env({ NODE_ENV: "development", NEXT_PUBLIC_SITE_URL: "not a url" }),
      ),
    ).toThrow(/Invalid site URL configuration/i);
  });
});
