"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { BrandLogo } from "@/components/brand/brand-logo";

/**
 * Brand splash shown once per full page load. It is purely decorative,
 * never traps focus and disappears quickly even if JavaScript is slow.
 */
export function SplashScreen() {
  const t = useTranslations("splash");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timer = window.setTimeout(() => setVisible(false), media.matches ? 0 : 1_200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      data-testid="splash-screen"
      className="splash-overlay pointer-events-none fixed inset-0 z-100 flex flex-col items-center justify-center gap-5 bg-brand-black text-white"
    >
      <div className="splash-logo px-6">
        <BrandLogo className="w-48 invert hue-rotate-180 sm:w-56" />
      </div>
      <div className="splash-rule h-px w-24 bg-brand-primary" />
      <p className="splash-tagline text-[0.65rem] font-medium tracking-[0.3em] text-white/70 uppercase">
        {t("tagline")}
      </p>
    </div>
  );
}
