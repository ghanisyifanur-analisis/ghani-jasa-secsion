# Deploy ke https://ghani-jasa-secsion.sahir.my.id

Panduan lengkap **dari nol sampai website online 24 jam**, dijalankan dari
**PowerShell Windows (Administrator)**. Setiap perintah punya penjelasan
"Artinya" dengan bahasa sehari-hari.

> Ringkasnya: GitHub = gudang kode. Docker = kapal kontainer yang menjalankan
> Laravel + database. Cloudflare Tunnel = terowongan dari internet ke
> komputer Anda. PowerShell = tombol yang menjalankan semuanya.

---

## 0. TL;DR - 5 perintah saja

Buka **PowerShell sebagai Administrator** (klik kanan Start > *Terminal (Admin)*), lalu:

```powershell
git clone https://github.com/ghanisyifanur-analisis/ghani-jasa-secsion.git C:\Project\ghani-jasa-secsion
cd C:\Project\ghani-jasa-secsion
powershell -ExecutionPolicy Bypass -File .\scripts\windows\01-Install-Prasyarat.ps1
# (restart komputer, buka Docker Desktop sampai "Engine running", buka PowerShell Admin lagi)
powershell -ExecutionPolicy Bypass -File .\scripts\windows\02-Siapkan-Config.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\windows\03-Deploy.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\windows\05-Autostart.ps1
```

Selesai. Situs terbuka di <https://ghani-jasa-secsion.sahir.my.id>.

Kalau ada langkah yang gagal, langsung lompat ke [bagian 12 (troubleshooting)](#12-troubleshooting-gejala--penyebab--solusi).

---

## 1. Kenapa desainnya begini?

| Kebutuhan Anda | Solusi di repo ini | Alasan |
| --- | --- | --- |
| Tampilan seperti GitHub Pages | Laravel menampilkan halaman yang sama di `/` | GitHub Pages hanya bisa file statis; tombol *Login*, *Kalkulator*, dan dashboard butuh PHP + database |
| Domain `ghani-jasa-secsion.sahir.my.id` | Cloudflare Tunnel | Tidak perlu IP publik, tidak perlu buka port router, HTTPS otomatis |
| Bisa diakses "selamanya" | `restart: unless-stopped` + auto-start Windows | Container hidup lagi sendiri setelah crash/restart |
| Update tanpa ribet | `03-Deploy.ps1` + GitHub Actions | Satu perintah = ambil kode, build, migrasi, nyalakan, tes domain |

### Peta arsitektur

```
Pengunjung
   |
   |  https://ghani-jasa-secsion.sahir.my.id
   v
[ Cloudflare Edge (HTTPS, DNS, anti-DDoS) ]
   |
   |  terowongan keluar (tidak perlu port forwarding)
   v
[ cloudflared  container webcraft_tunnel ]
   |
   |  http://app:8080 (jaringan internal Docker)
   v
[ app : nginx + php-fpm 8.3 + Laravel 13 ]  --->  [ db : PostgreSQL 15 ]
        container webcraft_app                        container webcraft_db
                                                      volume db_data (data permanen)
```

**Artinya:** pengunjung tidak pernah menyentuh komputer Anda secara langsung.
Mereka masuk lewat Cloudflare, Cloudflare mengirim lewat "terowongan" yang
dibuka dari dalam komputer Anda. Jadi tidak ada port yang terbuka ke internet.

---

## 2. File yang dipakai (dan gunanya)

| File | Fungsi | Analogi |
| --- | --- | --- |
| `docker-compose.prod.yml` | Resep menjalankan 3 container | Daftar tamu + tata letak meja |
| `docker/prod/Dockerfile` | Resep membuat image Laravel | Resep masakan |
| `docker/prod/nginx.conf` | Aturan web server | Resepsionis |
| `docker/prod/entrypoint.sh` | Urutan menyalakan app (migrasi, cache) | SOP buka toko |
| `.env.production` | Rahasia: APP_KEY, password DB, token tunnel | Lemari kunci (tidak masuk GitHub) |
| `.github/workflows/ci.yml` | Cek error otomatis tiap push | Quality control |
| `.github/workflows/release-image.yml` | Build image ke GHCR | Pabrik yang menyiapkan kontainer |
| `scripts/windows/01..06` | Tombol deploy di Windows | Remote control |
| `docs/index.html` | Situs statis GitHub Pages | Brosur cetak |

---

## 3. Yang perlu disiapkan lebih dulu

1. **Windows 10/11 64-bit** dengan RAM minimal 8 GB (Docker Desktop butuh ~2 GB).
2. **Akun Cloudflare** yang mengelola domain `sahir.my.id`.
3. **Internet stabil** (build pertama mengunduh ~400 MB).
4. **Komputer menyala** saat situs ingin diakses (lihat [bagian 14](#14-agar-benar-benar-247)).

---

## 4. Langkah 1 - Ambil kode dari GitHub

```powershell
cd C:\
mkdir Project -Force
cd C:\Project
git clone https://github.com/ghanisyifanur-analisis/ghani-jasa-secsion.git
cd ghani-jasa-secsion
```

**Artinya:** `git clone` = menyalin seluruh isi repo GitHub ke folder komputer.
Setelah ini, folder `C:\Project\ghani-jasa-secsion` adalah "markas" Anda.

Cek berhasil:

```powershell
git log -1 --oneline
```

---

## 5. Langkah 2 - Pasang prasyarat

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\01-Install-Prasyarat.ps1
```

Script ini memasang:

| Yang dipasang | Gunanya | ELI5 |
| --- | --- | --- |
| Git | mengambil kode dari GitHub | kurir paket |
| Docker Desktop | menjalankan website di dalam kontainer | kapal kontainer mainan yang terisolasi |
| WSL 2 | mesin Linux ringan di dalam Windows | lantai dasar tempat Docker berdiri |
| cloudflared | opsional, untuk Opsi B | kurir terowongan versi manual |

**Artinya baris perintahnya:**

- `powershell -ExecutionPolicy Bypass -File ...` = jalankan file script walaupun
  Windows biasanya memblokir script. `Bypass` hanya berlaku untuk proses itu,
  tidak mengubah setelan keamanan permanen.
- Kalau muncul permintaan **restart**, restart saja. Docker butuh WSL aktif.

Setelah restart:

1. Buka **Docker Desktop** dari Start Menu, tunggu sampai kiri-bawah bertulis **Engine running**.
2. Tutup PowerShell lama, buka lagi **sebagai Administrator**.

Cek cepat:

```powershell
docker --version
docker info --format '{{.ServerVersion}}'
```

Kalau `docker info` error "cannot connect", Docker Desktop belum selesai menyala.

---

## 6. Langkah 3 - Buat Cloudflare Tunnel

> Ini bagian yang membuat domain mengarah ke komputer Anda. Cukup sekali.

### 6.1 Kalau tunnel sudah ada (kemungkinan besar kasus Anda)

Domain Anda sekarang menampilkan **"Cloudflare Tunnel error / 1033"**. Itu artinya
tunnel-nya sudah dibuat, tetapi aplikasinya tidak menyala. Perbaikannya:

1. Buka <https://one.dash.cloudflare.com> > **Networks** > **Tunnels**.
2. Klik tunnel Anda > tab **Public Hostname** > **Edit** pada
   `ghani-jasa-secsion.sahir.my.id`.
3. Ubah **Service** menjadi:
   - Type: `HTTP`
   - URL: `app:8080`
4. **Save**.
5. Ambil token: tab **Overview** > **Install connector** > pilih **Docker** >
   salin nilai setelah `--token`. Bentuknya panjang, diawali `eyJ...`.
6. Simpan token itu, nanti dimasukkan di langkah 4.

### 6.2 Kalau belum ada tunnel

1. <https://one.dash.cloudflare.com> > **Networks** > **Tunnels** > **Create a tunnel**.
2. Pilih **Cloudflared** > **Next**.
3. Nama: `webcraft-ghani` > **Save tunnel**.
4. Pilih tab **Docker**, salin token.
5. Tab **Public Hostname** > **Add a public hostname**:
   - Subdomain: `ghani-jasa-secsion`
   - Domain: `sahir.my.id`
   - Path: *(kosongkan)*
   - Service Type: `HTTP`
   - URL: `app:8080`
6. **Save**.

**Artinya:** `app` adalah nama container Laravel di dalam jaringan Docker, `8080`
port yang dipakai nginx. Karena `cloudflared` ikut berada di jaringan yang sama,
nama `app` langsung dikenali. DNS `CNAME` ke `<id-tunnel>.cfargotunnel.com`
dibuat otomatis oleh Cloudflare - Anda tidak perlu menyentuh menu DNS.

> Kalau memakai **Opsi B** (cloudflared sebagai service Windows, bukan container),
> isi URL-nya `http://localhost:8080` karena cloudflared berada di Windows,
> bukan di jaringan Docker.

---

## 7. Langkah 4 - Isi konfigurasi rahasia

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\02-Siapkan-Config.ps1
```

Script akan:

1. Menyalin `.env.production.example` menjadi `.env.production`.
2. Meminta **token tunnel** (tempel dengan klik kanan atau `Ctrl+V`).
3. Membuat **APP_KEY** acak - kunci enkripsi sesi login.
4. Membuat **password database** acak 28 karakter.
5. Mengunci izin file supaya hanya Administrator dan akun Anda yang bisa membaca.

**Artinya tiap isi `.env.production`:**

| Variabel | Arti gampangnya | Kalau kosong/salah |
| --- | --- | --- |
| `APP_KEY` | kunci gembok sesi login | semua orang ter-logout tiap restart, error "No application encryption key" |
| `DB_PASSWORD` | password gudang data | aplikasi tidak bisa baca database |
| `CLOUDFLARE_TUNNEL_TOKEN` | tiket masuk terowongan | domain menampilkan error 1033 |
| `APP_URL` | alamat resmi | link/cookie bisa mengarah ke alamat salah |
| `SEED_ON_DEPLOY` | isi data demo tiap deploy | halaman kosong tanpa paket layanan |

> **PENTING:** catat password database yang ditampilkan. File `.env.production`
> sudah masuk `.gitignore`, jadi tidak akan pernah terkirim ke GitHub.

Mau mengubah manual? Boleh, buka dengan Notepad:

```powershell
notepad .env.production
```

---

## 8. Langkah 5 - Deploy (perintah inti)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\03-Deploy.ps1
```

Inilah "CD" (Continuous Deployment) versi Anda. Yang terjadi:

| Tahap | Yang dikerjakan | ELI5 |
| --- | --- | --- |
| 1/7 | Cek administrator, Docker menyala, `.env.production` valid | cek kunci & bahan sebelum masak |
| 2/7 | `pg_dump` menyimpan backup database ke `backups\` | foto isi gudang sebelum renovasi |
| 3/7 | `git fetch` + `git pull` | ambil resep terbaru dari GitHub |
| 4/7 | `docker compose build` atau `pull` | masak/resep siapkan kontainer |
| 5/7 | `docker compose up -d` | nyalakan mesin di latar belakang |
| 6/7 | tunggu health-check `/up` = `healthy` | tunggu lampu hijau |
| 7/7 | `Invoke-WebRequest https://domain/up` | tes pintu depan dari luar |

Build pertama biasanya 3-10 menit. Berikutnya 10-60 detik karena cache.

Contoh hasil akhir:

```
    [OK]  Aplikasi sehat (health-check /up lulus).
    [OK]  Lokal  : http://127.0.0.1:8080 -> 200
    [OK]  Publik : https://ghani-jasa-secsion.sahir.my.id/up -> 200
  DEPLOY SELESAI
    Website   : https://ghani-jasa-secsion.sahir.my.id
    Login demo: https://ghani-jasa-secsion.sahir.my.id/login
```

### Akun demo untuk uji login

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `admin@webcraft.id` | `admin123` |
| Project Manager | `pm@webcraft.id` | `pm123456` |
| Developer | `dev@webcraft.id` | `dev123456` |
| Finance | `finance@webcraft.id` | `finance123` |
| Klien | `klien@webcraft.id` | `klien123` |

---

## 9. Langkah 6 - Supaya hidup sendiri setelah restart

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\05-Autostart.ps1
```

Script ini membuat dua **Scheduled Task**:

| Task | Kapan jalan | Isinya |
| --- | --- | --- |
| `GhaniJasaSecsion-DockerDesktop` | saat Anda login | membuka Docker Desktop |
| `GhaniJasaSecsion-StartStack` | 60 detik setelah login | `06-Start-Stack.ps1` menyalakan container |

**Artinya:** setiap kali komputer dinyalakan dan login, website ikut menyala
otomatis tanpa Anda perlu membuka PowerShell. Log-nya di
`storage\logs\autostart.log`.

Batalkan kapan saja:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\05-Autostart.ps1 -Remove
```

---

## 10. Alur update sehari-hari

```
Anda edit kode di komputer
      |
      v
git add . ; git commit ; git push         <- kode naik ke GitHub
      |
      v
GitHub Actions: CI (cek error) + build image ke ghcr.io   <- otomatis
      |
      v
Di PC: .\scripts\windows\03-Deploy.ps1    <- satu perintah, 1 menit
      |
      v
Domain langsung memakai versi baru (database tetap aman)
```

Perintah update rutin:

```powershell
cd C:\Project\ghani-jasa-secsion
powershell -ExecutionPolicy Bypass -File .\scripts\windows\03-Deploy.ps1
```

Mau pakai image yang sudah dibangun GitHub Actions (tanpa build di PC)?
Sekali saja login ke registry:

```powershell
docker login ghcr.io -u ghanisyifanur-analisis
# password = Personal Access Token dengan izin read:packages
```

Lalu:

```powershell
.\scripts\windows\03-Deploy.ps1 -UseRegistry
```

Atau buat package-nya publik: GitHub > repo > **Packages** > pilih package >
**Package settings** > **Change visibility** > **Public**.

---

## 11. Perintah harian (cheat sheet)

```powershell
# Lihat kondisi lengkap (container, health, disk, log)
.\scripts\windows\04-Status.ps1

# Deploy versi terbaru
.\scripts\windows\03-Deploy.ps1

# Deploy tanpa mengambil kode baru (restart saja)
.\scripts\windows\03-Deploy.ps1 -SkipGitPull

# Deploy + build bersih dari nol (kalau ada error aneh)
.\scripts\windows\03-Deploy.ps1 -Rebuild

# Deploy tanpa backup database (lebih cepat)
.\scripts\windows\03-Deploy.ps1 -NoBackup

# Lihat log aplikasi realtime
docker logs -f webcraft_app

# Lihat log tunnel
docker logs -f webcraft_tunnel

# Masuk ke database
docker exec -it webcraft_db psql -U webcraft_user -d webcraft_db

# Matikan website
docker compose --env-file .env.production -f docker-compose.prod.yml down

# Nyalakan lagi
docker compose --env-file .env.production -f docker-compose.prod.yml --profile tunnel up -d

# Restore backup (PERHATIAN: menimpa data sekarang)
docker exec -i webcraft_db psql -U webcraft_user -d webcraft_db < .\backups\db-20260101-120000.sql
```

---

## 12. Troubleshooting: gejala → penyebab → solusi

| Gejala | Penyebab umum | Solusi |
| --- | --- | --- |
| **Cloudflare error 1033 / "Tunnel error"** | `cloudflared` mati, atau container tidak jalan | `04-Status.ps1`; pastikan `webcraft_tunnel` running; cek `docker logs webcraft_tunnel`. Token salah → ulangi `02-Siapkan-Config.ps1 -Force` |
| **502 Bad Gateway** | `app` mati atau belum siap | `docker logs webcraft_app --tail 80`; tunggu 60 detik; `03-Deploy.ps1 -SkipGitPull` |
| **Halaman "Website sebentar lagi siap"** | Aplikasi sedang restart / crash | lihat log app; biasanya migrasi gagal karena password DB |
| **Error 500 `No application encryption key`** | `APP_KEY` kosong | `02-Siapkan-Config.ps1 -Force` lalu deploy ulang |
| **`password authentication failed for user`** | `DB_PASSWORD` diubah setelah volume dibuat | pakai password lama, atau reset data: `docker compose ... down -v` (**data hilang**) |
| **`port is already allocated` 8080** | ada aplikasi lain di port 8080 | ubah `ports` di compose jadi `127.0.0.1:8081:8080` |
| **`docker: command not found`** | PATH belum dimuat | tutup & buka ulang PowerShell |
| **`WSL 2 is not installed`** | WSL belum aktif | `wsl --install --no-distribution` lalu restart |
| **Docker Desktop tidak mau start** | virtualisasi mati / Hyper-V | aktifkan **Virtual Machine Platform** di *Turn Windows features on/off*, restart |
| **`unauthorized` saat `-UseRegistry`** | belum login GHCR / package private | `docker login ghcr.io` atau jadikan package Public |
| **Build gagal di `composer install`** | koneksi/DNS terganggu | coba `03-Deploy.ps1 -Rebuild`, ganti jaringan, ulangi |
| **Situs tampil tapi tanpa warna/ikon** | CDN Tailwind/unpkg diblokir jaringan pengunjung | normal; konten tetap terbaca |
| **Perubahan tidak muncul di domain** | cache Cloudflare | Cloudflare dashboard > **Caching** > **Purge Everything** |
| **`git pull` ditolak** | ada perubahan lokal | `git stash` atau commit dulu, lalu deploy |
| **Domain jalan, tapi `/login` 404** | tunnel mengarah ke service lain | pastikan Service = `HTTP app:8080` |

Perintah diagnosis satu blok:

```powershell
docker ps
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker inspect --format '{{.State.Health.Status}}' webcraft_app
docker logs webcraft_app --tail 100
docker logs webcraft_tunnel --tail 50
Invoke-WebRequest http://127.0.0.1:8080/up -UseBasicParsing | Select-Object StatusCode
```

---

## 13. Opsi B - cloudflared sebagai service Windows

Pakai ini kalau Anda **tidak** ingin tunnel ikut dikelola Docker (misalnya
tunnel sudah terpasang sebagai service di komputer ini).

```powershell
# 1. Pasang cloudflared sebagai service Windows (sekali saja)
cloudflared service install eyJ...TOKEN_ANDA...

# 2. Cek service
Get-Service cloudflared

# 3. Deploy aplikasi TANPA container tunnel
.\scripts\windows\03-Deploy.ps1 -TunnelMode windows
```

Di dashboard Cloudflare, URL service harus `http://localhost:8080` (bukan `app:8080`).

| | Opsi A (Docker, disarankan) | Opsi B (service Windows) |
| --- | --- | --- |
| Jumlah yang diurus | 1 perintah | 2 benda (Docker + service) |
| Update tunnel | `docker compose pull` | otomatis oleh service |
| Cocok untuk | setup baru | tunnel yang sudah ada |

Jangan jalankan dua-duanya dengan token yang sama secara bersamaan kalau tidak
perlu - cukup pilih satu.

---

## 14. Agar benar-benar 24/7

Website hanya online kalau **komputer menyala, tidak sleep, dan ada internet**.
Yang sudah disiapkan:

- container `restart: unless-stopped` (hidup lagi setelah crash);
- Scheduled Task saat login (hidup lagi setelah restart Windows);
- `powercfg` mematikan sleep saat adaptor listrik tersambung.

Yang tidak bisa dihindari dengan PC pribadi:

- restart Windows karena update;
- internet rumah mati;
- listrik padam.

Kalau butuh benar-benar 24/7, pindahkan hal yang sama ke **VPS Linux** (Rp50-100 rb/bulan).
Semua file sudah siap pakai - hanya nama perintahnya sama:

```bash
# di VPS Ubuntu (setelah install Docker & git)
git clone https://github.com/ghanisyifanur-analisis/ghani-jasa-secsion.git
cd ghani-jasa-secsion
cp .env.production.example .env.production   # isi APP_KEY, DB_PASSWORD, token
docker compose --env-file .env.production -f docker-compose.prod.yml --profile tunnel up -d
```

Lalu `docker compose ... up -d` dijalankan otomatis oleh systemd/cron saat boot.

---

## 15. Keamanan

| Aturan | Alasan |
| --- | --- |
| Jangan commit `.env.production` | isinya password & token; sudah masuk `.gitignore` |
| Jangan bagikan token tunnel | siapa pun yang punya token bisa mengarahkan domain |
| `APP_DEBUG=false` | pesan error Laravel bisa membocorkan kredensial |
| Port hanya `127.0.0.1:8080` | tidak terbuka ke internet; akses hanya lewat Cloudflare |
| Ganti password akun demo | `admin123` hanya untuk demonstrasi |
| Rotasi token bila bocor | Cloudflare > Tunnels > **Refresh token** |

Kalau token tidak sengaja ter-commit: hapus commit, lalu **Refresh token** di
Cloudflare, perbarui `.env.production`, deploy ulang.

---

## 16. Kamus ELI5

| Istilah | Penjelasan sederhana |
| --- | --- |
| **Image** | cetakan kue; template aplikasi yang belum dijalankan |
| **Container** | kue yang sudah jadi dari cetakan itu; aplikasi yang benar-benar jalan |
| **Volume** | kotak penyimpanan permanen; data tetap ada walau container dihapus |
| **Docker Compose** | resep yang menyuruh beberapa container bekerja bersama |
| **Tunnel** | selang yang ditarik dari dalam rumah ke luar; tidak perlu pintu terbuka |
| **Port** | nomor pintu di dalam komputer (8080 = pintu aplikasi) |
| **`.env`** | lemari kunci berisi rahasia aplikasi |
| **Migrasi** | membuat/mengubah bentuk tabel database tanpa menghapus isinya |
| **Seeder** | mengisi data contoh (akun demo, paket layanan) |
| **Health-check** | tes "apakah kamu masih hidup?" yang dijawab `/up` |
| **Cache** | catatan cepat supaya halaman tidak dihitung ulang dari nol |
| **Registry (GHCR)** | gudang image di GitHub |
| **CI** | robot yang mengecek error setiap kali kode di-push |
| **CD** | robot/skrip yang menaikkan versi baru ke server |
| **PowerShell Administrator** | terminal dengan izin paling tinggi di Windows |

---

## 17. FAQ

**Tanya: GitHub Pages saya masih jalan? Tidak dobel?**
Masih. GitHub Pages menyajikan `docs/index.html` (statis). Domain Anda menyajikan
aplikasi Laravel penuh dengan tampilan yang sama. Keduanya bisa hidup berdampingan.

**Tanya: Kenapa harus Docker? Tidak bisa PHP biasa?**
Bisa, tapi Anda harus memasang PHP 8.3, Composer, PostgreSQL, dan mengurus
konfigurasinya sendiri. Docker membungkus semuanya sehingga "jalan di komputer
saya" = "jalan di server".

**Tanya: Berapa RAM terpakai?**
Kira-kira 400-700 MB saat idle (app + PostgreSQL + cloudflared).

**Tanya: Data hilang kalau deploy ulang?**
Tidak. Database disimpan di volume `db_data`; `03-Deploy.ps1` juga membuat
backup otomatis ke `backups\` (10 file terbaru disimpan).

**Tanya: Apakah `/expertmode` dan `/codex` tersedia?**
Belum ada route dengan nama itu di aplikasi. Kalau memang dibutuhkan sebagai
halaman, tambahkan route di `routes/web.php` lalu deploy ulang.

**Tanya: Bagaimana kalau saya ganti domain?**
Ubah `APP_URL` di `.env.production`, ubah public hostname di Cloudflare, lalu
jalankan `03-Deploy.ps1`. Tidak perlu build ulang.
