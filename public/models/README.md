# Hero 3D assets

This directory is the dedicated home for the homepage hero 3D asset and its
static poster.

## Current implementation

The hero ships with an **original procedural model** built from Three.js
primitives in `src/components/3d/printer-model.tsx`. It is a stylized,
recognizable enclosed desktop printer — not a reproduction of any commercial
product. No copyrighted or third-party model data is included.

The procedural approach was chosen deliberately:

- no network request and no GLB download on the critical path;
- very low polygon count;
- no texture memory;
- no licensing ambiguity;
- the scene still degrades to the poster when WebGL is unavailable.

## Replacing it with a licensed GLB

1. Obtain a model you are licensed to use (your own scan/render or a model with
   an explicit commercial license).
2. Optimize it before committing:
   - target **under 80k triangles** for the hero;
   - apply Draco or Meshopt compression;
   - keep textures at **1K–2K** and export as WebP/KTX2 where supported;
   - remove unused animations, cameras and lights;
   - keep the file **under ~2 MB** if possible.
3. Place the file in this directory, for example `public/models/tello-printer.glb`.
4. Set the public environment variable in `.env.local`:

   ```bash
   NEXT_PUBLIC_HERO_PRINTER_MODEL="/models/tello-printer.glb"
   ```

5. Reload the homepage. `src/components/3d/hero-3d-scene.tsx` passes the URL to
   `PrinterModel`, which loads it with `useGLTF` and renders it inside the same
   lighting, camera, rotation and visibility system. If loading fails, the
   error boundary falls back to the poster.

Keep the model centered at the origin with its base around `y = 0` and a
forward direction of `+Z` so the existing camera and turntable animation work
without changes.

## Poster

`hero-printer-poster.svg` is the static fallback used for:

- mobile and low-memory devices;
- `prefers-reduced-motion: reduce`;
- missing WebGL support;
- WebGL context loss or any runtime error;
- the short period before the lazy scene chunk is ready.

It is an optimized vector asset (about 8 KB), so it does not compete with the
catalog images for bandwidth.
