/**
 * Generates `public/images/og-default.png` (1200×630) from the approved Tello
 * logo and the existing storefront illustration.
 *
 * Run with: node scripts/generate-og-image.mjs
 * Requires `sharp` (already available through the project's dependencies).
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const outputPath = path.join(root, "public", "images", "og-default.png");

const width = 1200;
const height = 630;

const logo = await sharp(path.join(root, "public", "images", "logo-tello.png"))
  .resize({ width: 520 })
  .png()
  .toBuffer();

const artwork = await sharp(path.join(root, "public", "images", "printing-equipment.svg"))
  .resize({ width: 470, height: 360, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const background = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fffdfb"/>
      <stop offset="1" stop-color="#f1e8df"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect x="0" y="0" width="14" height="${height}" fill="#cc1e5d"/>
  <circle cx="1120" cy="70" r="190" fill="#cc1e5d" opacity="0.06"/>
  <circle cx="70" cy="610" r="150" fill="#cc1e5d" opacity="0.05"/>
  <rect x="628" y="118" width="500" height="394" rx="28" fill="#ffffff" opacity="0.74"/>
  <rect x="628" y="118" width="500" height="394" rx="28" fill="none" stroke="#e5d9cd" stroke-width="2"/>
  <rect x="90" y="382" width="120" height="8" rx="4" fill="#cc1e5d"/>
  <text x="90" y="446" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#3f3a38">Printing equipment &amp; supplies</text>
</svg>`);

await mkdir(path.dirname(outputPath), { recursive: true });

await sharp(background)
  .composite([
    { input: logo, left: 80, top: 262 },
    { input: artwork, left: 643, top: 135 },
  ])
  .png({ compressionLevel: 9 })
  .toFile(outputPath);

console.log(`Wrote ${path.relative(root, outputPath)}`);
