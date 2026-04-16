/**
 * Executa el build d’export Capacitor després de carregar variables d’entorn per al bundle.
 *
 * Ordre de càrrega (cada nivell pot sobreescriure l’anterior):
 *   1) `.env` (si existeix)
 *   2) `.env.capacitor.production` (si existeix) — recomanat per a valors NEXT_PUBLIC_* de producció
 *
 * Copia `scripts/capacitor-build.env.example` → arrel del repo com a `.env.capacitor.production`.
 */
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const pathLocal = resolve(root, ".env");
const pathCapProd = resolve(root, ".env.capacitor.production");

if (existsSync(pathLocal)) {
  config({ path: pathLocal });
}

if (existsSync(pathCapProd)) {
  config({ path: pathCapProd, override: true });
  console.info("[capacitor-build] Variables carregades des de:", pathCapProd);
} else {
  console.warn(
    "[capacitor-build] No hi ha `.env.capacitor.production` — s’usen només `.env` (si n’hi ha) i l’entorn del sistema.",
  );
  console.warn(
    "  Per definir totes les NEXT_PUBLIC_* de producció en un sol lloc: copia `scripts/capacitor-build.env.example` → `.env.capacitor.production`.",
  );
}

const isWin = process.platform === "win32";
const cmd = isWin ? "powershell" : "bash";
const args = isWin
  ? [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      resolve(root, "scripts/build-capacitor.ps1"),
    ]
  : [resolve(root, "scripts/build-capacitor.sh")];

const result = spawnSync(cmd, args, {
  cwd: root,
  env: process.env,
  stdio: "inherit",
  shell: false,
});

process.exit(result.status === null ? 1 : result.status);
