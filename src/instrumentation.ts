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
  }
}
