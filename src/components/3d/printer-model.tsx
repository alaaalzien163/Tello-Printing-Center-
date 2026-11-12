"use client";

import { RoundedBox, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";

import type { SceneTheme } from "./scene-lights";

interface PrinterPalette {
  body: string;
  bodyAlt: string;
  metal: string;
  darkMetal: string;
  glass: string;
  accent: string;
  accentSoft: string;
  print: string;
  screen: string;
}

const palettes: Record<SceneTheme, PrinterPalette> = {
  dark: {
    body: "#1a2c41",
    bodyAlt: "#0b1726",
    metal: "#8fa8c2",
    darkMetal: "#243a50",
    glass: "#8ad9f2",
    accent: "#38d6ff",
    accentSoft: "#1b7fb4",
    print: "#2aa7e0",
    screen: "#62e4ff",
  },
  light: {
    body: "#22384f",
    bodyAlt: "#122334",
    metal: "#a9bfd3",
    darkMetal: "#2c4359",
    glass: "#a9e7f7",
    accent: "#22b8e6",
    accentSoft: "#207aa4",
    print: "#2497cc",
    screen: "#57dcf7",
  },
};

export interface PrinterModelProps {
  theme: SceneTheme;
  /**
   * Optional path to a licensed GLB/GLTF asset. When omitted the original
   * procedural model below is used. See public/models/README.md.
   */
  modelUrl?: string;
}

export function PrinterModel({ theme, modelUrl }: PrinterModelProps) {
  if (modelUrl) return <GlbPrinterModel url={modelUrl} />;
  return <ProceduralPrinter palette={palettes[theme]} />;
}

function GlbPrinterModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => scene.clone(true), [scene]);

  return <primitive object={model} />;
}

function ProceduralPrinter({ palette }: { palette: PrinterPalette }) {
  const head = useRef<Group>(null);
  const spool = useRef<Group>(null);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;

    if (head.current) {
      head.current.position.x = Math.sin(time * 0.32) * 0.62;
      head.current.position.z = 0.18 + Math.cos(time * 0.18) * 0.16;
      head.current.position.y = 2.12 + Math.sin(time * 0.6) * 0.012;
    }

    if (spool.current) {
      spool.current.rotation.x += delta * 0.18;
    }
  });

  return (
    <group>
      <Pedestal palette={palette} />
      <PrinterBody palette={palette} />
      <PrintChamber palette={palette} />
      <PrintHead ref={head} palette={palette} />
      <FilamentSpool ref={spool} palette={palette} />
      <ControlPanel palette={palette} />
    </group>
  );
}

function Pedestal({ palette }: { palette: PrinterPalette }) {
  return (
    <group>
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <cylinderGeometry args={[1.98, 2.02, 0.08, 64]} />
        <meshStandardMaterial color={palette.bodyAlt} metalness={0.75} roughness={0.32} />
      </mesh>

      <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.58, 1.62, 96]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.55} toneMapped={false} />
      </mesh>

      <mesh position={[0, 0.036, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.88, 1.9, 96]} />
        <meshBasicMaterial color={palette.accentSoft} transparent opacity={0.24} toneMapped={false} />
      </mesh>
    </group>
  );
}

function PrinterBody({ palette }: { palette: PrinterPalette }) {
  return (
    <group>
      <RoundedBox
        args={[3.34, 0.22, 2.6]}
        radius={0.055}
        smoothness={2}
        position={[0, 0.14, 0]}
      >
        <meshStandardMaterial color={palette.bodyAlt} metalness={0.7} roughness={0.36} />
      </RoundedBox>

      <RoundedBox args={[3.24, 0.6, 2.5]} radius={0.07} smoothness={2} position={[0, 0.52, 0]}>
        <meshStandardMaterial color={palette.body} metalness={0.62} roughness={0.3} />
      </RoundedBox>

      <RoundedBox args={[3.02, 0.12, 2.32]} radius={0.03} smoothness={2} position={[0, 0.87, 0]}>
        <meshStandardMaterial color={palette.darkMetal} metalness={0.68} roughness={0.28} />
      </RoundedBox>

      <mesh position={[0, 0.72, 1.256]}>
        <boxGeometry args={[2.62, 0.018, 0.012]} />
        <meshBasicMaterial color={palette.accent} toneMapped={false} />
      </mesh>

      {[-1.46, 1.46].map((x) => (
        <RoundedBox
          key={`handle-${x}`}
          args={[0.06, 0.2, 0.62]}
          radius={0.025}
          smoothness={2}
          position={[x, 0.52, 0.1]}
        >
          <meshStandardMaterial color={palette.metal} metalness={0.86} roughness={0.24} />
        </RoundedBox>
      ))}

      {[
        [-1.35, -1.02],
        [1.35, -1.02],
        [-1.35, 1.02],
        [1.35, 1.02],
      ].map(([x, z]) => (
        <mesh key={`foot-${x}-${z}`} position={[x, 0.045, z]}>
          <cylinderGeometry args={[0.13, 0.15, 0.09, 20]} />
          <meshStandardMaterial color={palette.darkMetal} metalness={0.6} roughness={0.42} />
        </mesh>
      ))}
    </group>
  );
}

function PrintChamber({ palette }: { palette: PrinterPalette }) {
  const posts: Array<[number, number]> = [
    [-1.4, -1.14],
    [1.4, -1.14],
    [-1.4, 1.14],
    [1.4, 1.14],
  ];

  return (
    <group>
      <RoundedBox args={[2.84, 1.46, 0.055]} radius={0.02} smoothness={2} position={[0, 1.84, -1.14]}>
        <meshStandardMaterial color={palette.bodyAlt} metalness={0.5} roughness={0.5} />
      </RoundedBox>

      <RoundedBox args={[2.7, 1.4, 0.028]} radius={0.015} smoothness={2} position={[0, 1.84, 1.155]}>
        <meshPhysicalMaterial
          color={palette.glass}
          transparent
          opacity={0.16}
          roughness={0.06}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.08}
          depthWrite={false}
        />
      </RoundedBox>

      {[-1.38, 1.38].map((x) => (
        <RoundedBox
          key={`side-glass-${x}`}
          args={[0.026, 1.4, 2.1]}
          radius={0.012}
          smoothness={2}
          position={[x, 1.84, 0]}
        >
          <meshPhysicalMaterial
            color={palette.glass}
            transparent
            opacity={0.1}
            roughness={0.08}
            metalness={0}
            clearcoat={1}
            depthWrite={false}
          />
        </RoundedBox>
      ))}

      {posts.map(([x, z]) => (
        <RoundedBox
          key={`post-${x}-${z}`}
          args={[0.075, 1.56, 0.075]}
          radius={0.018}
          smoothness={2}
          position={[x, 1.84, z]}
        >
          <meshStandardMaterial color={palette.metal} metalness={0.88} roughness={0.22} />
        </RoundedBox>
      ))}

      {[-1.14, 1.14].map((z) => (
        <group key={`horizontal-frame-${z}`}>
          <RoundedBox
            args={[2.86, 0.075, 0.075]}
            radius={0.018}
            smoothness={2}
            position={[0, 1.08, z]}
          >
            <meshStandardMaterial color={palette.metal} metalness={0.88} roughness={0.22} />
          </RoundedBox>
          <RoundedBox
            args={[2.86, 0.075, 0.075]}
            radius={0.018}
            smoothness={2}
            position={[0, 2.6, z]}
          >
            <meshStandardMaterial color={palette.metal} metalness={0.88} roughness={0.22} />
          </RoundedBox>
        </group>
      ))}

      {[-1.38, 1.38].map((x) => (
        <RoundedBox
          key={`top-side-${x}`}
          args={[0.075, 0.075, 2.28]}
          radius={0.018}
          smoothness={2}
          position={[x, 2.6, 0]}
        >
          <meshStandardMaterial color={palette.metal} metalness={0.88} roughness={0.22} />
        </RoundedBox>
      ))}

      <RoundedBox args={[3.04, 0.18, 2.38]} radius={0.05} smoothness={2} position={[0, 2.72, 0]}>
        <meshStandardMaterial color={palette.body} metalness={0.64} roughness={0.3} />
      </RoundedBox>

      <RoundedBox args={[2.42, 0.09, 1.82]} radius={0.03} smoothness={2} position={[0, 2.84, 0]}>
        <meshStandardMaterial color={palette.darkMetal} metalness={0.7} roughness={0.28} />
      </RoundedBox>

      {[-0.72, -0.36, 0, 0.36, 0.72].map((x) => (
        <mesh key={`vent-${x}`} position={[x, 2.89, 0.2]}>
          <boxGeometry args={[0.08, 0.012, 1.18]} />
          <meshStandardMaterial color={palette.bodyAlt} metalness={0.4} roughness={0.7} />
        </mesh>
      ))}

      <mesh position={[0, 2.81, 1.195]}>
        <boxGeometry args={[2.7, 0.012, 0.012]} />
        <meshBasicMaterial color={palette.accent} toneMapped={false} />
      </mesh>

      <BuildPlate palette={palette} />
      <Gantry palette={palette} />
      <InteriorLight palette={palette} />
    </group>
  );
}

function BuildPlate({ palette }: { palette: PrinterPalette }) {
  return (
    <group>
      <RoundedBox args={[1.92, 0.055, 1.66]} radius={0.025} smoothness={2} position={[0, 1.24, 0]}>
        <meshStandardMaterial color={palette.darkMetal} metalness={0.55} roughness={0.45} />
      </RoundedBox>

      <mesh position={[0, 1.27, 0]}>
        <boxGeometry args={[1.74, 0.012, 1.48]} />
        <meshStandardMaterial color={palette.metal} metalness={0.5} roughness={0.55} />
      </mesh>

      {Array.from({ length: 12 }).map((_, index) => {
        const size = 0.68 - index * 0.012;
        return (
          <mesh key={`layer-${index}`} position={[0, 1.3 + index * 0.026, 0]}>
            <boxGeometry args={[size, 0.02, size * 0.82]} />
            <meshStandardMaterial
              color={palette.print}
              metalness={0.32}
              roughness={0.38}
              emissive={palette.accent}
              emissiveIntensity={0.1}
            />
          </mesh>
        );
      })}

      <mesh position={[0, 1.615, 0]}>
        <cylinderGeometry args={[0.19, 0.23, 0.04, 24]} />
        <meshStandardMaterial
          color={palette.accentSoft}
          metalness={0.35}
          roughness={0.3}
          emissive={palette.accent}
          emissiveIntensity={0.18}
        />
      </mesh>
    </group>
  );
}

function Gantry({ palette }: { palette: PrinterPalette }) {
  return (
    <group>
      {[-0.62, 0.62].map((z) => (
        <mesh key={`rail-${z}`} position={[0, 2.24, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.034, 0.034, 2.62, 14]} />
          <meshStandardMaterial color={palette.metal} metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      <mesh position={[1.18, 2.24, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.24, 12]} />
        <meshStandardMaterial color={palette.metal} metalness={0.9} roughness={0.2} />
      </mesh>

      <mesh position={[-1.18, 2.24, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.24, 12]} />
        <meshStandardMaterial color={palette.metal} metalness={0.9} roughness={0.2} />
      </mesh>

      <mesh position={[0, 2.38, -0.62]}>
        <boxGeometry args={[2.4, 0.03, 0.02]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.5} toneMapped={false} />
      </mesh>
    </group>
  );
}

function PrintHead({
  ref,
  palette,
}: {
  ref: React.RefObject<Group | null>;
  palette: PrinterPalette;
}) {
  return (
    <group ref={ref} position={[0, 2.12, 0.18]}>
      <RoundedBox args={[0.26, 0.2, 0.26]} radius={0.035} smoothness={2}>
        <meshStandardMaterial color={palette.darkMetal} metalness={0.72} roughness={0.28} />
      </RoundedBox>

      <mesh position={[0, -0.14, 0]}>
        <cylinderGeometry args={[0.035, 0.08, 0.14, 16]} />
        <meshStandardMaterial color={palette.metal} metalness={0.92} roughness={0.18} />
      </mesh>

      <mesh position={[0, -0.215, 0]}>
        <coneGeometry args={[0.025, 0.07, 12]} />
        <meshBasicMaterial color={palette.accent} toneMapped={false} />
      </mesh>

      <mesh position={[0.17, 0.01, 0]}>
        <boxGeometry args={[0.08, 0.04, 0.16]} />
        <meshBasicMaterial color={palette.screen} toneMapped={false} />
      </mesh>
    </group>
  );
}

function FilamentSpool({
  ref,
  palette,
}: {
  ref: React.RefObject<Group | null>;
  palette: PrinterPalette;
}) {
  return (
    <group ref={ref} position={[-1.92, 1.9, -0.24]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.14, 0.14, 0.2, 20]} />
        <meshStandardMaterial color={palette.darkMetal} metalness={0.7} roughness={0.35} />
      </mesh>

      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.34, 0.1, 10, 32]} />
        <meshStandardMaterial
          color={palette.print}
          metalness={0.25}
          roughness={0.5}
          emissive={palette.accentSoft}
          emissiveIntensity={0.08}
        />
      </mesh>

      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.34, 0.012, 6, 32]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.5} toneMapped={false} />
      </mesh>

      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[0.1, 0.12, 0.08]} />
        <meshStandardMaterial color={palette.metal} metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  );
}

function ControlPanel({ palette }: { palette: PrinterPalette }) {
  return (
    <group position={[0.92, 0.52, 1.272]}>
      <RoundedBox args={[0.72, 0.3, 0.035]} radius={0.025} smoothness={2}>
        <meshStandardMaterial color={palette.bodyAlt} metalness={0.5} roughness={0.42} />
      </RoundedBox>

      <mesh position={[-0.13, 0.01, 0.022]}>
        <boxGeometry args={[0.3, 0.17, 0.012]} />
        <meshBasicMaterial color={palette.screen} toneMapped={false} />
      </mesh>

      <mesh position={[-0.13, 0.01, 0.029]}>
        <boxGeometry args={[0.22, 0.012, 0.008]} />
        <meshBasicMaterial color={palette.bodyAlt} toneMapped={false} />
      </mesh>

      {[0.16, 0.24, 0.32].map((x) => (
        <mesh key={`button-${x}`} position={[x, 0.01, 0.028]}>
          <cylinderGeometry args={[0.022, 0.022, 0.018, 16]} />
          <meshStandardMaterial
            color={palette.metal}
            metalness={0.7}
            roughness={0.3}
            emissive={palette.accent}
            emissiveIntensity={x === 0.32 ? 0.4 : 0}
          />
        </mesh>
      ))}
    </group>
  );
}

function InteriorLight({ palette }: { palette: PrinterPalette }) {
  return (
    <group>
      <mesh position={[0, 2.54, 0.9]}>
        <boxGeometry args={[2.34, 0.018, 0.02]} />
        <meshBasicMaterial color={palette.accent} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 2.32, 0.2]} intensity={1.1} distance={3.2} color={palette.accent} />
    </group>
  );
}
