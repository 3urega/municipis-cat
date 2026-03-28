export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { loadProjectEnv } = await import("./lib/loadProjectEnv");
    loadProjectEnv();
    const authSecretTrimmed = process.env.AUTH_SECRET?.trim() ?? "";
    if (process.env.NODE_ENV === "production" && authSecretTrimmed.length === 0) {
      console.error(
        "[catalunya-map] AUTH_SECRET és buit en producció. Defineix-lo a les variables d’entorn (vegeu .env.example).",
      );
    }

    if (process.env.NODE_ENV === "production") {
      const { useAuthCrossSiteSessionCookies } = await import(
        "./lib/authCrossSiteCookies"
      );
      const dbUrl = process.env.DATABASE_URL?.trim() ?? "";
      const directUrl = process.env.DIRECT_URL?.trim() ?? "";
      const needsDirectUrl =
        dbUrl.startsWith("prisma+") ||
        dbUrl.startsWith("prisma://");
      const authUrl = (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "")
        .trim();
      const wantsCross =
        process.env.AUTH_CROSS_SITE_COOKIES === "true";
      const crossActive = useAuthCrossSiteSessionCookies();
      if (wantsCross && !crossActive) {
        console.warn(
          "[catalunya-map] AUTH_CROSS_SITE_COOKIES=true però cookies cross-site desactivades (vegeu authCrossSiteCookies.ts). Per hosting propi sense Railway/Vercel: AUTH_URL o NEXT_PUBLIC_API_URL en https://, o AUTH_ASSUME_PUBLIC_HTTPS=true.",
        );
      }
      console.info("[catalunya-map] Boot (producció, sense valors secrets):", {
        AUTH_SECRET: authSecretTrimmed.length > 0 ? "definit" : "FALTA — /api/auth/* retornarà 500",
        AUTH_URL: authUrl.length > 0 ? "definit" : "absent (trustHost pot bastar)",
        AUTH_CROSS_SITE_COOKIES: wantsCross ? "true" : "false",
        AUTH_COOKIE_CROSS_SITE_ACTIVE: crossActive ? "true" : "false",
        RAILWAY_OR_VERCEL_HOST:
          process.env.RAILWAY_ENVIRONMENT !== undefined ||
          process.env.VERCEL === "1"
            ? "true"
            : "false",
        AUTH_ALLOW_CREDENTIALS:
          process.env.AUTH_ALLOW_CREDENTIALS === "true" ? "true" : "absent/false",
        DATABASE_URL: dbUrl.length > 0 ? "definit" : "FALTA",
        DIRECT_URL:
          directUrl.length > 0
            ? "definit"
            : needsDirectUrl
              ? "FALTA — amb prisma+ cal DIRECT_URL postgresql:// per a l’API"
              : "opcional",
      });
    }
  }
}
