import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getPrivilegedSupabaseClient,
  isPrivilegedSupabaseConfigured,
} from "@/lib/supabase/admin";
import { normalizeSupabaseUrl } from "@/lib/supabase/config";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getPrivilegedSupabaseClient", () => {
  it("returns null and logs missing variable names", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(getPrivilegedSupabaseClient()).toBeNull();
    expect(isPrivilegedSupabaseConfigured()).toBe(false);

    expect(spy).toHaveBeenCalledWith(
      "[supabase] privileged client unavailable",
      expect.objectContaining({
        reason: "missing-environment-variable",
        details: expect.arrayContaining(["SUPABASE_SECRET_KEY"]),
      }),
    );
  });

  it("logs the missing variable name in production without leaking values", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "sb_publishable_example_key",
    );
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(getPrivilegedSupabaseClient()).toBeNull();
    expect(spy).toHaveBeenCalledWith(
      "[supabase] privileged client unavailable",
      expect.objectContaining({
        reason: "missing-environment-variable",
        details: ["SUPABASE_SECRET_KEY"],
      }),
    );

    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).not.toContain("sb_publishable_example_key");
  });

  it("rejects a malformed Supabase URL and names the variable", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not-a-url");
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "sb_publishable_example_key",
    );
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_example_key");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(getPrivilegedSupabaseClient()).toBeNull();
    expect(isPrivilegedSupabaseConfigured()).toBe(false);
    expect(spy).toHaveBeenCalledWith(
      "[supabase] privileged client unavailable",
      expect.objectContaining({
        reason: "invalid-environment-variable",
        details: ["NEXT_PUBLIC_SUPABASE_URL"],
      }),
    );
    expect(JSON.stringify(spy.mock.calls)).not.toContain("sb_secret_example_key");
  });

  it("rejects the publishable key when it is supplied as the secret key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "sb_publishable_example_key",
    );
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_publishable_example_key");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(getPrivilegedSupabaseClient()).toBeNull();
    expect(isPrivilegedSupabaseConfigured()).toBe(false);
    expect(spy).toHaveBeenCalledWith(
      "[supabase] privileged client unavailable",
      expect.objectContaining({ reason: "publishable-key-used-as-secret" }),
    );
  });

  it("creates a server client from the URL and secret key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://server-only.supabase.co");
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "sb_publishable_example_key",
    );
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_example_key");

    expect(getPrivilegedSupabaseClient()).not.toBeNull();
    expect(isPrivilegedSupabaseConfigured()).toBe(true);
  });
});

describe("normalizeSupabaseUrl", () => {
  it("accepts http(s) URLs and removes trailing slashes", () => {
    expect(normalizeSupabaseUrl("https://example.supabase.co")).toBe(
      "https://example.supabase.co",
    );
    expect(normalizeSupabaseUrl(" https://example.supabase.co/ ")).toBe(
      "https://example.supabase.co",
    );
    expect(normalizeSupabaseUrl("http://localhost:54321")).toBe(
      "http://localhost:54321",
    );
  });

  it("rejects missing, malformed and non-http values", () => {
    expect(normalizeSupabaseUrl(undefined)).toBeNull();
    expect(normalizeSupabaseUrl("")).toBeNull();
    expect(normalizeSupabaseUrl("not-a-url")).toBeNull();
    expect(normalizeSupabaseUrl("ftp://example.supabase.co")).toBeNull();
  });
});
