#!/usr/bin/env bash
# =====================================================================
# termux-boot.sh — untuk Android (Termux).
#
# Android mematikan aplikasi latar belakang untuk menghemat baterai,
# jadi butuh dua hal:
#   1. termux-boot.sh  : dipanggil Termux:Boot saat HP menyala.
#   2. wake-lock       : supaya Android tidak "tidur-lelap-kan" Termux.
#
# Cara pasang (sekali saja):
#   pkg install termux-api termux-tools
#   mkdir -p ~/.termux/boot
#   cp scripts/background/termux-boot.sh ~/.termux/boot/01-webcraft.sh
#   chmod +x ~/.termux/boot/01-webcraft.sh
#   # lalu install app "Termux:Boot" dari F-Droid dan buka sekali.
#   termux-wake-lock
#
# Sesuaikan WEBROOT di bawah dengan lokasi repo di HP Anda.
# =====================================================================
set -euo pipefail

WEBROOT="${WEBROOT:-$HOME/ghani-jasa-secsion}"
PORT="${PORT:-8000}"

cd "$WEBROOT" || exit 1

# Jangan biarkan Android mematikan proses saat layar mati
command -v termux-wake-lock >/dev/null 2>&1 && termux-wake-lock || true

# Nyalakan web + queue + watchdog
PORT="$PORT" bash scripts/background/jalankan-latar.sh start >> "$WEBROOT/storage/logs/boot.log" 2>&1

# Opsional: tunnel Cloudflare (tanpa Docker). Butuh cloudflared untuk Termux.
if command -v cloudflared >/dev/null 2>&1 && [ -n "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]; then
  pgrep -f "cloudflared.*tunnel" >/dev/null 2>&1 || \
    nohup cloudflared tunnel --no-autoupdate run --token "$CLOUDFLARE_TUNNEL_TOKEN" \
      >> "$WEBROOT/storage/logs/tunnel.log" 2>&1 &
fi
