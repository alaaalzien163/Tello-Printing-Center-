/**
 * Deployment-aware canonical origin resolution.
 *
 * Metadata, JSON-LD, the sitemap and robots.txt must never publish a
 * localhost origin from a Preview or Production deployment. The canonical
 * origin is resolved in this order:
 *
 * 1. `NEXT_PUBLIC_SITE_URL` (explicit override for any environment).
 * 2. `https://$VERCEL_URL` on Vercel Preview deployments.
 * 3. `https://www.telloprintingcenter.com` for Production deployments.
 * 4. `http://localhost:3000` for local development and tests.
 *
 * Production is validated strictly: an explicit URL that does not match the
 * eventual canonical origin fails the build instead of silently publishing
 * the wrong host. Preview deployments are also prevented from reusing the
 * Production origin.
 */

export const PRODUCTION_SITE_URL = "https://www.telloprintingcenter.com";
export const LOCAL_SITE_URL = "http://localhost:3000";

export type DeploymentEnvironment = "local" | "preview" | "production";

type EnvSource = Pick<NodeJS.ProcessEnv, string>;

function readEnv(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Returns a normalised http(s) origin, or null for invalid input. */
export function normalizeHttpOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    // Origins cannot carry a path, query or fragment. Reject rather than
    // silently dropping a mistaken path such as `/en`.
    if (url.pathname !== "/" && url.pathname !== "") return null;
    if (url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function isLocalhostOrigin(origin: string): boolean {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

export function resolveDeploymentEnvironment(
  env: EnvSource = process.env,
): DeploymentEnvironment {
  const vercelEnv = readEnv(env.VERCEL_ENV)?.toLowerCase();

  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "preview";

  // A plain `next build` / `next start` is treated as a production build.
  if (env.NODE_ENV === "production") return "production";

  return "local";
}

function assertValidSiteUrl(
  origin: string,
  environment: DeploymentEnvironment,
  source: string,
): void {
  if (environment === "production") {
    if (origin !== PRODUCTION_SITE_URL) {
      throw new Error(
        `Refusing to build with an incorrect Production site URL (${source}: ${origin}). ` +
          `Production must use ${PRODUCTION_SITE_URL}.`,
      );
    }
    return;
  }

  if (environment === "preview") {
    if (!origin.startsWith("https://") || isLocalhostOrigin(origin)) {
      throw new Error(
        `Refusing to build with an insecure Preview site URL (${source}: ${origin}). ` +
          "Preview deployments must use their own https origin.",
      );
    }
    if (origin === PRODUCTION_SITE_URL) {
      throw new Error(
        "Refusing to use the Production canonical origin on a Preview deployment. " +
          "Set NEXT_PUBLIC_SITE_URL to the Preview origin, or leave it unset so VERCEL_URL is used.",
      );
    }
  }
}

/**
 * Resolves the canonical origin for the current deployment.
 * Throws for an invalid or environment-inappropriate configuration.
 */
export function resolveSiteUrl(env: EnvSource = process.env): string {
  const environment = resolveDeploymentEnvironment(env);
  const explicit = readEnv(env.NEXT_PUBLIC_SITE_URL);
  const vercelUrl = readEnv(env.VERCEL_URL);

  let candidate: string | null;
  let source: string;

  if (explicit) {
    candidate = explicit;
    source = "NEXT_PUBLIC_SITE_URL";
  } else if (environment === "production") {
    candidate = PRODUCTION_SITE_URL;
    source = "Production default";
  } else if (environment === "preview") {
    candidate = vercelUrl ? `https://${vercelUrl}` : null;
    source = "VERCEL_URL";
  } else {
    candidate = LOCAL_SITE_URL;
    source = "Local default";
  }

  const origin = candidate ? normalizeHttpOrigin(candidate) : null;
  if (!origin) {
    throw new Error(
      `Invalid site URL configuration (${source}: ${candidate ?? "missing"}). ` +
        "Use an absolute http(s) origin without a path or trailing slash.",
    );
  }

  assertValidSiteUrl(origin, environment, source);
  return origin;
}
