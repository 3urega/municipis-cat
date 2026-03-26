import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "@prisma/client", "@prisma/adapter-pg"],
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      /**
       * Evita `no-response` del NetworkFirst per defecte en GET /api/ quan no hi ha
       * cache o no hi ha xarxa. Tot el trànsit API ha d’anar sempre a xarxa (PWA).
       */
      {
        urlPattern: ({ url, sameOrigin }) =>
          sameOrigin && url.pathname.startsWith("/api/"),
        handler: "NetworkOnly",
      },
    ],
  },
});

export default withPWA(nextConfig);
