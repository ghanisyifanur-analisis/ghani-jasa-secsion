<#
.SYNOPSIS
    01 - Memasang semua prasyarat di Windows (Git, Docker Desktop, cloudflared).

.DESCRIPTION
    Jalankan di PowerShell yang dibuka dengan "Run as administrator".

    Analogi sederhana:
      - Git          = kotak pengiriman kode dari GitHub ke komputer Anda.
      - Docker       = kapal kontainer yang menjalankan website di dalam kotak
                       terisolasi, jadi tidak mengganggu aplikasi lain.
      - cloudflared  = kurir yang membuat "terowongan" dari internet ke
                       komputer Anda, sehingga domain bisa dibuka publik
                       tanpa perlu membuka port router.

.EXAMPLE
    cd C:\Project\ghani-jasa-secsion
    powershell -ExecutionPolicy Bypass -File .\scripts\windows\01-Install-Prasyarat.ps1
#>
[CmdletBinding()]
param(
    [switch]$SkipPowerSettings
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Write-Step([string]$Text) {
    Write-Host ""
    Write-Host "==> $Text" -ForegroundColor Cyan
}
function Write-Ok([string]$Text) { Write-Host "    [OK]  $Text" -ForegroundColor Green }
function Write-Warn2([string]$Text) { Write-Host "    [!!]  $Text" -ForegroundColor Yellow }
function Write-Bad([string]$Text) { Write-Host "    [XX]  $Text" -ForegroundColor Red }

function Assert-Administrator {
    $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Script ini harus dijalankan dari PowerShell sebagai Administrator (klik kanan > Run as administrator).'
    }
}

function Test-Command([string]$Name) {
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Install-WingetPackage([string]$Id, [string]$Label) {
    Write-Host "    Memasang $Label ($Id) ..." -ForegroundColor Gray
    & winget install --id $Id --exact --source winget `
        --accept-package-agreements --accept-source-agreements --disable-interactivity
    if ($LASTEXITCODE -ne 0) {
        Write-Warn2 "winget selesai dengan kode $LASTEXITCODE untuk $Id (biasanya karena sudah terpasang)."
    } else {
        Write-Ok "$Label terpasang."
    }
}

# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "  WebCraft Agency - Install Prasyarat Windows" -ForegroundColor White
Write-Host "  Domain target: https://ghani-jasa-secsion.sahir.my.id" -ForegroundColor DarkGray
Write-Host "  ------------------------------------------------------------" -ForegroundColor DarkGray

Assert-Administrator
Write-Ok 'Berjalan sebagai Administrator.'

Write-Step '1/5  Memeriksa Windows'
$os = Get-CimInstance Win32_OperatingSystem
Write-Host "    Sistem   : $($os.Caption) $($os.Version)" -ForegroundColor Gray
Write-Host "    Arsitektur: $env:PROCESSOR_ARCHITECTURE" -ForegroundColor Gray
if ([Environment]::OSVersion.Version.Major -lt 10) {
    Write-Warn2 'Windows 10/11 sangat disarankan. Versi lama mungkin tidak bisa menjalankan Docker Desktop.'
}

if (-not (Test-Command winget)) {
    throw 'winget (App Installer) tidak ditemukan. Buka Microsoft Store, pasang "App Installer", lalu jalankan ulang script ini.'
}
Write-Ok 'winget tersedia.'

Write-Step '2/5  Git'
if (Test-Command git) {
    Write-Ok "Sudah terpasang: $(git --version)"
} else {
    Install-WingetPackage -Id 'Git.Git' -Label 'Git'
    Write-Warn2 'Setelah Git terpasang, tutup lalu buka kembali PowerShell agar perintah "git" dikenali.'
}

Write-Step '3/5  Docker Desktop'
if (Test-Command docker) {
    $dockerVersion = (& docker --version) -join ''
    Write-Ok "Sudah terpasang: $dockerVersion"
} else {
    Install-WingetPackage -Id 'Docker.DockerDesktop' -Label 'Docker Desktop'
    Write-Warn2 'Docker Desktop baru bisa dipakai setelah komputer di-restart / login ulang.'
}

Write-Step '4/5  WSL 2 (mesin Linux ringan untuk Docker)'
$wslReady = $false
try {
    & wsl --status *> $null
    if ($LASTEXITCODE -eq 0) { $wslReady = $true }
} catch { $wslReady = $false }

if ($wslReady) {
    Write-Ok 'WSL sudah aktif.'
} else {
    Write-Warn2 'WSL belum aktif. Mencoba memasang (perlu restart setelah ini)...'
    & wsl --install --no-distribution
    Write-Warn2 'Kalau muncul pesan reboot, restart komputer, lalu jalankan script 02.'
}

Write-Step '5/5  cloudflared (opsional, untuk Opsi B)'
if (Test-Command cloudflared) {
    Write-Ok 'cloudflared sudah terpasang.'
} else {
    Install-WingetPackage -Id 'Cloudflare.cloudflared' -Label 'cloudflared'
}

if (-not $SkipPowerSettings) {
    Write-Step 'Bonus: mencegah komputer tidur (biar website tetap online)'
    try {
        & powercfg /change standby-timeout-ac 0
        & powercfg /change hibernate-timeout-ac 0
        & powercfg /change monitor-timeout-ac 15
        Write-Ok 'Komputer tidak akan tidur saat colokan listrik tersambung.'
    } catch {
        Write-Warn2 "Gagal mengubah pengaturan daya: $($_.Exception.Message)"
    }
}

Write-Host ""
Write-Host "  ------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  Selesai tahap 1." -ForegroundColor Green
Write-Host ""
Write-Host "  LANGKAH BERIKUTNYA:" -ForegroundColor White
Write-Host "    1. Tutup jendela PowerShell ini, buka lagi sebagai Administrator." -ForegroundColor Gray
Write-Host "    2. Buka Docker Desktop, tunggu sampai tulisan 'Engine running'." -ForegroundColor Gray
Write-Host "    3. Jalankan: .\scripts\windows\02-Siapkan-Config.ps1" -ForegroundColor Gray
Write-Host ""
