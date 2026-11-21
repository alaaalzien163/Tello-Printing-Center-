import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { resolveDeploymentEnvironment } from "@/config/site-url";
import { buildRobots } from "@/lib/robots";

export default function robots(): MetadataRoute.Robots {
  return buildRobots({
    siteUrl: siteConfig.url,
    isPreview: resolveDeploymentEnvironment() === "preview",
  });
}
