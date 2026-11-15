"use client";

export type SceneTheme = "light" | "dark";

interface SceneLightsProps {
  theme: SceneTheme;
}

/**
 * Lighting is deliberately restrained: a soft neutral key, a warm fill and a
 * pink rim drawn from the brand palette. Intensity and geometry are unchanged;
 * only the hues follow the Tello identity, and they shift slightly between
 * themes so the same model reads well on both backgrounds.
 */
export function SceneLights({ theme }: SceneLightsProps) {
  const isDark = theme === "dark";

  return (
    <>
      <ambientLight intensity={isDark ? 0.38 : 0.5} color={isDark ? "#e8d5dc" : "#fff5f8"} />
      <hemisphereLight
        intensity={isDark ? 0.55 : 0.7}
        color={isDark ? "#f3dde4" : "#fff7fa"}
        groundColor={isDark ? "#0a0507" : "#2a2023"}
      />

      <directionalLight
        position={[4.5, 7, 5.5]}
        intensity={isDark ? 2.4 : 2.8}
        color={isDark ? "#fff3f7" : "#ffffff"}
      />
      <directionalLight
        position={[-5, 3.5, -4]}
        intensity={isDark ? 0.9 : 1.05}
        color="#b41f54"
      />

      <pointLight position={[3.2, 1.8, 3.2]} intensity={isDark ? 5.5 : 6.5} distance={9} color="#cc1e5d" />
      <pointLight position={[-3.6, 2.4, -2.8]} intensity={isDark ? 3.2 : 3.8} distance={8} color="#bb3665" />
      <pointLight position={[0, 2.3, -0.4]} intensity={isDark ? 1.6 : 2.1} distance={4} color="#f5a3c0" />
    </>
  );
}
