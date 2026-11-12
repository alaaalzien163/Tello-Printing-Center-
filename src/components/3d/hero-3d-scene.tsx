"use client";

import { ContactShadows } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTheme } from "next-themes";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { MathUtils, Vector3, type Group } from "three";

import { PrinterModel } from "./printer-model";
import { SceneLights, type SceneTheme } from "./scene-lights";

export interface Hero3DSceneProps {
  /** When false the render loop is paused (scene is off-screen or tab hidden). */
  active: boolean;
  onReady?: () => void;
  onError?: () => void;
}

const CAMERA_TARGET = new Vector3(0, 1.38, 0);
const HERO_MODEL_URL = process.env.NEXT_PUBLIC_HERO_PRINTER_MODEL;

export function Hero3DScene({ active, onReady, onError }: Hero3DSceneProps) {
  const { resolvedTheme } = useTheme();
  const theme: SceneTheme = resolvedTheme === "light" ? "light" : "dark";
  const dpr = useMemo<[number, number]>(() => [1, 1.75], []);

  return (
    <Canvas
      dpr={dpr}
      frameloop={active ? "always" : "never"}
      camera={{ position: [4.7, 3.05, 5.75], fov: 34, near: 0.1, far: 60 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      }}
      performance={{ min: 0.6 }}
      style={{ touchAction: "pan-y" }}
    >
      <SceneLifecycle onReady={onReady} onError={onError} />
      <CameraRig />
      <SceneLights theme={theme} />

      <Suspense fallback={null}>
        <PrinterRig>
          <PrinterModel theme={theme} modelUrl={HERO_MODEL_URL} />
        </PrinterRig>
      </Suspense>

      <ContactShadows
        position={[0, 0.08, 0]}
        opacity={theme === "dark" ? 0.55 : 0.42}
        scale={6.4}
        blur={2.8}
        far={4}
        resolution={256}
        frames={1}
        color="#020812"
      />
    </Canvas>
  );
}

function SceneLifecycle({
  onReady,
  onError,
}: {
  onReady?: () => void;
  onError?: () => void;
}) {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      onError?.();
    };

    canvas.addEventListener("webglcontextlost", handleContextLost, false);

    const frame = window.requestAnimationFrame(() => {
      onReady?.();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      canvas.removeEventListener("webglcontextlost", handleContextLost, false);
    };
  }, [gl, onReady, onError]);

  return null;
}

function CameraRig() {
  const { size } = useThree();
  const target = useMemo(() => CAMERA_TARGET.clone(), []);

  useFrame((state, delta) => {
    const camera = state.camera;
    const time = state.clock.elapsedTime;
    const aspect = size.width / Math.max(size.height, 1);
    const fit = aspect < 1 ? 1.2 : aspect < 1.25 ? 1.08 : 1;

    const x = (4.7 + Math.sin(time * 0.18) * 0.1) * fit;
    const y = 3.05 + Math.sin(time * 0.22) * 0.07;
    const z = (5.75 + Math.cos(time * 0.16) * 0.09) * fit;

    camera.position.x = MathUtils.damp(camera.position.x, x, 2.2, delta);
    camera.position.y = MathUtils.damp(camera.position.y, y, 2.2, delta);
    camera.position.z = MathUtils.damp(camera.position.z, z, 2.2, delta);
    camera.lookAt(target);
  });

  return null;
}

function PrinterRig({ children }: { children: React.ReactNode }) {
  const group = useRef<Group>(null);
  const autoRotation = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const bounds = canvas.getBoundingClientRect();
      pointer.current.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.current.y = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1);
    };

    const resetPointer = () => {
      pointer.current.x = 0;
      pointer.current.y = 0;
    };

    canvas.addEventListener("pointermove", handlePointerMove, { passive: true });
    canvas.addEventListener("pointerleave", resetPointer, { passive: true });

    return () => {
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", resetPointer);
    };
  }, [gl]);

  useFrame((state, delta) => {
    if (!group.current) return;

    autoRotation.current += delta * 0.12;

    const targetY = autoRotation.current + pointer.current.x * 0.16;
    const targetX = -pointer.current.y * 0.055;

    group.current.rotation.y = MathUtils.damp(group.current.rotation.y, targetY, 3.2, delta);
    group.current.rotation.x = MathUtils.damp(group.current.rotation.x, targetX, 3.2, delta);
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.55) * 0.022;
  });

  return <group ref={group}>{children}</group>;
}
