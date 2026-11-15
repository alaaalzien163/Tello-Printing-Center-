import Image from "next/image";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  priority?: boolean;
}

/**
 * Raster Tello wordmark shared by the public and admin headers.
 *
 * The source is 822×126 (6.52:1) and its artwork nearly fills the canvas
 * (the transparent margin is only ~5 px), so sizing by width keeps the real
 * proportions without extra cropping.
 *
 * Dark mode inverts the black wordmark to white, then rotates the hue back so
 * the magenta "CENTER" stays on-brand instead of turning green.
 */
export function BrandLogo({ className, priority = false }: BrandLogoProps) {
  const t = useTranslations("common");

  return (
    <Image
      src="/images/logo-tello.png"
      alt={t("logoAlt")}
      width={822}
      height={126}
      priority={priority}
      sizes="(max-width: 640px) 45vw, 208px"
      className={cn(
        "h-auto object-contain dark:invert dark:hue-rotate-180",
        className,
      )}
    />
  );
}
