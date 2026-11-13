# Tanpa Docker — situs tetap hidup di mana-mana & bertahun-tahun

Panduan ini menjawab tiga permintaan sekaligus:

1. **Bisa diakses di berbagai tempat** (HP, laptop, kantor, luar kota).
2. **Selalu berjalan di latar belakang** (tanpa jendela terminal yang harus dibiarkan terbuka).
3. **Tanpa Docker** (tidak perlu menunggu container menyala / build image).

---

## Ringkasan: dua lapis supaya situs tidak pernah "mati"

| Lapis | Apa yang dilayani | Butuh komputer menyala? | Biaya | Umur |
| :--- | :--- | :--- | :--- | :--- |
| **A. Situs statis di GitHub Pages** (`docs/`) | Halaman publik `https://app.syifanur.my.id` + **demo interaktif penuh** | ❌ Tidak | Gratis | Selama repo GitHub ada (bisa 10+ tahun) |
| **B. Aplikasi Laravel di belakang** | Data asli, login, invoice, database | ✅ Ya | Gratis (komputer sendiri) atau VPS | Selama mesin + tunnel hidup |

**Kunci jawabannya:** halaman yang orang buka sehari-hari dilayani **lapis A**
(CDN GitHub, tanpa server sendiri). Lapis B hanya perlu hidup saat Anda butuh
database sungguhan.

> Analogi: lapis A = brosur & etalase toko yang selalu buka 24 jam.
> Lapis B = gudang di belakang; hanya perlu buka saat ada transaksi nyata.

---

## Bagian A — Situs statis (sudah aktif, tanpa Docker sama sekali)

Folder `docs/` di repo ini **adalah** situsnya.

```
docs/
├── index.html            # beranda: katalog paket, kalkulator, FAQ
├── demo/                 # demo interaktif (jalan di browser, tanpa server)
├── assets/app.css        # Tailwind hasil build (di-commit)
├── assets/fonts/*.woff2  # font lokal (tanpa Google Fonts)
├── assets/ionicons/      # ikon lokal (tanpa unpkg)
├── CNAME                 # app.syifanur.my.id
├── 404.html, sitemap.xml, robots.txt
└── .nojekyll
```

### Kenapa ini tahan 10 tahun

- Tidak ada PHP/Node/Docker yang harus hidup — hanya file HTML/CSS/JS.
- Semua aset (font, ikon, CSS) **disimpan di repo**, bukan CDN pihak ketiga
  yang bisa tutup.
- Data demo disimpan di `localStorage` browser, jadi tidak perlu database.
- Kalau GitHub Pages suatu saat berhenti, folder `docs/` bisa langsung
  di-upload ke Netlify/Cloudflare Pages/hosting apa pun tanpa perubahan.

### Kalau perlu mengubah tampilan

```bash
# 1. edit docs-src/app.css atau docs/index.html
# 2. build ulang CSS:
bash scripts/build-docs.sh
# 3. commit & push — GitHub Pages membangun otomatis
git add docs docs-src && git commit -m "Update situs" && git push
```

Workflow `.github/workflows/deploy-pages.yml` akan menolak push bila:
CSS tidak sinkron, ada tautan ke host lama, atau halaman memakai CDN luar.

### Pengaturan GitHub Pages (sekali saja, di web)

1. Buka **Settings → Pages**.
2. **Source**: *Deploy from a branch* → Branch `main`, folder **`/docs`**.
3. **Custom domain**: `app.syifanur.my.id` (harus sama dengan `docs/CNAME`).
4. Centang **Enforce HTTPS** setelah status "DNS check successful".

DNS di Cloudflare (domain `syifanur.my.id`):

| Type | Name | Target | Proxy |
| :--- | :--- | :--- | :--- |
| CNAME | `app` | `ghanisyifanur-analisis.github.io` | **DNS only (abu-abu)** |

> Mode *DNS only* lebih tahan lama: tidak ada aturan Cloudflare yang bisa
> salah konfigurasi, dan GitHub menangani HTTPS-nya sendiri.

---

## Bagian B — Aplikasi Laravel tanpa Docker

Ada tiga pilihan. Pilih satu sesuai alat yang Anda punya.

### B1. Windows — otomatis sebagai **Windows Service** (tanpa Docker)

Paling cocok untuk komputer yang ditinggal menyala. Tidak perlu Docker Desktop,
tidak perlu jendela terminal.

```powershell
# PowerShell sebagai Administrator, dari folder repo
powershell -ExecutionPolicy Bypass -File .\scripts\background\install-windows-service.ps1

# cek kapan saja
powershell -ExecutionPolicy Bypass -File .\scripts\background\install-windows-service.ps1 -Status

# hapus service
powershell -ExecutionPolicy Bypass -File .\scripts\background\install-windows-service.ps1 -Uninstall
```

Yang dilakukan script:

1. Memasang **NSSM** (alat pembungkus service, bukan Docker).
2. Memastikan PHP 8.3 ada (winget, atau instruksi manual `C:\php`).
3. `composer install`, membuat `.env`, **database SQLite** (tanpa server DB),
   `key:generate`, `migrate`.
4. Mendaftarkan service `WebCraftAgency` dengan **start otomatis** dan
   **restart saat crash**.
5. Menyalakan dan mengecek `/up` sampai sehat.

Hasil: aplikasi hidup di `http://localhost:8000`, otomatis menyala setiap
Windows dihidupkan, tanpa login.

### B2. Linux VPS — `systemd` (tanpa Docker)

```bash
sudo apt install -y php8.3-cli php8.3-sqlite3 php8.3-mbstring php8.3-xml php8.3-curl unzip
sudo mkdir -p /var/www && cd /var/www
sudo git clone https://github.com/ghanisyifanur-analisis/ghani-jasa-secsion.git
cd ghani-jasa-secsion

composer install --no-dev --optimize-autoloader
cp .env.example .env
# ubah: APP_ENV=production, APP_DEBUG=false, DB_CONNECTION=sqlite, APP_URL=https://app.syifanur.my.id
php artisan key:generate
touch database/database.sqlite
php artisan migrate --force

sudo cp scripts/background/webcraft.service /etc/systemd/system/
sudo nano /etc/systemd/system/webcraft.service      # sesuaikan User & path
sudo systemctl daemon-reload
sudo systemctl enable --now webcraft

systemctl status webcraft       # harus "active (running)"
journalctl -u webcraft -f       # log
```

### B3. Cara cepat lintas platform — skrip `jalankan-latar.sh`

Tidak butuh root dan tidak butuh systemd (cocok untuk Termux/Android,
server sekolah, laptop):

```bash
bash scripts/background/jalankan-latar.sh start     # web + queue + watchdog
bash scripts/background/jalankan-latar.sh status
bash scripts/background/jalankan-latar.sh logs
bash scripts/background/jalankan-latar.sh autostart # otomatis hidup saat reboot (cron)
bash scripts/background/jalankan-latar.sh stop
```

Skrip ini memasang **watchdog**: setiap 20 detik ia mengecek proses; kalau
proses web/queue mati, ia menyalakannya lagi. Jadi aplikasi "tidak bisa mati"
selama mesinnya hidup.

### Android/Termux

```bash
pkg install php composer termux-api termux-tools
cd ~ && git clone https://github.com/ghanisyifanur-analisis/ghani-jasa-secsion.git
mkdir -p ~/.termux/boot
cp ghani-jasa-secsion/scripts/background/termux-boot.sh ~/.termux/boot/01-webcraft.sh
chmod +x ~/.termux/boot/01-webcraft.sh
termux-wake-lock
```

Install juga aplikasi **Termux:Boot** dari F-Droid dan buka sekali.

---

## Menyambungkan domain ke aplikasi Laravel (tanpa Docker, tanpa buka port)

Gunakan **Cloudflare Tunnel** — "terowongan" keluar dari komputer Anda ke
internet, jadi tidak perlu IP publik, tidak perlu port forwarding.

### Instalasi cloudflared

| OS | Perintah |
| :--- | :--- |
| Windows | `winget install --id Cloudflare.cloudflared` |
| Linux (Debian/Ubuntu) | unduh `.deb` dari <https://github.com/cloudflare/cloudflared/releases> lalu `sudo dpkg -i` |
| macOS | `brew install cloudflared` |

### Membuat tunnel

1. <https://one.dash.cloudflare.com> → **Networks → Tunnels → Create a tunnel**
   → pilih **Cloudflared** → beri nama `webcraft`.
2. Salin **token** yang muncul.
3. Tambahkan **Public Hostname**:
   - Subdomain: `app`  •  Domain: `syifanur.my.id`
   - Service: **HTTP**  •  URL: `localhost:8000`

   > ⚠️ Selama tunnel ini aktif, ia menggantikan GitHub Pages untuk hostname
   > tersebut. Kalau ingin situs statis tetap yang tampil, **jangan aktifkan
   > tunnel ini** dan biarkan lapis A yang melayani domain.

4. Jalankan tunnel:

```powershell
# Windows, sekali saja → otomatis jalan sebagai service
cloudflared service install <TOKEN>
Get-Service cloudflared
```

```bash
# Linux dengan systemd
sudo cp scripts/background/cloudflared.service /etc/systemd/system/
sudo nano /etc/systemd/system/cloudflared.service   # tempel token
sudo systemctl enable --now cloudflared
```

### Dua pilihan alamat

| Ingin dibuka | Alamat | Yang perlu hidup |
| :--- | :--- | :--- |
| Situs statis + demo (selalu hidup, tahan lama) | `https://app.syifanur.my.id` | tidak ada |
| Aplikasi Laravel penuh | `https://webcraft.syifanur.my.id` (buat hostname baru di tunnel) | komputer/server + tunnel |

Disarankan **memisahkan keduanya**: subdomain `app` untuk situs statis yang
tidak pernah mati, subdomain lain untuk aplikasi Laravel.

---

## Kalau ingin benar-benar 24/7 tanpa bergantung pada komputer pribadi

| Opsi | Kelebihan | Kekurangan |
| :--- | :--- | :--- |
| **VPS kecil** (1 vCPU / 1 GB, ± Rp 30–60 rb/bulan) | Hidup terus, listrik & internet sendiri | Biaya bulanan |
| **Raspberry Pi / mini PC di rumah** | Gratis bulanan, listrik kecil | Tetap butuh internet rumah |
| **Komputer yang sudah ada + Windows Service** | Tanpa biaya | Hidup selama komputer menyala |

Untuk semuanya, langkahnya sama: Bagian B + Cloudflare Tunnel.

---

## Verifikasi cepat (checklist)

```bash
# 1. Aplikasi menjawab?
curl -I http://127.0.0.1:8000/up            # harapan: HTTP/1.1 200 OK

# 2. Service otomatis?
#    Windows : Get-Service WebCraftAgency           -> Status: Running, StartType: Automatic
#    Linux   : systemctl is-enabled webcraft        -> enabled

# 3. Domain publik?
#    buka https://app.syifanur.my.id di HP dengan data seluler (bukan WiFi kantor)

# 4. Demo interaktif?
#    https://app.syifanur.my.id/demo/  -> login sebagai Klien, bayar Termin 2,
#    lihat vault terbuka, lalu cetak BAST.
```

---

## Kalau domain menampilkan 502 Bad Gateway (khusus pengaturan Cloudflare)

Gejala: `https://app.syifanur.my.id` menampilkan halaman **Cloudflare 502 Bad gateway**,
padahal di GitHub sudah tertulis *Your site is live at ...* (Settings → Pages).

Artinya: **sisi GitHub sudah benar**, tetapi Cloudflare meneruskan permintaan ke
"origin" yang tidak hidup — biasanya sisa dari era Docker/Tunnel, atau Worker.

Cek berurutan di dashboard Cloudflare (akun yang mengelola `syifanur.my.id`):

1. **DNS → Records**: baris `app` harus
   `CNAME  app  ghanisyifanur-analisis.github.io  **Proxy: DNS only (abu-abu)**`.
   - Kalau masih menunjuk `*.cfargotunnel.com`, itu jejak tunnel Docker yang sudah mati → ubah.
   - Kalau kuncinya **oranye (Proxied)**, klik Edit → matikan proxy → Save.

2. **Workers & Pages → ghani-jasa-secsion → Settings → Triggers/Routes**:
   hapus route `app.syifanur.my.id/*` bila ada. Route Worker selalu menang atas DNS,
   jadi selama ada, perubahan DNS tidak berpengaruh.

3. **Zero Trust → Networks → Tunnels**: kalau ada Public Hostname `app.syifanur.my.id`
   pada tunnel yang sudah tidak jalan, hapus hostname tersebut.

4. Tunggu 1–5 menit, lalu buka lagi. Halaman yang benar diawali judul
   **“WebCraft Agency — Jasa Pembuatan Website & Aplikasi Bisnis”**.

Penjelasan singkat kenapa begini: di Cloudflare, urutan yang dilayani adalah
**Worker → Tunnel → DNS**. Satu saja dari yang lebih atas masih aktif, DNS yang
sudah benar pun tidak akan terpakai.

Kalau ingin memakai Cloudflare proxy (oranye) supaya ada cache & WAF, boleh —
asalkan DNS-nya benar dan **tidak ada** Worker/tunnel yang menyerobot hostname itu.

---

## Troubleshooting

| Gejala | Penyebab | Solusi |
| :--- | :--- | :--- |
| Domain menampilkan 404 GitHub | `docs/CNAME` beda dengan Settings → Pages | Samakan keduanya, tunggu ±5 menit |
| Domain "DNS check unsuccessful" | record CNAME salah / masih proxied | Arahkan `app` → `ghanisyifanur-analisis.github.io`, mode DNS only |
| Halaman tampil tanpa styling | `docs/assets/app.css` belum ter-commit | `bash scripts/build-docs.sh` lalu commit |
| Ikon tidak muncul | folder `docs/assets/ionicons` hilang | pastikan folder ikut ter-commit (bukan di-.gitignore) |
| Service Windows langsung berhenti | PHP tidak ada / path salah | jalankan `-Status`, cek `storage\logs\service-error.log` |
| `jalankan-latar.sh` bilang PHP tidak ada | PHP belum terpasang | `sudo apt install php-cli` atau `pkg install php` |
| Tunnel error 1033 | `cloudflared` mati | `systemctl restart cloudflared` / `Restart-Service cloudflared` |
| Login Laravel logout sendiri | `APP_KEY` berubah tiap restart | isi `APP_KEY` permanen di `.env` |

---

## Mengapa desain ini "aman" untuk jangka panjang

1. **Tidak ada satu titik kegagalan**: situs publik statis; aplikasi dinamis opsional.
2. **Tidak ada dependensi rapuh**: tanpa CDN, tanpa Docker daemon, tanpa server database terpisah (SQLite satu file).
3. **Semua bisa dipulihkan**: kode di GitHub, data SQLite satu file yang mudah dibackup (`cp database/database.sqlite backup-2026-11-13.sqlite`).
4. **Bisa dipindah kapan saja**: dari Windows → VPS → Termux hanya dengan `git clone` + `.env`.
