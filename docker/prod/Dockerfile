# syntax=docker/dockerfile:1
# =====================================================================
# Image produksi untuk WebCraft Agency (Laravel 13 / PHP 8.3)
# Isi 1 container: nginx (web server) + php-fpm (pemroses PHP)
# Diatur oleh supervisord agar kalau salah satu mati, otomatis hidup lagi.
# =====================================================================
FROM php:8.3-fpm-alpine AS runtime

ENV APP_ENV=production \
    APP_DEBUG=false \
    COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_NO_INTERACTION=1

# ---------------------------------------------------------------------
# 1. Paket sistem + ekstensi PHP yang dipakai Laravel & PostgreSQL
# ---------------------------------------------------------------------
RUN set -eux; \
    apk add --no-cache \
        nginx \
        supervisor \
        curl \
        postgresql-client \
        libzip libpng libjpeg-turbo freetype oniguruma icu-libs \
        postgresql-dev libzip-dev libpng-dev libjpeg-turbo-dev freetype-dev oniguruma-dev icu-dev; \
    docker-php-ext-configure gd --with-freetype --with-jpeg; \
    docker-php-ext-install -j"$(nproc)" \
        pdo pdo_pgsql pdo_mysql mbstring zip gd bcmath opcache pcntl; \
    apk del --no-network \
        postgresql-dev libzip-dev libpng-dev libjpeg-turbo-dev freetype-dev oniguruma-dev icu-dev; \
    rm -rf /var/cache/apk/* /tmp/*

# ---------------------------------------------------------------------
# 2. Konfigurasi nginx, PHP, dan supervisord
# ---------------------------------------------------------------------
COPY docker/prod/nginx.conf /etc/nginx/nginx.conf
COPY docker/prod/php.ini /usr/local/etc/php/conf.d/zz-app.ini
COPY docker/prod/supervisord.conf /etc/supervisor/conf.d/app.conf
COPY docker/prod/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Halaman cadangan bila aplikasi sedang mati (bukan 502 polos)
COPY docker/prod/offline.html /usr/share/nginx/html/offline.html

WORKDIR /var/www/html

# ---------------------------------------------------------------------
# 3. Composer + dependency aplikasi (layer dipisah supaya build cepat)
# ---------------------------------------------------------------------
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY composer.json composer.lock ./
RUN composer install \
        --no-dev \
        --no-scripts \
        --no-autoloader \
        --prefer-dist \
        --no-progress \
        --no-interaction

COPY . .

# ---------------------------------------------------------------------
# 4. Autoloader produksi + siapkan folder yang harus bisa ditulis
# ---------------------------------------------------------------------
RUN composer dump-autoload --optimize --no-dev --no-interaction --no-scripts \
    && mkdir -p \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        storage/app/public \
        bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwX storage bootstrap/cache

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
    CMD curl -fsS http://127.0.0.1:8080/up || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
