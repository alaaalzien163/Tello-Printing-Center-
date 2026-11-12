"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Logo } from "@/components/brand/logo";

/**
 * Brand splash shown once per full page load. It is purely decorative,
 * never traps focus and disappears quickly even if JavaScript is slow.
 */
export function SplashScreen() {
  const t = useTranslations("splash");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timer = window.setTimeout(() => setVisible(false), media.matches ? 0 : 1_700);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      data-testid="splash-screen"
      className="splash-overlay pointer-events-none fixed inset-0 z-100 flex flex-col items-center justify-center gap-6 bg-brand-navy text-white"
    >
      <div className="splash-logo">
        <Logo
          className="[&_span]:text-white [&_span:last-child]:text-white/60"
          markClassName="size-12"
        />
      </div>
      <div className="splash-rule h-px w-28 bg-gradient-to-r from-transparent via-brand-cyan to-transparent" />
      <p className="splash-tagline text-[0.65rem] font-medium tracking-[0.34em] text-white/70 uppercase">
        {t("tagline")}
      </p>
    </div>
  );
}
