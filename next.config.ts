import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

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
      ...(apiOrigin !== null
        ? [
            {
              urlPattern: ({ url }: { url: URL }) =>
                url.origin === apiOrigin && url.pathname.startsWith("/api/"),
              handler: "NetworkOnly" as const,
            },
          ]
        : []),
    ],
  },
});

export default withPWA(nextConfig);
