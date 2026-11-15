"use client";

import { useEffect, useRef } from "react";

interface TurnstileRenderOptions {
  sitekey: string;
  theme?: "light" | "dark" | "auto";
  language?: string;
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
  "timeout-callback"?: () => void;
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string | undefined;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_ID = "cloudflare-turnstile-script";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();

  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("TURNSTILE_LOAD")), {
          once: true,
        });
        return;
      }

      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => reject(new Error("TURNSTILE_LOAD")), {
        once: true,
      });
      document.head.appendChild(script);
    }).catch((error) => {
      scriptPromise = null;
      throw error;
    });
  }

  return scriptPromise;
}

interface TurnstileWidgetProps {
  siteKey: string | null;
  locale: string;
  onToken: (token: string) => void;
  /** Increment to reset the challenge after a failed submission. */
  resetSignal?: number;
}

/**
 * Renders Cloudflare Turnstile when a site key is configured. The token is
 * only a client hint; the API always verifies it against Cloudflare.
 */
export function TurnstileWidget({
  siteKey,
  locale,
  onToken,
  resetSignal = 0,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!siteKey) return;
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile || !containerRef.current) return;
        widgetRef.current =
          window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme: "auto",
            language: locale === "ar" ? "ar" : "en",
            callback: (token) => onTokenRef.current(token),
            "expired-callback": () => onTokenRef.current(""),
            "error-callback": () => onTokenRef.current(""),
            "timeout-callback": () => onTokenRef.current(""),
          }) ?? null;
      })
      .catch(() => onTokenRef.current(""));

    return () => {
      cancelled = true;
      if (widgetRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetRef.current);
        } catch {
          // The widget may already be gone after a client navigation.
        }
      }
      widgetRef.current = null;
    };
  }, [siteKey, locale]);

  useEffect(() => {
    if (!resetSignal || !widgetRef.current || !window.turnstile) return;
    try {
      window.turnstile.reset(widgetRef.current);
    } catch {
      onTokenRef.current("");
    }
  }, [resetSignal]);

  if (!siteKey) return null;

  return <div ref={containerRef} className="min-h-[65px]" data-testid="turnstile-widget" />;
}
