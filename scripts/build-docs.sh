#!/usr/bin/env bash
# =====================================================================
# build-docs.sh — membangun aset untuk situs statis di docs/
# (dipakai oleh GitHub Pages: https://app.syifanur.my.id)
#
# Yang dilakukan:
#   1. pasang Tailwind CLI (sekali saja, ke docs-src/node_modules)
#   2. compile docs-src/app.css -> docs/assets/app.css (minified)
#
# Font dan ikon sudah tersimpan di docs/assets sehingga situs tidak
# bergantung pada CDN pihak ketiga.
#
# Cara pakai:
#   bash scripts/build-docs.sh
# Prasyarat: Node.js 18+ (npm). Tidak perlu PHP, Docker, atau database.
# =====================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$ROOT/docs-src"
OUT="$ROOT/docs/assets/app.css"

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: Node.js/npm tidak ditemukan. Pasang Node.js 18+ lalu ulangi." >&2
  exit 1
fi

cd "$SRC_DIR"

if [ ! -d node_modules ]; then
  echo "==> Memasang Tailwind CLI (sekali saja)"
  npm install --no-audit --no-fund --silent
fi

echo "==> Compile Tailwind CSS"
npx --no-install tailwindcss -i "$SRC_DIR/app.css" -o "$OUT" --minify

if [ -s "$OUT" ]; then
  echo "OK: $(wc -c < "$OUT") byte -> docs/assets/app.css"
else
  echo "ERROR: hasil build kosong." >&2
  exit 1
fi
