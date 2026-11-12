"use client";

export type SceneTheme = "light" | "dark";

interface SceneLightsProps {
  theme: SceneTheme;
}

/**
 * Lighting is deliberately restrained: a soft key, a cool fill and a cyan rim
 * that matches the storefront accent. The palette shifts slightly between
 * themes so the same model reads well on both backgrounds.
 */
export function SceneLights({ theme }: SceneLightsProps) {
  const isDark = theme === "dark";

  return (
    <>
      <ambientLight intensity={isDark ? 0.38 : 0.5} color={isDark ? "#9fc6ff" : "#dcecff"} />
      <hemisphereLight
        intensity={isDark ? 0.55 : 0.7}
        color={isDark ? "#b7d9ff" : "#eaf5ff"}
        groundColor={isDark ? "#040914" : "#182a3f"}
      />

      <directionalLight
        position={[4.5, 7, 5.5]}
        intensity={isDark ? 2.4 : 2.8}
        color={isDark ? "#e8f4ff" : "#ffffff"}
      />
      <directionalLight
        position={[-5, 3.5, -4]}
        intensity={isDark ? 0.9 : 1.05}
        color="#2f7dff"
      />

      <pointLight position={[3.2, 1.8, 3.2]} intensity={isDark ? 5.5 : 6.5} distance={9} color="#38d6ff" />
      <pointLight position={[-3.6, 2.4, -2.8]} intensity={isDark ? 3.2 : 3.8} distance={8} color="#1f6bff" />
      <pointLight position={[0, 2.3, -0.4]} intensity={isDark ? 1.6 : 2.1} distance={4} color="#7ee8ff" />
    </>
  );
}
