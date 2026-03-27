#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
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
npm run build
npx cap sync
