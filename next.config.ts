import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

/** Auth.js fa `new URL(AUTH_URL | NEXTAUTH_URL)`; sense `https://` peten /api/auth/*. */
function normalizeEnvToAbsoluteUrl(key: string): void {
  const raw = process.env[key]?.trim();
  if (raw === undefined || raw.length === 0) {
    return;
  }
  try {
    const u = new URL(raw);
    if (u.protocol === "http:" || u.protocol === "https:") {
      process.env[key] = u.href.replace(/\/$/, "");
    }
    return;
  } catch {
    try {
      const hostOnly = raw.replace(/\/$/, "");
      process.env[key] = new URL(`https://${hostOnly}`).href.replace(/\/$/, "");
    } catch {
      /* deixem el valor original; altres capes podran mostrar error més clar */
    }
  }
}

for (const key of ["AUTH_URL", "NEXTAUTH_URL", "NEXT_PUBLIC_API_URL"]) {
  normalizeEnvToAbsoluteUrl(key);
}

const isCapacitorStatic = process.env.CAPACITOR_STATIC === "1";

const apiPublicBase = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ?? "";

function apiOriginForWorkbox(): string | null {
  if (apiPublicBase.length === 0) {
    return null;
  }
  try {
    return new URL(apiPublicBase).origin;
  } catch {
    return null;
  }
}

const apiOrigin = apiOriginForWorkbox();

/** Per workbox: no usar variables de closure dins de `urlPattern` (al SW es generen com a `()=>url.origin===apiOrigin` i `apiOrigin` no existe al runtime). */
function escapeRegExpChars(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const apiCrossOriginPattern: RegExp | null =
  apiOrigin !== null
    ? new RegExp(`^${escapeRegExpChars(apiOrigin)}/api/`)
    : null;

const nextConfig: NextConfig = {
  ...(isCapacitorStatic
    ? { output: "export" as const, images: { unoptimized: true } }
    : {}),
  serverExternalPackages: ["pg", "@prisma/client", "@prisma/adapter-pg"],
  env: {
    /** Client next-auth: necessari quan la UI està servida des d’un altre origen (Capacitor). */
    NEXTAUTH_URL:
      process.env.NEXTAUTH_URL?.trim() ||
      apiPublicBase ||
      (process.env.VERCEL_URL !== undefined
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"),
  },
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ url }) =>
          url.hostname === "tile.openstreetmap.org" ||
          url.hostname.endsWith(".tile.openstreetmap.org"),
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "osm-tiles",
          expiration: {
            maxEntries: 80,
            maxAgeSeconds: 60 * 60 * 24 * 7,
          },
        },
      },
      {
        urlPattern: ({ url, sameOrigin }) =>
          sameOrigin &&
          (url.pathname.startsWith("/data/") ||
            url.pathname.endsWith(".geojson") ||
            url.pathname.endsWith("municipi-comarca.json")),
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "catalunya-map-static-geo",
          expiration: {
            maxEntries: 12,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          },
        },
      },
      {
        urlPattern: ({ url, sameOrigin }) =>
          sameOrigin && url.pathname.startsWith("/api/"),
        handler: "NetworkOnly",
      },
      ...(apiCrossOriginPattern !== null
        ? [
            {
              urlPattern: apiCrossOriginPattern,
              handler: "NetworkOnly" as const,
            },
          ]
        : []),
    ],
  },
});

export default withPWA(nextConfig);
