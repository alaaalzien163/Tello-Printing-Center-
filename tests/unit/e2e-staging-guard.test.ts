import { describe, expect, it } from "vitest";

import { getE2EWriteGuard, assertProjectFingerprint } from "../e2e/staging";
import {
  extractSupabaseProjectReference,
  fingerprintProjectReference,
} from "@/lib/supabase/project-reference";

const STAGING_REF = "abcdefghijklmnopqrst";
const PRODUCTION_REF = "zyxwvutsrqponmlkjihg";
const STAGING_URL = `https://${STAGING_REF}.supabase.co`;

describe("E2E write guard", () => {
  it("skips when Staging is not configured", () => {
    const guard = getE2EWriteGuard({});

    expect(guard.allowed).toBe(false);
    expect(guard.reason).toContain("absent");
  });

  it("skips when the expected Staging reference is missing", () => {
    const guard = getE2EWriteGuard({
      NEXT_PUBLIC_SUPABASE_URL: STAGING_URL,
      E2E_ALLOW_DATABASE_WRITES: "true",
    });

    expect(guard.allowed).toBe(false);
    expect(guard.reason).toContain("E2E_EXPECTED_STAGING_PROJECT_REF");
  });

  it("skips when the explicit write opt-in is missing", () => {
    const guard = getE2EWriteGuard({
      NEXT_PUBLIC_SUPABASE_URL: STAGING_URL,
      E2E_EXPECTED_STAGING_PROJECT_REF: STAGING_REF,
      E2E_PRODUCTION_PROJECT_REF: PRODUCTION_REF,
    });

    expect(guard.allowed).toBe(false);
    expect(guard.reason).toContain("E2E_ALLOW_DATABASE_WRITES=true");
  });

  it("allows only an explicit Staging project with writes enabled", () => {
    const guard = getE2EWriteGuard({
      NEXT_PUBLIC_SUPABASE_URL: STAGING_URL,
      E2E_EXPECTED_STAGING_PROJECT_REF: STAGING_REF,
      E2E_PRODUCTION_PROJECT_REF: PRODUCTION_REF,
      E2E_ALLOW_DATABASE_WRITES: "true",
    });

    expect(guard.allowed).toBe(true);
    expect(guard.projectFingerprint).toBe(
      fingerprintProjectReference(STAGING_REF),
    );
  });

  it("refuses to write when the URL matches the Production reference", () => {
    expect(() =>
      getE2EWriteGuard({
        NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_REF}.supabase.co`,
        E2E_EXPECTED_STAGING_PROJECT_REF: PRODUCTION_REF,
        E2E_PRODUCTION_PROJECT_REF: PRODUCTION_REF,
        E2E_ALLOW_DATABASE_WRITES: "true",
      }),
    ).toThrow(/matches E2E_PRODUCTION_PROJECT_REF/);
  });

  it("refuses to write when the project does not match the expected Staging reference", () => {
    expect(() =>
      getE2EWriteGuard({
        NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_REF}.supabase.co`,
        E2E_EXPECTED_STAGING_PROJECT_REF: STAGING_REF,
        E2E_ALLOW_DATABASE_WRITES: "true",
      }),
    ).toThrow(/does not match E2E_EXPECTED_STAGING_PROJECT_REF/);
  });

  it("does not expose raw project references in refusal messages", () => {
    try {
      getE2EWriteGuard({
        NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_REF}.supabase.co`,
        E2E_EXPECTED_STAGING_PROJECT_REF: STAGING_REF,
        E2E_ALLOW_DATABASE_WRITES: "true",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain(PRODUCTION_REF);
      expect(message).not.toContain(STAGING_REF);
    }
  });

  it("supports a local Supabase instance and rejects custom domains", () => {
    expect(extractSupabaseProjectReference("http://127.0.0.1:54321")).toBe("local");
    expect(extractSupabaseProjectReference("https://db.example.com")).toBeNull();
    expect(extractSupabaseProjectReference("not a url")).toBeNull();
  });

  it("refuses a server whose fingerprint does not match the Staging project", () => {
    expect(() =>
      assertProjectFingerprint("staging123", "production456"),
    ).toThrow(/targets production456, expected staging123/);
    expect(() => assertProjectFingerprint("staging123", undefined)).toThrow(
      /unknown project/,
    );
    expect(() => assertProjectFingerprint(null, "staging123")).toThrow(
      /no expected Staging project fingerprint/,
    );
    expect(() =>
      assertProjectFingerprint("staging123", "staging123"),
    ).not.toThrow();
  });
});
