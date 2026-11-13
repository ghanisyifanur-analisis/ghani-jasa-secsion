# WebCraft Agency Platform (Academic Production Engine)

Platform agensi pembuatan website dan aplikasi berbasis web profesional dengan standar kepatuhan **ISO/IEC/IEEE 29148:2018 (Requirements Engineering)** untuk Ujian Akhir Semester / Tugas Besar Web Programming (Semester 5).

---
---

## 🌐 Situs Publik — <https://app.syifanur.my.id>

Situs publik **tidak memakai Docker** dan tidak butuh komputer yang menyala:
halaman statis di folder `docs/` dilayani **GitHub Pages** (CDN global, HTTPS
otomatis), termasuk **demo interaktif** yang berjalan penuh di browser.

| Bagian | Isi |
| :--- | :--- |
| `docs/index.html` | Beranda: katalog 4 paket, kalkulator biaya + split termin, alur 5 fase, FAQ |
| `docs/demo/` | Demo interaktif tanpa server: 5 peran, invoice, milestone, vault AES-256, BAST |
| `docs-src/app.css` | Sumber Tailwind v4 → dibangun menjadi `docs/assets/app.css` |
| `docs/assets/` | Font, ikon, dan CSS **lokal** (tanpa CDN pihak ketiga) |
| [`docs/DEPLOY-TANPA-DOCKER.md`](docs/DEPLOY-TANPA-DOCKER.md) | Panduan: tanpa Docker, selalu jalan di latar belakang, tahan bertahun-tahun |
| `scripts/background/` | Windows Service (NSSM), systemd Linux, watchdog lintas platform, Termux boot |
| `scripts/build-docs.sh` | Membangun ulang CSS situs statis (`bash scripts/build-docs.sh`) |
| `.github/workflows/deploy-pages.yml` | Verifikasi otomatis situs sebelum dipublikasikan |

**Agar situs tidak pernah mati**

- Halaman publik = file statis → tidak ada server yang bisa crash.
- Demo = JavaScript murni + `localStorage` → tidak butuh database.
- Semua aset lokal → tidak bergantung CDN yang bisa tutup.
- Kode di GitHub → bisa dipindah ke hosting lain kapan saja.

**Kalau butuh aplikasi Laravel penuh (login & database asli)**

```powershell
# Windows — sekali jalan, lalu hidup otomatis di latar belakang tanpa Docker
powershell -ExecutionPolicy Bypass -File .\scripts\background\install-windows-service.ps1
```

```bash
# Linux / Termux — web + queue + watchdog (auto-restart)
bash scripts/background/jalankan-latar.sh start
bash scripts/background/jalankan-latar.sh status
```

Detail lengkap (Cloudflare Tunnel tanpa Docker, DNS GitHub Pages, troubleshooting):
[`docs/DEPLOY-TANPA-DOCKER.md`](docs/DEPLOY-TANPA-DOCKER.md).

> Jalur Docker (`docker-compose.prod.yml`, `scripts/windows/`, `docs/DEPLOY-WINDOWS.md`)
> tetap tersedia sebagai **opsi**, bukan syarat. Situs publik tidak memakainya.

---

## 🛠️ Tech Stack & Spesifikasi Teknis
- **Backend Framework**: Laravel 11 / 13 (PHP 8.2+)
- **Database Utama**: SQLite (tanpa server DB, untuk produksi ringan) & PostgreSQL 15 / MariaDB (opsional)
- **Publikasi**: GitHub Pages (statis + demo) dan Cloudflare Tunnel (aplikasi dinamis)
- **Containerization**: Docker & Docker Compose — **opsional**, tidak diperlukan untuk situs publik
- **Frontend & Styling**: Tailwind CSS, IonIcons 7, MaoneArt Glassmorphism Dark Theme
- **Enkripsi Kredensial**: AES-256-CBC (Gated Access Protocol)
- **Payment Gateway**: Midtrans Snap / Webhook Idempotency Simulation

---

## 👥 5 Akun Pengguna Bawaan (Multi-Role Access Control)
| Role | Email Demo | Password | Ruang Lingkup & Tanggung Jawab |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@webcraft.id` | `admin123` | Executive dashboard, ringkasan omzet, alokasi PM & Developer, pantau beban modal riil (COGS) |
| **Project Manager (PM)** | `pm@webcraft.id` | `pm123456` | Review brief kebutuhan bisnis, verifikasi ruang lingkup tiket revisi, roadmap sprint proyek |
| **Developer / Lead** | `dev@webcraft.id` | `dev123456` | Pengerjaan fitur, publikasi link server staging, input aset akun ke brankas terenkripsi |
| **Finance** | `finance@webcraft.id` | `finance123` | Pantau arus kas masuk, invoice split billing, pencatatan beban modal riil (COGS domain/server/plugin) |
| **Klien Portal** | `klien@webcraft.id` | `klien123` | Isi brief kebutuhan, digital sign-off 5 milestone, buka brankas kredensial, cetak BAST resmi |

---

## 🚀 Panduan Instalasi (Cara Pasang)

### Pilihan 1: Menggunakan Docker + PostgreSQL 15 (Rekomendasi Dosen & Penguji)

1. **Prasyarat**: Pastikan Docker Engine & Docker Compose telah terpasang pada komputer/laptop Anda.
2. **Kloning & Masuk ke Folder**:
   ```bash
   git clone https://github.com/maoneart/webcraft-agency.git
   cd webcraft-agency
   ```
3. **Konfigurasi Environment**:
   ```bash
   cp .env.example .env
   ```
4. **Build & Jalankan Container**:
   ```bash
   docker compose up -d --build
   ```
5. **Inisialisasi Database**:
   ```bash
   docker compose exec laravel_app php artisan key:generate
   docker compose exec laravel_app php artisan migrate:fresh --seed
   ```
6. **Akses Aplikasi**: Buka browser di `http://localhost:8000`.

---

### Pilihan 2: Menggunakan PHP Native / SQLite / Termux Android

1. **Install Dependensi & Konfigurasi**:
   ```bash
   composer install
   cp .env.example .env
   php artisan key:generate
   ```
2. **Setup Database SQLite**:
   ```bash
   # Di file .env, pastikan DB_CONNECTION=sqlite
   touch database/database.sqlite
   php artisan migrate:fresh --seed
   ```
3. **Jalankan Development Server**:
   ```bash
   php artisan serve
   # Buka http://127.0.0.1:8000
   ```

---

## 📖 Panduan Cara Pemakaian Platform (Workflow Step-by-Step)

Platform ini mengintegrasikan seluruh siklus bisnis agensi web development dari kalkulasi hingga serah terima:

### 1. Simulasi Estimasi Biaya (Kalkulator Dinamis)
- Akses halaman utama pada tab **Kalkulator Biaya**.
- Pilih paket dasar (misal: *Company Profile* atau *E-Commerce*).
- Pilih tambahan add-on (Domain, Hosting NVMe, Payment Gateway, SEO, dll).
- Sistem secara real-time menghitung total investasi, estimasi hari kerja, serta pembagian **Termin 1 (DP 50%)** dan **Termin 2 (Pelunasan 50%)**.
- Klik **Buat Pesanan & Lanjut ke Ruang Kerja**.

### 2. Pembayaran Termin 1 (DP 50%)
- Di ruang kerja pesanan, Anda akan melihat invoice Termin 1 berstatus **BELUM DIBAYAR**.
- Pilih kanal pembayaran simulasi (misal: *QRIS Instant* atau *BCA VA*), lalu klik **Simulasi Bayar**.
- Sistem otomatis mengubah invoice menjadi **LUNAS (PAID)** dan mengaktifkan tahapan pengisian brief proyek.

### 3. Pengisian Brief Kebutuhan Klien
- Masuk ke formulir brief proyek.
- Isi nama brand, tagline, preferensi palet warna, target audiens, dan unggah logo.
- Kirim brief untuk ditinjau oleh tim agensi.

### 4. Peninjauan Brief oleh Project Manager (PM)
- Masuk/ganti peran sebagai **Project Manager** (`pm@webcraft.id` / `pm123456`).
- Buka dashboard PM untuk melihat antrean brief masuk.
- PM dapat menekan **Terima Brief (Mulai Dev)** untuk menyetujui, atau **Minta Revisi** jika informasi kurang lengkap.
- Persetujuan ini otomatis membuka **Fase 2: Desain UI/UX**.

### 5. Pelaksanaan Milestone & Digital Sign-Off Klien
- Alur kerja terbagi dalam 5 fase terukur:
  - **Fase 1**: Review Brief & Sitemap.
  - **Fase 2**: Desain UI/UX & Wireframing.
  - **Fase 3**: Slicing Kode & Backend.
  - **Fase 4**: Server Staging & Evaluasi Klien.
  - **Fase 5**: Pelunasan & Handover Kredensial.
- Pada setiap fase yang berstatus **ACTIVE**, klien atau PM dapat menekan tombol **Sign-Off Digital**.
- Sistem menampilkan konfirmasi **MaoneArt Glassmorphism Modal** dan mencatat audit trail (waktu dan status persetujuan) ke database.

### 6. Pengujian Server Staging & Tiket Revisi
- Pada Fase 4, tim Developer mempublikasikan link server staging untuk dievaluasi oleh klien.
- Klien dapat mengajukan catatan revisi melalui form tiket revisi:
  - **Kuota Gratis**: Setiap paket memiliki kuota gratis (default 2x).
  - **Add-on Revisi Berbayar**: Jika kuota gratis habis, sistem otomatis menerbitkan invoice add-on revisi sebesar Rp 200.000.
- Tim Developer merespons dan menyelesaikan tiket secara tercatat.

### 7. Pelunasan Termin 2 & Pembukaan Brankas (Vault AES-256)
- Setelah Fase 4 disetujui (Sign-off Staging), klien diarahkan melunasi invoice **Termin 2 (Pelunasan 50%)**.
- Lakukan simulasi pelunasan invoice Termin 2.
- **Gated Release Protocol**: Brankas kredensial (*cPanel, WordPress Admin, Database*) yang tadinya terkunci (**GATED LOCKED**) akan seketika terbuka (**UNLOCKED**).
- Tombol **Dekripsi Sandi (AES-256)** dapat ditekan untuk melihat username dan password produksi yang didekripsi dari database.

### 8. Penerbitan & Cetak Berita Acara Serah Terima (BAST)
- Setelah Termin 2 lunas, tombol **Cetak BAST Digital** akan aktif.
- Klik tombol tersebut untuk membuka dokumen resmi BAST lengkap dengan nomor surat BAST, identitas pihak pertama dan pihak kedua, audit trail sign-off 5 milestone, serta legalitas tanda tangan digital.
- Dokumen siap dicetak langsung atau disimpan sebagai PDF (`Ctrl + P`).

### 9. Manajemen Keuangan & Beban Modal (Finance Dashboard)
- Ganti peran ke **Finance** (`finance@webcraft.id` / `finance123`).
- Lihat rekonsiliasi arus kas masuk, piutang invoice tertunda, dan form pencatatan biaya pokok penjualan (COGS) riil untuk pembelian domain, hosting, lisensi, atau tenaga kerja freelance.
- Sistem otomatis menghitung margin laba bersih (*Net Profit Margin*).

---

## 📜 Kepatuhan Standar Dokumen
- **Standar Rekayasa Kebutuhan**: ISO/IEC/IEEE 29148:2018 (`PRD_SRS_Jasa_Website.pdf`).
- **Keamanan Data Kredensial**: Enkripsi AES-256-CBC dengan prinsip *Least Privilege & Gated Access*.
- **Desain UI Antarmuka**: MaoneArt Glassmorphism Standard dengan modal dialog simetris 2-kolom (`grid grid-cols-2 gap-3 w-full`).
