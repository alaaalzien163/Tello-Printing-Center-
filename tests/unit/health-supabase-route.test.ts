import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/health/supabase/route";
import { fingerprintProjectReference } from "@/lib/supabase/project-reference";

const STAGING_REF = "abcdefghijklmnopqrst";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/health/supabase", () => {
  it("does not expose project identity on Production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", `https://${STAGING_REF}.supabase.co`);

    const response = await GET();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "NOT_FOUND" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("does not expose identity from a local production-mode server", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "");

    const response = await GET();

    expect(response.status).toBe(404);
  });

  it("returns only the fingerprint in Preview", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", `https://${STAGING_REF}.supabase.co`);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      projectFingerprint: fingerprintProjectReference(STAGING_REF),
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns only the fingerprint in local development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", `https://${STAGING_REF}.supabase.co`);

    const response = await GET();

    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({
      projectFingerprint: fingerprintProjectReference(STAGING_REF),
    });
    expect(JSON.stringify(body)).not.toContain(STAGING_REF);
  });

  it("fails safely when Supabase is not configured", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "NOT_CONFIGURED" });
  });
});
