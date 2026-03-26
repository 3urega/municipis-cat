import { mkdir } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

function svgIcon(size: number): string {
  const r = Math.round(size * 0.2);
  const fs = Math.round(size * 0.22);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${String(size)}" height="${String(size)}" viewBox="0 0 ${String(size)} ${String(size)}">
  <rect fill="#18181b" width="${String(size)}" height="${String(size)}" rx="${String(r)}"/>
  <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="#fafafa" font-family="system-ui,sans-serif" font-size="${String(fs)}" font-weight="700">CM</text>
</svg>`;
}

/** Marge extra per propòsit maskable (zona segura ~80%). */
function svgMaskable(size: number): string {
  const pad = Math.round(size * 0.12);
  const inner = size - 2 * pad;
  const r = Math.round(inner * 0.2);
  const fs = Math.round(inner * 0.22);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${String(size)}" height="${String(size)}" viewBox="0 0 ${String(size)} ${String(size)}">
  <rect fill="#18181b" width="${String(size)}" height="${String(size)}"/>
  <rect fill="#27272a" x="${String(pad)}" y="${String(pad)}" width="${String(inner)}" height="${String(inner)}" rx="${String(r)}"/>
  <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="#fafafa" font-family="system-ui,sans-serif" font-size="${String(fs)}" font-weight="700">CM</text>
</svg>`;
}

async function main(): Promise<void> {
  const publicDir = path.join(process.cwd(), "public", "icons");
  await mkdir(publicDir, { recursive: true });

  for (const dim of [192, 512] as const) {
    const file = dim === 192 ? "icon-192.png" : "icon-512.png";
    await sharp(Buffer.from(svgIcon(dim)))
      .png()
      .toFile(path.join(publicDir, file));
  }

  await sharp(Buffer.from(svgMaskable(512)))
    .png()
    .toFile(path.join(publicDir, "maskable-512.png"));

  console.log("PWA icons written to public/icons/");
}

void main();
