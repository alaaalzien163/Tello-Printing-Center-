"use client";

import { useEffect, useState } from "react";

import { getUnreadPrintRequestCount } from "@/lib/actions/admin-print-requests";

export const PRINT_REQUESTS_REFRESH_EVENT = "tello:print-requests-refresh";

export function dispatchPrintRequestsRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PRINT_REQUESTS_REFRESH_EVENT));
}

/**
 * Dashboard-only notification counter. Realtime would need a new public
 * channel; a controlled 40-second poll plus explicit refresh events keeps the
 * badge current without granting anonymous subscriptions.
 */
export function useUnreadPrintRequests(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      if (document.visibilityState === "hidden") return;

      try {
        const result = await getUnreadPrintRequestCount();
        if (active && result.ok) setCount(result.data);
      } catch {
        // A temporary network failure keeps the previous count.
      }
    }

    void load();

    const timer = window.setInterval(() => void load(), 40_000);
    const onRefresh = () => void load();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load();
    };

    window.addEventListener("focus", onRefresh);
    window.addEventListener(PRINT_REQUESTS_REFRESH_EVENT, onRefresh);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener(PRINT_REQUESTS_REFRESH_EVENT, onRefresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return count;
}
