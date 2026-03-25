import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Carrega variables d’entorn com ara Next i molts CLIs:
 * `.env` com a base i després cada fitxer existent sobreescriu (últim guanya).
 * Inclou `.env.dev` si el tens (no el carrega Next per defecte).
 */
export function loadProjectEnv(): void {
  const root = process.cwd();
  const files = [
    ".env",
    ".env.development",
    ".env.dev",
    ".env.local",
  ];
  let anyLoaded = false;
  for (const file of files) {
    const full = path.join(root, file);
    if (!existsSync(full)) {
      continue;
    }
    config({ path: full, override: anyLoaded });
    anyLoaded = true;
  }
}
