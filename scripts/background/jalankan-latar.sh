#!/usr/bin/env bash
# =====================================================================
# jalankan-latar.sh — menjalankan aplikasi Laravel terus-menerus di
# latar belakang TANPA Docker.
#
# Cocok untuk: VPS Linux, server sekolah/kantor, Termux di Android,
#              laptop yang ditinggal menyala.
#
# Contoh:
#   bash scripts/background/jalankan-latar.sh start
#   bash scripts/background/jalankan-latar.sh start --port 8080 --workers 2
#   bash scripts/background/jalankan-latar.sh status
#   bash scripts/background/jalankan-latar.sh stop
#   bash scripts/background/jalankan-latar.sh logs
#
# Yang dijalankan:
#   * php artisan serve (web)  -> PID disimpan di storage/framework/run/web.pid
#   * php artisan queue:work   -> PID disimpan di storage/framework/run/queue.pid
# Keduanya diawasi loop watchdog: kalau mati, otomatis dinyalakan lagi.
#
# Supaya ikut hidup saat server reboot, jalankan sekali:
#   bash scripts/background/jalankan-latar.sh autostart
# (memasang entri cron @reboot untuk user saat ini; tidak perlu root)
# =====================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUN_DIR="$ROOT/storage/framework/run"
LOG_DIR="$ROOT/storage/logs"
WEB_PID="$RUN_DIR/web.pid"
QUEUE_PID="$RUN_DIR/queue.pid"
WATCH_PID="$RUN_DIR/watchdog.pid"
PORT="${PORT:-8000}"
WORKERS="${WEB_CONCURRENCY:-1}"
HOST="${HOST:-0.0.0.0}"
SELF="$ROOT/scripts/background/jalankan-latar.sh"

c() { printf '\033[%sm%s\033[0m\n' "$1" "$2"; }
step() { echo; c '36' "==> $*"; }
ok() { c '32' "    [OK] $*"; }
warn() { c '33' "    [!!] $*"; }
bad() { c '31' "    [XX] $*"; }

require_php() {
  if ! command -v php >/dev/null 2>&1; then
    bad "PHP tidak ditemukan. Pasang PHP 8.2+ dulu (contoh: pkg install php di Termux, atau sudo apt install php-cli php-sqlite3)."
    exit 1
  fi
}

alive() { [ -f "$1" ] && kill -0 "$(cat "$1" 2>/dev/null)" 2>/dev/null; }

prepare() {
  mkdir -p "$RUN_DIR" "$LOG_DIR" "$ROOT/storage/framework/cache/data" \
           "$ROOT/storage/framework/sessions" "$ROOT/storage/framework/views" \
           "$ROOT/storage/app/public" "$ROOT/database"

  if [ ! -f "$ROOT/.env" ]; then
    cp "$ROOT/.env.example" "$ROOT/.env"
    c '33' "    .env dibuat dari .env.example — silakan sesuaikan bila perlu."
  fi

  # Database SQLite tanpa server (paling tahan lama: satu file, gampang dibackup)
  if ! grep -q '^DB_CONNECTION=sqlite' "$ROOT/.env" 2>/dev/null; then
    warn "DB_CONNECTION di .env bukan sqlite. Script ini mengasumsikan SQLite."
    warn "Untuk MySQL/PostgreSQL, pastikan servernya otomatis hidup juga."
  fi
  [ -f "$ROOT/database/database.sqlite" ] || : > "$ROOT/database/database.sqlite"

  if [ ! -d "$ROOT/vendor" ]; then
    if command -v composer >/dev/null 2>&1; then
      step "Memasang dependency (composer install)"
      (cd "$ROOT" && composer install --no-interaction --prefer-dist --no-progress)
    else
      bad "Folder vendor/ belum ada dan composer tidak ditemukan. Pasang composer dulu."
      exit 1
    fi
  fi

  (cd "$ROOT" && php artisan key:generate --force >/dev/null 2>&1 || true)
  (cd "$ROOT" && php artisan migrate --force --no-interaction >/dev/null 2>&1 || warn "Migrasi gagal/dilewati.")
  (cd "$ROOT" && php artisan storage:link >/dev/null 2>&1 || true)
}

start_web() {
  if alive "$WEB_PID"; then ok "Web sudah jalan (PID $(cat "$WEB_PID"))"; return; fi
  nohup php -S "$HOST:$PORT" -t "$ROOT/public" "$ROOT/public/index.php" \
      >> "$LOG_DIR/web.log" 2>&1 &
  echo $! > "$WEB_PID"
  ok "Web dinyalakan di http://$HOST:$PORT (PID $(cat "$WEB_PID"))"
}

start_queue() {
  if alive "$QUEUE_PID"; then ok "Queue sudah jalan (PID $(cat "$QUEUE_PID"))"; return; fi
  nohup php "$ROOT/artisan" queue:work --sleep=3 --tries=3 --max-time=3600 \
      >> "$LOG_DIR/queue.log" 2>&1 &
  echo $! > "$QUEUE_PID"
  ok "Queue worker dinyalakan (PID $(cat "$QUEUE_PID"))"
}

start_watchdog() {
  if alive "$WATCH_PID"; then ok "Watchdog sudah aktif (PID $(cat "$WATCH_PID"))"; return; fi
  nohup bash "$SELF" __watch >> "$LOG_DIR/watchdog.log" 2>&1 &
  echo $! > "$WATCH_PID"
  ok "Watchdog aktif (PID $(cat "$WATCH_PID")) — proses mati akan dihidupkan ulang otomatis."
}

stop_all() {
  step "Menghentikan proses"
  for f in "$WATCH_PID" "$QUEUE_PID" "$WEB_PID"; do
    if alive "$f"; then
      kill "$(cat "$f")" 2>/dev/null || true
      ok "Dihentikan: $(basename "$f")"
    fi
    rm -f "$f"
  done
  # sisa proses artisan serve / queue dari sesi lama
  pkill -f "$ROOT/artisan queue:work" 2>/dev/null || true
  pkill -f "php -S .*:$PORT" 2>/dev/null || true
}

status_all() {
  step "Status"
  if alive "$WEB_PID"; then ok "Web     : jalan (PID $(cat "$WEB_PID"))"; else warn "Web     : mati"; fi
  if alive "$QUEUE_PID"; then ok "Queue   : jalan (PID $(cat "$QUEUE_PID"))"; else warn "Queue   : mati"; fi
  if alive "$WATCH_PID"; then ok "Watchdog: jalan (PID $(cat "$WATCH_PID"))"; else warn "Watchdog: mati"; fi
  if command -v curl >/dev/null 2>&1; then
    if curl -fsS "http://127.0.0.1:$PORT/up" >/dev/null 2>&1; then
      ok "Health  : /up menjawab 200 di port $PORT"
    else
      warn "Health  : /up belum menjawab di port $PORT (mungkin masih start)"
    fi
  fi
}

watch_loop() {
  trap 'exit 0' TERM INT
  while true; do
    alive "$WEB_PID" || start_web >/dev/null 2>&1
    alive "$QUEUE_PID" || start_queue >/dev/null 2>&1
    sleep 20
  done
}

autostart_cron() {
  step "Memasang autostart (cron @reboot)"
  local line="@reboot /bin/bash $SELF start >/dev/null 2>&1"
  if crontab -l 2>/dev/null | grep -qF "$SELF start"; then
    ok "Autostart sudah terpasang."
  else
    ( crontab -l 2>/dev/null; echo "$line" ) | crontab -
    ok "Autostart ditambahkan ke crontab."
  fi
  c '33' "    Catatan Termux/Android: cron tidak tersedia. Pakai Termux:Boot +"
  c '33' "    skrip scripts/background/termux-boot.sh (lihat docs/DEPLOY-TANPA-DOCKER.md)."
}

CMD="${1:-start}"
shift || true
while [ $# -gt 0 ]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    --workers) WORKERS="$2"; shift 2 ;;
    --host) HOST="$2"; shift 2 ;;
    *) warn "Opsi tidak dikenal: $1"; shift ;;
  esac
done

case "$CMD" in
  __watch) watch_loop ;;
  start)
    require_php; prepare
    step "Menyalakan aplikasi di latar belakang"
    start_web; start_queue; start_watchdog
    sleep 2
    status_all
    echo
    c '32' "Selesai. Buka http://127.0.0.1:$PORT"
    c '33' "Agar domain publik mengarah ke sini, sambungkan Cloudflare Tunnel (lihat docs/DEPLOY-TANPA-DOCKER.md)."
    ;;
  stop) stop_all ;;
  restart) stop_all; require_php; prepare; start_web; start_queue; start_watchdog; status_all ;;
  status) status_all ;;
  logs) tail -n 120 -f "$LOG_DIR/web.log" "$LOG_DIR/watchdog.log" 2>/dev/null || true ;;
  autostart) autostart_cron ;;
  *)
    echo "Pakai: $0 {start|stop|restart|status|logs|autostart}"
    exit 1
    ;;
esac
