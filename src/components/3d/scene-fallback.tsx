import Image from "next/image";

import { cn } from "@/lib/utils";

interface SceneFallbackProps {
  alt: string;
  className?: string;
  priority?: boolean;
}

/**
 * Static, theme-neutral poster used whenever the interactive 3D scene cannot
 * (or should not) run: small screens, reduced motion, no WebGL, low-memory
 * devices and runtime failures. It is intentionally an ordinary image so it
 * stays server-rendered and works without JavaScript.
 */
export function SceneFallback({ alt, className, priority = false }: SceneFallbackProps) {
  return (
    <div
      data-testid="hero-scene-fallback"
      className={cn(
        "absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_50%_28%,#17324e_0%,#0a1727_52%,#050b14_100%)]",
        className,
      )}
    >
      <Image
        src="/models/hero-printer-poster.svg"
        alt={alt}
        fill
        priority={priority}
        sizes="(min-width: 1024px) 42rem, 92vw"
        className="object-cover"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_38%,rgb(2_8_16/0.34)_100%)]"
        aria-hidden="true"
      />
    </div>
  );
}
