import type { APIRequestContext } from "@playwright/test";

import {
  extractSupabaseProjectReference,
  fingerprintProjectReference,
} from "../../src/lib/supabase/project-reference";

/**
 * E2E write guard.
 *
 * Destructive tests are allowed only when the configured Supabase URL points at
 * an explicitly expected Staging project, the Production project reference is
 * known and different, and the operator opted in. Anything else skips the test
 * (or fails immediately when the configuration is actively unsafe).
 *
 * Playwright does not load `.env.local`; only `.env.test.local` is read for
 * these values. See `.env.test.example`.
 */

const WRITE_OPT_IN = "E2E_ALLOW_DATABASE_WRITES";
const EXPECTED_STAGING_REF = "E2E_EXPECTED_STAGING_PROJECT_REF";

export interface E2EWriteGuard {
  allowed: boolean;
  reason: string;
  projectFingerprint: string | null;
}

interface GuardEnvironment {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  E2E_ALLOW_DATABASE_WRITES?: string;
  E2E_EXPECTED_STAGING_PROJECT_REF?: string;
  E2E_PRODUCTION_PROJECT_REF?: string;
  [key: string]: string | undefined;
}

function blocked(reason: string, projectReference: string | null): E2EWriteGuard {
  return {
    allowed: false,
    reason,
    projectFingerprint: projectReference
      ? fingerprintProjectReference(projectReference)
      : null,
  };
}

export function getE2EWriteGuard(env: GuardEnvironment = process.env): E2EWriteGuard {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const projectReference = extractSupabaseProjectReference(url);
  const expectedStaging = env.E2E_EXPECTED_STAGING_PROJECT_REF?.trim() || null;
  const production = env.E2E_PRODUCTION_PROJECT_REF?.trim() || null;

  if (!url) {
    return blocked(
      "Staging is not configured for E2E (NEXT_PUBLIC_SUPABASE_URL is absent). Destructive tests are skipped.",
      null,
    );
  }

  if (!projectReference) {
    return blocked(
      "The configured Supabase URL does not contain a recognizable project reference. Destructive tests are skipped.",
      null,
    );
  }

  if (production && projectReference === production) {
    throw new Error(
      "Refusing to run E2E writes: NEXT_PUBLIC_SUPABASE_URL matches " +
        "E2E_PRODUCTION_PROJECT_REF. Point E2E at a Staging project.",
    );
  }

  if (expectedStaging && production && expectedStaging === production) {
    throw new Error(
      "Refusing to run E2E writes: E2E_EXPECTED_STAGING_PROJECT_REF and " +
        "E2E_PRODUCTION_PROJECT_REF are identical.",
    );
  }

  if (!expectedStaging) {
    return blocked(
      `Set ${EXPECTED_STAGING_REF} in .env.test.local to the Staging project reference. Destructive tests are skipped.`,
      projectReference,
    );
  }

  if (projectReference !== expectedStaging) {
    throw new Error(
      `Refusing to run E2E writes: the configured project (${fingerprintProjectReference(
        projectReference,
      )}) does not match ${EXPECTED_STAGING_REF} (${fingerprintProjectReference(
        expectedStaging,
      )}).`,
    );
  }

  if (env.E2E_ALLOW_DATABASE_WRITES !== "true") {
    return blocked(
      `Set ${WRITE_OPT_IN}=true in .env.test.local to enable destructive E2E tests against Staging.`,
      projectReference,
    );
  }

  return {
    allowed: true,
    reason: "",
    projectFingerprint: fingerprintProjectReference(projectReference),
  };
}

export const e2eWriteGuard = getE2EWriteGuard();

/** Fails a test body that reaches a write path without passing the guard. */
export function requireE2EWriteAccess(): void {
  if (!e2eWriteGuard.allowed) {
    throw new Error(`E2E write access denied: ${e2eWriteGuard.reason}`);
  }
}

/**
 * Compares the fingerprint reported by the running app with the one derived
 * from `.env.test.local`. Kept pure so the refusal logic is unit-tested.
 */
export function assertProjectFingerprint(
  expected: string | null,
  actual: unknown,
): void {
  if (!expected) {
    throw new Error("Refusing to write: no expected Staging project fingerprint.");
  }

  if (typeof actual !== "string" || actual !== expected) {
    throw new Error(
      `Refusing to write: the app under test targets ${
        typeof actual === "string" ? actual : "an unknown project"
      }, expected ${expected}.`,
    );
  }
}

/**
 * Proves that the server actually serving the tests targets the same Supabase
 * project as `.env.test.local`. This closes the reuseExistingServer /
 * externally-started-server hole: a localhost server that loaded Production
 * `.env.local` reports a different fingerprint and every write test aborts.
 */
export async function assertAppTargetsStaging(
  request: APIRequestContext,
): Promise<void> {
  requireE2EWriteAccess();

  const response = await request.get("/api/health/supabase");
  if (!response.ok()) {
    throw new Error(
      `Refusing to write: the app under test did not expose a Staging project fingerprint (HTTP ${response.status()}).`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(
      "Refusing to write: the app under test returned an unreadable project fingerprint.",
    );
  }

  const fingerprint =
    typeof payload === "object" && payload !== null && "projectFingerprint" in payload
      ? (payload as { projectFingerprint?: unknown }).projectFingerprint
      : null;

  assertProjectFingerprint(e2eWriteGuard.projectFingerprint, fingerprint);
}

/** Safe, non-sensitive label for test output. */
export function e2eProjectLabel(): string {
  return e2eWriteGuard.projectFingerprint
    ? `project-${e2eWriteGuard.projectFingerprint}`
    : "not-configured";
}
