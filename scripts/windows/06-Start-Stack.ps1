<#
.SYNOPSIS
    06 - Menyalakan stack (dipanggil otomatis oleh Scheduled Task).

.DESCRIPTION
    Menunggu Docker Engine siap, lalu menjalankan container. Aman dijalankan
    berkali-kali: kalau sudah hidup, tidak terjadi apa-apa.

    Semua kegiatan dicatat ke storage\logs\autostart.log supaya mudah
    ditelusuri kalau website tidak muncul setelah restart.
#>
[CmdletBinding()]
param(
    [int]$WaitDockerSec = 300,
    [ValidateSet('compose', 'windows', 'none')]
    [string]$TunnelMode = 'compose'
)

$ErrorActionPreference = 'Continue'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$ComposeFile = Join-Path $RepoRoot 'docker-compose.prod.yml'
$EnvFile = Join-Path $RepoRoot '.env.production'
$LogDir = Join-Path $RepoRoot 'storage\logs'
$LogFile = Join-Path $LogDir 'autostart.log'

if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

function Write-Log([string]$Message) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
    Add-Content -LiteralPath $LogFile -Value $line -Encoding UTF8
    Write-Host $line
}

Write-Log '--- auto-start dimulai ---'

if (-not (Test-Path $EnvFile)) {
    Write-Log "GAGAL: $EnvFile tidak ditemukan. Jalankan 02-Siapkan-Config.ps1."
    exit 1
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Log 'GAGAL: perintah docker tidak ditemukan.'
    exit 1
}

Write-Log 'Menunggu Docker Engine ...'
$deadline = (Get-Date).AddSeconds($WaitDockerSec)
while ((Get-Date) -lt $deadline) {
    & docker info *> $null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 10
}
& docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Log "GAGAL: Docker Engine tidak siap setelah $WaitDockerSec detik. Buka Docker Desktop lalu cek 04-Status.ps1."
    exit 1
}
Write-Log 'Docker Engine siap.'

$compose = @('compose', '--env-file', $EnvFile, '-f', $ComposeFile)
if ($TunnelMode -eq 'compose') { $compose += @('--profile', 'tunnel') }

& docker @compose up -d 2>&1 | ForEach-Object { Add-Content -LiteralPath $LogFile -Value $_ -Encoding UTF8 }
if ($LASTEXITCODE -ne 0) {
    Write-Log "GAGAL: docker compose up keluar dengan kode $LASTEXITCODE."
    exit 1
}
Write-Log 'Container dinyalakan.'

# Tunggu singkat lalu cek /up
$ok = $false
for ($i = 0; $i -lt 24; $i++) {
    Start-Sleep -Seconds 5
    try {
        $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8080/up' -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $ok = $true; break }
    } catch { }
}

if ($ok) { Write-Log 'Aplikasi merespons (health-check 200 OK).' }
else { Write-Log 'PERINGATAN: aplikasi belum merespons di http://127.0.0.1:8080/up.' }

Write-Log '--- auto-start selesai ---'
