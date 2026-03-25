export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { loadProjectEnv } = await import("./lib/loadProjectEnv");
    loadProjectEnv();
  }
}
