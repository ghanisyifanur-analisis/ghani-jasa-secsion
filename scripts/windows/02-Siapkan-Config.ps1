<#
.SYNOPSIS
    02 - Membuat file .env.production (kunci aplikasi, password database, token tunnel).

.DESCRIPTION
    File .env.production adalah "lemari kunci" aplikasi. Isinya:
      - APP_KEY          : kunci enkripsi sesi login.
      - DB_PASSWORD      : password PostgreSQL.
      - CLOUDFLARE_TUNNEL_TOKEN : token terowongan Cloudflare.

    File ini TIDAK pernah dikirim ke GitHub (sudah masuk .gitignore),
    jadi aman menyimpan rahasia di dalamnya.

.PARAMETER TunnelToken
    Token dari Cloudflare Zero Trust. Kalau tidak diisi, script akan menanyakan.

.PARAMETER DbPassword
    Password database. Kalau tidak diisi, dibuat otomatis secara acak.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\windows\02-Siapkan-Config.ps1
#>
[CmdletBinding()]
param(
    [string]$Domain = 'ghani-jasa-secsion.sahir.my.id',
    [string]$TunnelToken = '',
    [string]$DbPassword = '',
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$EnvFile = Join-Path $RepoRoot '.env.production'
$Template = Join-Path $RepoRoot '.env.production.example'

function Write-Step([string]$Text) {
    Write-Host ""
    Write-Host "==> $Text" -ForegroundColor Cyan
}
function Write-Ok([string]$Text) { Write-Host "    [OK]  $Text" -ForegroundColor Green }
function Write-Warn2([string]$Text) { Write-Host "    [!!]  $Text" -ForegroundColor Yellow }

function Assert-Administrator {
    $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Jalankan PowerShell sebagai Administrator dulu.'
    }
}

function New-RandomString([int]$Length = 24) {
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
    $bytes = New-Object byte[] $Length
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $out = New-Object System.Text.StringBuilder
    foreach ($b in $bytes) { [void]$out.Append($chars[$b % $chars.Length]) }
    return $out.ToString()
}

function New-AppKey {
    $bytes = New-Object byte[] 32
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return 'base64:' + [Convert]::ToBase64String($bytes)
}

function Set-EnvValue {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Key,
        [Parameter(Mandatory)][AllowEmptyString()][string]$Value
    )
    $content = Get-Content -LiteralPath $Path -Raw
    $pattern = '(?m)^[ \t]*#?[ \t]*' + [regex]::Escape($Key) + '=.*$'
    $newLine = "$Key=$Value"
    $regex = New-Object System.Text.RegularExpressions.Regex($pattern)
    if ($regex.IsMatch($content)) {
        $content = $regex.Replace($content, $newLine, 1)
    } else {
        $content = $content.TrimEnd() + "`r`n$newLine`r`n"
    }
    # Tulis tanpa BOM: file .env ber-BOM membuat baris pertama gagal dibaca
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $content, $utf8NoBom)
}

function Get-EnvValue {
    param([string]$Path, [string]$Key)
    $line = Get-Content -LiteralPath $Path | Where-Object { $_ -match "^\s*$([regex]::Escape($Key))=" } | Select-Object -First 1
    if (-not $line) { return '' }
    return ($line -split '=', 2)[1].Trim()
}

# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "  WebCraft Agency - Siapkan Konfigurasi Produksi" -ForegroundColor White
Write-Host "  ------------------------------------------------------------" -ForegroundColor DarkGray

Assert-Administrator
Write-Ok 'Berjalan sebagai Administrator.'

Write-Step '1/5  Memeriksa file template'
if (-not (Test-Path $Template)) { throw "Template tidak ditemukan: $Template" }
Write-Ok "Template: $Template"

if (Test-Path $EnvFile) {
    if (-not $Force) {
        Write-Warn2 "File .env.production SUDAH ADA. Tidak ada yang diubah."
        Write-Host "    Kalau memang ingin membuat ulang, jalankan dengan -Force." -ForegroundColor Gray
        Write-Host "    Token saat ini: $(if ((Get-EnvValue $EnvFile 'CLOUDFLARE_TUNNEL_TOKEN')) { 'terisi' } else { 'KOSONG' })" -ForegroundColor Gray
        return
    }
    $backup = "$EnvFile.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $EnvFile $backup
    Write-Warn2 "File lama dicadangkan ke: $backup"
}

Write-Step '2/5  Menyalin template'
Copy-Item $Template $EnvFile -Force
Write-Ok ".env.production dibuat di $EnvFile"

Write-Step '3/5  Token Cloudflare Tunnel'
if (-not $TunnelToken) {
    Write-Host "    Tempel token dari Cloudflare (biasanya diawali 'eyJ...')." -ForegroundColor Gray
    Write-Host "    Kalau Anda memilih Opsi B (cloudflared sebagai service Windows), boleh kosongkan." -ForegroundColor Gray
    $TunnelToken = (Read-Host '    Token').Trim()
}
if ([string]::IsNullOrWhiteSpace($TunnelToken)) {
    Write-Warn2 'Token kosong. Tunnel lewat Docker tidak akan jalan; isi nanti atau pakai Opsi B.'
} else {
    Set-EnvValue -Path $EnvFile -Key 'CLOUDFLARE_TUNNEL_TOKEN' -Value $TunnelToken
    Write-Ok "Token disimpan ($($TunnelToken.Length) karakter)."
}

Write-Step '4/5  Kunci aplikasi & password database'
Set-EnvValue -Path $EnvFile -Key 'APP_KEY' -Value (New-AppKey)
Write-Ok 'APP_KEY baru dibuat (32 byte acak, aman).'

if ([string]::IsNullOrWhiteSpace($DbPassword)) {
    $DbPassword = New-RandomString -Length 28
    Write-Ok 'Password database dibuat otomatis (acak 28 karakter).'
}
Set-EnvValue -Path $EnvFile -Key 'DB_PASSWORD' -Value $DbPassword
Set-EnvValue -Path $EnvFile -Key 'APP_URL' -Value "https://$Domain"
Write-Ok "APP_URL diset ke https://$Domain"

Write-Step '5/5  Mengunci akses file'
try {
    & icacls $EnvFile /inheritance:r /grant:r "Administrators:F" "$env:USERNAME:F" *> $null
    Write-Ok 'Hanya Administrator & akun Anda yang bisa membaca file ini.'
} catch {
    Write-Warn2 "Tidak bisa mengubah izin file: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "  ------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  Ringkasan konfigurasi" -ForegroundColor White
Write-Host "    Domain          : https://$Domain" -ForegroundColor Gray
Write-Host "    Tunnel token    : $(if ($TunnelToken) { 'terisi' } else { 'KOSONG' })" -ForegroundColor Gray
Write-Host "    Password DB     : $DbPassword" -ForegroundColor Gray
Write-Host "    File            : $EnvFile" -ForegroundColor Gray
Write-Host ""
Write-Host "  CATAT password database di atas. File .env.production jangan dibagikan." -ForegroundColor Yellow
Write-Host ""
Write-Host "  LANGKAH BERIKUTNYA:" -ForegroundColor White
Write-Host "    - Buat tunnel di Cloudflare bila belum (lihat docs/DEPLOY-WINDOWS.md bagian 6)." -ForegroundColor Gray
Write-Host "    - Jalankan: .\scripts\windows\03-Deploy.ps1" -ForegroundColor Gray
Write-Host ""
