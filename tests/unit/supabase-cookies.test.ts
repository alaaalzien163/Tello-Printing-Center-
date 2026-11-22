import { describe, expect, it } from "vitest";

import {
  browserSessionCookieOptions,
  serverSessionCookieOptions,
} from "@/lib/supabase/cookies";

describe("Supabase session cookie options", () => {
  it("marks server cookies Secure in Vercel Production and Preview", () => {
    expect(serverSessionCookieOptions({ VERCEL_ENV: "production" })).toEqual({
      path: "/",
      sameSite: "lax",
      secure: true,
    });
    expect(serverSessionCookieOptions({ VERCEL_ENV: "preview" })).toEqual({
      path: "/",
      sameSite: "lax",
      secure: true,
    });
  });

  it("keeps local development cookies usable over HTTP", () => {
    expect(serverSessionCookieOptions({ VERCEL_ENV: "development" })).toEqual({
      path: "/",
      sameSite: "lax",
      secure: false,
    });
    expect(serverSessionCookieOptions({ NODE_ENV: "development" })).toEqual({
      path: "/",
      sameSite: "lax",
      secure: false,
    });
  });

  it("supports an explicit opt-in for non-Vercel production", () => {
    expect(
      serverSessionCookieOptions({ NODE_ENV: "production", SUPABASE_COOKIE_SECURE: "true" }),
    ).toEqual({ path: "/", sameSite: "lax", secure: true });
  });

  it("derives browser security from the page protocol", () => {
    expect(browserSessionCookieOptions("https:")).toEqual({
      path: "/",
      sameSite: "lax",
      secure: true,
    });
    expect(browserSessionCookieOptions("http:")).toEqual({
      path: "/",
      sameSite: "lax",
      secure: false,
    });
  });
});
