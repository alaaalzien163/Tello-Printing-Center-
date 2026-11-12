import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

/**
 * Locale-aware navigation primitives.
 *
 * Always use these exports inside the application instead of importing from
 * `next/link` or `next/navigation` directly. They keep the active locale in
 * the URL when navigating.
 */
export const { Link, getPathname, redirect, usePathname, useRouter } = createNavigation(routing);
