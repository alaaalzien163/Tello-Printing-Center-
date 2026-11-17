import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

import { resolveSiteUrl } from "./src/config/site-url";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

function supabaseImagePatterns(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!rawUrl) return [];

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return [];

    return [
      {
        protocol: url.protocol === "https:" ? "https" : "http",
        hostname: url.hostname,
        ...(url.port ? { port: url.port } : {}),
        pathname: "/storage/v1/object/public/**",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: {
    // Resolve the deployment origin once, at build time, so that server
    // rendering and client hydration agree on canonical URLs. `resolveSiteUrl`
    // throws for an invalid or environment-inappropriate configuration, which
    // fails the build instead of publishing the wrong host.
    NEXT_PUBLIC_RESOLVED_SITE_URL: resolveSiteUrl(),
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabaseImagePatterns(),
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
