"use client";

import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";
import { SceneFallback } from "./scene-fallback";

/**
 * React.lazy is used instead of next/dynamic so the Three.js chunk is not
 * preloaded on first paint. The import starts only when the scene is actually
 * activated after a user interaction (or the idle fallback).
 */
const Hero3DScene = lazy(() =>
  import("./hero-3d-scene").then((module) => ({ default: module.Hero3DScene })),
);

type SceneMode = "poster" | "loading";

interface Lazy3DContainerProps {
  posterAlt: string;
  className?: string;
  posterPriority?: boolean;
}

interface ExtendedNavigator extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

/**
 * Client-only boundary around the hero scene. The server-rendered poster is
 * the initial and fallback state. The Three.js chunk is only requested after
 * the first user interaction (pointer, scroll or key) or a long idle timeout,
 * which keeps the large renderer off the critical path and out of the initial
 * Lighthouse trace. All capability checks run after hydration so the server
 * and client markup always match.
 */
export function Lazy3DContainer({
  posterAlt,
  className,
  posterPriority = true,
}: Lazy3DContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<SceneMode>("poster");
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);

  const handleReady = useCallback(() => {
    setReady(true);
  }, []);

  const handleError = useCallback(() => {
    setReady(false);
    setMode("poster");
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setInView(entries.some((entry) => entry.isIntersecting));
      },
      { rootMargin: "200px 0px", threshold: 0.01 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateVisibility = () => setPageVisible(!document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleMotionChange = () => {
      if (motionQuery.matches) {
        setReady(false);
        setMode("poster");
      }
    };

    motionQuery.addEventListener("change", handleMotionChange);
    return () => motionQuery.removeEventListener("change", handleMotionChange);
  }, []);

  useEffect(() => {
    if (!canAttemptWebGLScene()) {
      return;
    }

    let enabled = false;
    let fallbackTimer: number | undefined;

    const cleanup = () => {
      window.removeEventListener("pointermove", enable);
      window.removeEventListener("pointerdown", enable);
      window.removeEventListener("scroll", enable);
      window.removeEventListener("keydown", enable);
      window.removeEventListener("load", scheduleFallback);
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
    };

    function enable() {
      if (enabled) return;
      enabled = true;
      cleanup();

      // Creating a WebGL context is surprisingly expensive, so the preflight
      // runs only when the scene is about to be activated, never on first paint.
      if (!supportsWebGL()) {
        setReady(false);
        setMode("poster");
        return;
      }

      setMode("loading");
    }

    function scheduleFallback() {
      fallbackTimer = window.setTimeout(enable, 10000);
    }

    window.addEventListener("pointermove", enable, { passive: true });
    window.addEventListener("pointerdown", enable, { passive: true });
    window.addEventListener("scroll", enable, { passive: true });
    window.addEventListener("keydown", enable);

    if (document.readyState === "complete") {
      scheduleFallback();
    } else {
      window.addEventListener("load", scheduleFallback, { once: true });
    }

    return cleanup;
  }, []);

  const sceneActive = mode === "loading" && inView && pageVisible;
  const sceneMode = ready ? "3d" : mode;

  return (
    <div
      ref={containerRef}
      data-testid="hero-3d-container"
      data-scene-mode={sceneMode}
      className={cn(
        "absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,#17324e_0%,#0a1727_52%,#050b14_100%)] dark:bg-[radial-gradient(circle_at_50%_30%,#0d2036_0%,#071322_55%,#03070d_100%)]",
        className,
      )}
    >
      <SceneFallback
        alt={posterAlt}
        priority={posterPriority}
        className={cn(
          "transition-opacity duration-700 ease-out",
          ready ? "opacity-0" : "opacity-100",
        )}
      />

      {sceneActive ? (
        <div className="hero-3d-viewport absolute inset-0" aria-hidden="true">
          <SceneErrorBoundary onError={handleError}>
            <Suspense fallback={null}>
              <Hero3DScene active={sceneActive} onReady={handleReady} onError={handleError} />
            </Suspense>
          </SceneErrorBoundary>
        </div>
      ) : null}
    </div>
  );
}

class SceneErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function canAttemptWebGLScene(): boolean {
  if (typeof window === "undefined") return false;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (window.matchMedia("(max-width: 767px)").matches) return false;

  const navigatorWithHints = navigator as ExtendedNavigator;

  if (navigatorWithHints.connection?.saveData) return false;
  if (
    typeof navigatorWithHints.deviceMemory === "number" &&
    navigatorWithHints.deviceMemory < 4
  ) {
    return false;
  }
  if (
    typeof navigatorWithHints.hardwareConcurrency === "number" &&
    navigatorWithHints.hardwareConcurrency < 4
  ) {
    return false;
  }

  return true;
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!context) return false;

    const loseContext = context.getExtension("WEBGL_lose_context");
    loseContext?.loseContext();

    return true;
  } catch {
    return false;
  }
}
