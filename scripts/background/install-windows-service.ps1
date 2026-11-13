<#
.SYNOPSIS
    Pasang aplikasi Laravel agar SELALU berjalan di latar belakang — tanpa Docker.

.DESCRIPTION
    Script ini memasang aplikasi sebagai Windows Service (lewat NSSM) sehingga:
      * otomatis hidup saat komputer dinyalakan, tanpa perlu login/klik apa pun;
      * otomatis restart kalau crash;
      * berjalan di latar belakang (tidak ada jendela hitam yang harus dibiarkan terbuka).

    Yang dipasang: PHP 8.3 (kalau belum ada), Composer, dependency Laravel,
    database SQLite (tanpa server database terpisah), lalu service-nya.

    Analogi: dulu website Anda adalah "lampu meja" yang harus dinyalakan manual.
    Script ini mengubahnya menjadi "lampu jalan" — begitu listrik (komputer)
    menyala, lampunya ikut menyala sendiri.

.PARAMETER Domain
    Domain yang dipakai. Bawaan: app.syifanur.my.id

.PARAMETER Port
    Port lokal aplikasi. Bawaan: 8000 (dipakai server bawaan PHP).

.PARAMETER PublicFolder
    Pakai folder public/ sebagai DocumentRoot (disarankan bila memakai
    Nginx/IIS). Kalau tidak diisi, aplikasi dijalankan lewat `php artisan serve`.

.PARAMETER Uninstall
    Hentikan dan hapus service.

.PARAMETER Status
    Hanya tampilkan status service.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\background\install-windows-service.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\background\install-windows-service.ps1 -Port 8080

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\background\install-windows-service.ps1 -Status
#>
[CmdletBinding()]
param(
    [string]$Domain = 'app.syifanur.my.id',
    [int]$Port = 8000,
    [string]$PublicFolder = '',
    [switch]$Uninstall,
    [switch]$Status
)

$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$ServiceName = 'WebCraftAgency'
$NssmDir = Join-Path $env:ProgramData 'WebCraft\nssm'
$NssmExe = Join-Path $NssmDir 'nssm.exe'
$LogDir = Join-Path $RepoRoot 'storage\logs'
$PhpCandidates = @(
    (Join-Path $env:ProgramFiles 'php\php.exe'),
    (Join-Path $env:ProgramFiles 'PHP\php.exe'),
    'C:\php\php.exe'
)

function Write-Step([string]$Text) { Write-Host ''; Write-Host "==> $Text" -ForegroundColor Cyan }
function Write-Ok([string]$Text) { Write-Host "    [OK] $Text" -ForegroundColor Green }
function Write-Warn2([string]$Text) { Write-Host "    [!!] $Text" -ForegroundColor Yellow }
function Write-Bad([string]$Text) { Write-Host "    [XX] $Text" -ForegroundColor Red }

function Assert-Administrator {
    $p = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Jalankan PowerShell sebagai Administrator (klik kanan > Run as administrator).'
    }
}

function Find-Php {
    foreach ($c in $PhpCandidates) { if (Test-Path $c) { return $c } }
    $cmd = Get-Command php.exe -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return $null
}

Write-Host ''
Write-Host '  WebCraft Agency - Mode latar belakang TANPA Docker' -ForegroundColor White
Write-Host '  ------------------------------------------------------------' -ForegroundColor DarkGray
Write-Host "  Folder aplikasi : $RepoRoot"
Write-Host "  Domain          : https://$Domain"

Assert-Administrator

# ---------------------------------------------------------------- status
if ($Status) {
    $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if (-not $svc) {
        Write-Warn2 "Service '$ServiceName' belum terpasang. Jalankan script ini tanpa -Status untuk memasang."
        exit 0
    }
    $svc | Format-List Name, Status, StartType
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/up" -UseBasicParsing -TimeoutSec 8
        Write-Ok "Aplikasi menjawab di http://127.0.0.1:$Port/up (HTTP $($r.StatusCode))"
    } catch {
        Write-Warn2 "Service ada tetapi aplikasi belum menjawab di port $Port. Cek log: $LogDir\service-error.log"
    }
    exit 0
}

# -------------------------------------------------------------- uninstall
if ($Uninstall) {
    $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($svc) {
        if (Test-Path $NssmExe) {
            & $NssmExe stop $ServiceName | Out-Null
            & $NssmExe remove $ServiceName confirm | Out-Null
        } else {
            Stop-Service $ServiceName -Force -ErrorAction SilentlyContinue
            sc.exe delete $ServiceName | Out-Null
        }
        Write-Ok "Service '$ServiceName' dihapus."
    } else {
        Write-Warn2 "Service '$ServiceName' memang belum ada."
    }
    exit 0
}

# --------------------------------------------------------------- 1. NSSM
Write-Step 'Langkah 1/6 - Menyiapkan NSSM (pembungkus service)'
if (-not (Test-Path $NssmExe)) {
    New-Item -ItemType Directory -Force -Path $NssmDir | Out-Null
    # NSSM resmi diunduh dari nssm.cc; kalau gagal, pakai versi dari Chocolatey bila ada.
    $zip = Join-Path $env:TEMP 'nssm.zip'
    $downloaded = $false
    try {
        Write-Host '    Mengunduh NSSM...'
        Invoke-WebRequest -Uri 'https://nssm.cc/release/nssm-2.24.zip' -OutFile $zip -UseBasicParsing -TimeoutSec 60
        Expand-Archive -Path $zip -DestinationPath (Join-Path $env:TEMP 'nssm-extract') -Force
        $exe = Get-ChildItem (Join-Path $env:TEMP 'nssm-extract') -Recurse -Filter 'nssm.exe' |
            Where-Object { $_.FullName -match 'win64' } | Select-Object -First 1
        if (-not $exe) {
            $exe = Get-ChildItem (Join-Path $env:TEMP 'nssm-extract') -Recurse -Filter 'nssm.exe' | Select-Object -First 1
        }
        Copy-Item $exe.FullName $NssmExe -Force
        $downloaded = $true
    } catch {
        Write-Warn2 'Unduhan NSSM gagal (jaringan/DNS). Mencoba Chocolatey...'
        if (Get-Command choco.exe -ErrorAction SilentlyContinue) {
            choco install nssm -y --no-progress | Out-Null
            $found = Get-Command nssm.exe -ErrorAction SilentlyContinue
            if ($found) { Copy-Item $found.Source $NssmExe -Force; $downloaded = $true }
        }
    }
    if (-not $downloaded) {
        Write-Bad 'NSSM tidak bisa disiapkan otomatis.'
        Write-Host '    Unduh manual: https://nssm.cc/download lalu simpan nssm.exe (versi win64) ke:' -ForegroundColor Yellow
        Write-Host "    $NssmExe" -ForegroundColor Yellow
        Write-Host '    Setelah itu jalankan ulang script ini.' -ForegroundColor Yellow
        exit 1
    }
}
Write-Ok "NSSM siap: $NssmExe"

# ----------------------------------------------------------- 2. PHP check
Write-Step 'Langkah 2/6 - Memeriksa PHP'
$php = Find-Php
if (-not $php) {
    Write-Warn2 'PHP tidak ditemukan. Memasang lewat winget (kalau tersedia)...'
    if (Get-Command winget.exe -ErrorAction SilentlyContinue) {
        winget install --id PHP.PHP.8.3 --accept-package-agreements --accept-source-agreements --silent | Out-Null
        $php = Find-Php
    }
}
if (-not $php) {
    Write-Bad 'PHP 8.3 belum terpasang.'
    Write-Host '    Pasang manual: https://windows.php.net/download/ (pilih PHP 8.3 x64 Thread Safe),' -ForegroundColor Yellow
    Write-Host '    ekstrak ke C:\php, lalu ulangi script ini.' -ForegroundColor Yellow
    exit 1
}
$phpVersion = (& $php -r "echo PHP_VERSION;") 2>$null
Write-Ok "PHP $phpVersion di $php"

# -------------------------------------------------------- 3. Composer/deps
Write-Step 'Langkah 3/6 - Menyiapkan dependency aplikasi'
Push-Location $RepoRoot
try {
    if (-not (Test-Path (Join-Path $RepoRoot 'vendor\autoload.php'))) {
        $composer = Get-Command composer -ErrorAction SilentlyContinue
        if ($composer) {
            & composer install --no-interaction --prefer-dist --no-progress
        } else {
            Write-Host '    Composer tidak ada; memakai composer.phar lokal...'
            $phar = Join-Path $RepoRoot 'composer.phar'
            if (-not (Test-Path $phar)) {
                Invoke-WebRequest -Uri 'https://getcomposer.org/download/latest-stable/composer.phar' -OutFile $phar -UseBasicParsing -TimeoutSec 120
            }
            & $php $phar install --no-interaction --prefer-dist --no-progress
        }
    }
    Write-Ok 'Dependency siap (vendor/ ada).'

    # .env produksi sederhana
    $envFile = Join-Path $RepoRoot '.env'
    if (-not (Test-Path $envFile)) {
        Copy-Item (Join-Path $RepoRoot '.env.example') $envFile
        Write-Ok '.env dibuat dari .env.example.'
    }

    $envText = Get-Content $envFile -Raw
    $need = @{
        'APP_ENV'          = 'production'
        'APP_DEBUG'        = 'false'
        'APP_URL'          = "https://$Domain"
        'DB_CONNECTION'    = 'sqlite'
        'DB_DATABASE'      = (Join-Path $RepoRoot 'database\database.sqlite')
        'SESSION_DRIVER'   = 'file'
        'CACHE_STORE'      = 'file'
        'QUEUE_CONNECTION' = 'sync'
        'LOG_CHANNEL'      = 'daily'
    }
    foreach ($key in $need.Keys) {
        $value = $need[$key]
        # '$' harus di-escape agar path seperti C:\Project tidak dianggap regex group
        $replacement = "$key=" + ($value -replace '\$', '$$$$')
        if ($envText -match "(?m)^$key=") {
            $envText = [regex]::Replace($envText, "(?m)^$key=.*$", $replacement)
        } else {
            $envText += "`r`n$key=$value"
        }
    }
    # Simpan TANPA BOM: dotenv PHP membacanya sebagai karakter aneh di baris pertama
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($envFile, $envText, $utf8NoBom)

    $dbFile = Join-Path $RepoRoot 'database\database.sqlite'
    if (-not (Test-Path $dbFile)) { New-Item -ItemType File -Path $dbFile -Force | Out-Null }

    & $php artisan key:generate --force | Out-Null
    & $php artisan migrate --force --no-interaction | Out-Null
    & $php artisan config:clear | Out-Null
    & $php artisan route:clear | Out-Null
    & $php artisan storage:link 2>$null | Out-Null
    Write-Ok 'Database SQLite, APP_KEY, dan migrasi siap.'
} finally {
    Pop-Location
}

# --------------------------------------------------------------- 4. Service
Write-Step "Langkah 4/6 - Memasang service '$ServiceName'"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
    & $NssmExe stop $ServiceName | Out-Null
    & $NssmExe remove $ServiceName confirm | Out-Null
    Start-Sleep -Seconds 1
}

$arguments = if ($PublicFolder) {
    # Router script wajib: tanpa ini server bawaan PHP tidak bisa menjalankan
    # routing Laravel (semua URL selain file statis akan 404).
    $router = Join-Path $RepoRoot (Join-Path $PublicFolder 'index.php')
    "-S 0.0.0.0:$Port -t `"$RepoRoot\$PublicFolder`" `"$router`""
} else {
    "artisan serve --host=0.0.0.0 --port=$Port"
}
$application = if ($PublicFolder) { $php } else { $php }

& $NssmExe install $ServiceName $application $arguments | Out-Null
& $NssmExe set $ServiceName AppDirectory $RepoRoot | Out-Null
& $NssmExe set $ServiceName DisplayName 'WebCraft Agency (Laravel)' | Out-Null
& $NssmExe set $ServiceName Description "Website WebCraft Agency tanpa Docker. Domain: https://$Domain" | Out-Null
& $NssmExe set $ServiceName Start SERVICE_AUTO_START | Out-Null
& $NssmExe set $ServiceName AppStdout (Join-Path $LogDir 'service-out.log') | Out-Null
& $NssmExe set $ServiceName AppStderr (Join-Path $LogDir 'service-error.log') | Out-Null
& $NssmExe set $ServiceName AppRotateFiles 1 | Out-Null
& $NssmExe set $ServiceName AppRotateBytes 10485760 | Out-Null
& $NssmExe set $ServiceName AppStopMethodConsole 15000 | Out-Null
& $NssmExe set $ServiceName AppThrottle 5000 | Out-Null
& $NssmExe set $ServiceName AppExit Default Restart | Out-Null
Write-Ok 'Service terdaftar dengan start otomatis + restart saat crash.'

Write-Step 'Langkah 5/6 - Menyalakan service'
& $NssmExe start $ServiceName | Out-Null
Start-Sleep -Seconds 5

$healthy = $false
for ($i = 0; $i -lt 20; $i++) {
    try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/up" -UseBasicParsing -TimeoutSec 5
        if ($resp.StatusCode -eq 200) { $healthy = $true; break }
    } catch { Start-Sleep -Seconds 3 }
}
if ($healthy) { Write-Ok "Aplikasi sehat di http://127.0.0.1:$Port" }
else { Write-Warn2 "Belum menjawab. Lihat log: $LogDir\service-error.log" }

# ------------------------------------------------------------ 6. Ringkasan
Write-Step 'Langkah 6/6 - Ringkasan'
Write-Host ''
Write-Host '  Service berjalan di latar belakang dan otomatis hidup saat Windows dinyalakan.' -ForegroundColor White
Write-Host ''
Write-Host '  Perintah berguna:' -ForegroundColor DarkGray
Write-Host "    Status  : powershell -ExecutionPolicy Bypass -File .\scripts\background\install-windows-service.ps1 -Status"
Write-Host "    Restart : Restart-Service $ServiceName"
Write-Host "    Stop    : Stop-Service $ServiceName"
Write-Host "    Hapus   : powershell -ExecutionPolicy Bypass -File .\scripts\background\install-windows-service.ps1 -Uninstall"
Write-Host ''
Write-Host "  Supaya domain https://$Domain mengarah ke komputer ini:" -ForegroundColor Yellow
Write-Host '    1. Cloudflare Zero Trust > Networks > Tunnels > pilih tunnel Anda > Public Hostname.'
Write-Host "    2. Service: HTTP  |  URL: localhost:$Port"
Write-Host '    3. Pastikan tunnel-nya juga jalan otomatis (panduan di docs/DEPLOY-TANPA-DOCKER.md).'
Write-Host ''
