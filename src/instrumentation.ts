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
      const dbUrl = process.env.DATABASE_URL?.trim() ?? "";
      const directUrl = process.env.DIRECT_URL?.trim() ?? "";
      const needsDirectUrl =
        dbUrl.startsWith("prisma+") ||
        dbUrl.startsWith("prisma://");
      console.info("[catalunya-map] Boot (producció, sense valors secrets):", {
        AUTH_SECRET:
          authSecretTrimmed.length > 0
            ? "definit"
            : "FALTA — JWT i login no funcionaran",
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
