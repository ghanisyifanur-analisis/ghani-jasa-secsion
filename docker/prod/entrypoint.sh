#!/bin/sh
# =====================================================================
# Titik masuk container: menyiapkan aplikasi lalu menjalankan server.
# Urutan: folder -> APP_KEY -> tunggu DB -> migrasi -> seeder -> cache -> start
# =====================================================================
set -eu

cd /var/www/html

log() { echo "[entrypoint] $*"; }

# 1. Folder yang wajib ada & bisa ditulis
mkdir -p \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    storage/app/public \
    bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache || true

# 2. APP_KEY: kalau kosong, buat sementara supaya aplikasi tetap hidup
if [ -z "${APP_KEY:-}" ]; then
    APP_KEY="base64:$(head -c 32 /dev/urandom | base64 | tr -d '\n')"
    export APP_KEY
    log "PERINGATAN: APP_KEY kosong. Kunci sementara dibuat. Isi APP_KEY di .env.production agar sesi login tidak hilang saat restart."
fi

# 3. Tunggu PostgreSQL siap (maksimal ~90 detik)
log "Menunggu database ${DB_HOST:-db}:${DB_PORT:-5432} ..."
tries=0
until pg_isready -h "${DB_HOST:-db}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME:-webcraft_user}" >/dev/null 2>&1; do
    tries=$((tries + 1))
    if [ "$tries" -ge 45 ]; then
        log "GAGAL: database tidak siap setelah 90 detik."
        exit 1
    fi
    sleep 2
done
log "Database siap."

# 4. Kenali package Laravel (Sanctum, Tinker, dll)
log "Mendaftarkan package Laravel ..."
php artisan package:discover --ansi >/dev/null

# 5. Link storage publik (opsional)
php artisan storage:link >/dev/null 2>&1 || true

# 6. Migrasi tabel
log "Menjalankan migrasi database ..."
php artisan migrate --force --no-interaction

# 7. Data demo (seeder aman diulang: memakai firstOrCreate)
if [ "${SEED_ON_DEPLOY:-false}" = "true" ]; then
    log "Mengisi data contoh (seeder) ..."
    php artisan db:seed --force --no-interaction || log "Seeder dilewati."
fi

# 8. Cache produksi
log "Membangun cache konfigurasi & view ..."
php artisan config:cache >/dev/null
php artisan view:cache >/dev/null

# 9. Pastikan file hasil cache tetap bisa ditulis php-fpm (www-data)
chown -R www-data:www-data storage bootstrap/cache || true

log "Siap menerima request di port 8080."
exec supervisord -c /etc/supervisor/conf.d/app.conf
