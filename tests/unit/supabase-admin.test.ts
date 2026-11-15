import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getPrivilegedSupabaseClient,
  isPrivilegedSupabaseConfigured,
} from "@/lib/supabase/admin";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getPrivilegedSupabaseClient", () => {
  it("returns null and logs a development configuration error when credentials are missing", () => {
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
