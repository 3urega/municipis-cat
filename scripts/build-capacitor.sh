#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# lightningcss (Tailwind 4) inclou binaris opcionals per SO. Si npm install es va fer
# a Windows i aquest script corre a WSL, falta lightningcss-linux-* i el build falla.
if [[ "$(uname -s)" == "Linux" ]] && [[ -d "$ROOT/node_modules/lightningcss" ]]; then
  shopt -s nullglob
  linux_lc=("$ROOT/node_modules"/lightningcss-linux-*)
  shopt -u nullglob
  if [[ ${#linux_lc[@]} -eq 0 ]]; then
    echo "Error: node_modules no té lightningcss per a Linux (WSL)."
    echo "Solució des de WSL, a la carpeta del projecte:"
    echo "  rm -rf node_modules && npm install"
    echo "Després torna a executar build:capacitor. Alternativa: fer npm install i el build només a Windows (sense WSL)."
    exit 1
  fi
fi
API_DIR="$ROOT/src/app/api"
STASH_DIR="$ROOT/.api-server-only-stash"
if [[ -e "$STASH_DIR" ]]; then
  echo "Estat inconsistent: elimina $STASH_DIR i torna-ho a provar."
  exit 1
fi
restore() {
  if [[ -d "$STASH_DIR" ]]; then
    rm -rf "$API_DIR"
    mv "$STASH_DIR" "$API_DIR"
  fi
}
trap restore EXIT
mv "$API_DIR" "$STASH_DIR"
export CAPACITOR_STATIC=1
if [[ -z "${NEXT_PUBLIC_API_URL:-}" ]]; then
  echo "Avís: NEXT_PUBLIC_API_URL no està definit. L’app Capacitor necessita l’URL del backend (Railway), p. ex.:"
  echo "  NEXT_PUBLIC_API_URL=https://el-teu-projecte.up.railway.app npm run build:capacitor"
fi
npm run build
npx cap sync
