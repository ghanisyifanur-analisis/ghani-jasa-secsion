<#
.SYNOPSIS
    03 - Deploy / update website ke domain (inti dari CD).

.DESCRIPTION
    Satu perintah ini melakukan seluruh rantai deploy:
      1. Cek prasyarat & konfigurasi.
      2. (Opsional) backup database.
      3. ambil kode terbaru dari GitHub (git pull).
      4. bangun / ambil image Docker terbaru.
      5. nyalakan container (app + database + tunnel).
      6. tunggu sampai aplikasi benar-benar sehat.
      7. tes https://domain Anda.

    Analogi: ini seperti tombol "kirim paket" - kode dari GitHub dimasukkan
    ke kontainer, kontainer dinyalakan ulang, lalu terowongan Cloudflare
    langsung meneruskan pengunjung ke kontainer yang baru.

.PARAMETER SkipGitPull
    Jangan ambil kode baru dari GitHub (deploy apa yang ada di folder ini).

.PARAMETER UseRegistry
    Ambil image hasil build GitHub Actions (ghcr.io) alih-alih build lokal.
    Butuh "docker login ghcr.io" sekali saja.

.PARAMETER Rebuild
    Paksa build ulang image tanpa memakai cache.

.PARAMETER TunnelMode
    compose = cloudflared ikut dijalankan Docker (disarankan).
    windows = cloudflared sudah dipasang sebagai service Windows (Opsi B).
    none    = tidak menyentuh tunnel (hanya app + database).

.PARAMETER NoBackup
    Lewati backup database sebelum deploy.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\windows\03-Deploy.ps1

.EXAMPLE
    .\scripts\windows\03-Deploy.ps1 -SkipGitPull -Rebuild
#>
[CmdletBinding()]
param(
    [string]$Domain = 'ghani-jasa-secsion.sahir.my.id',
    [string]$Branch = 'main',
    [switch]$SkipGitPull,
    [switch]$UseRegistry,
    [switch]$Rebuild,
    [switch]$NoBackup,
    [ValidateSet('compose', 'windows', 'none')]
    [string]$TunnelMode = 'compose',
    [int]$HealthTimeoutSec = 180
)

$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$ComposeFile = Join-Path $RepoRoot 'docker-compose.prod.yml'
$EnvFile = Join-Path $RepoRoot '.env.production'
$BackupDir = Join-Path $RepoRoot 'backups'

$ComposeArgs = @('compose', '--env-file', $EnvFile, '-f', $ComposeFile)
if ($TunnelMode -eq 'compose') { $ComposeArgs += @('--profile', 'tunnel') }

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
        throw 'Jalankan PowerShell sebagai Administrator (klik kanan > Run as administrator).'
    }
}

function Compose {
    param([string[]]$Arguments, [switch]$AllowFailure)
    & docker @ComposeArgs @Arguments 2>&1 | ForEach-Object {
        Write-Host "      $_" -ForegroundColor DarkGray
    }
    if ($LASTEXITCODE -ne 0) {
        if ($AllowFailure) { return $false }
        throw "Perintah 'docker compose $($Arguments -join ' ')' gagal (kode $LASTEXITCODE)."
    }
    return $true
}

function Get-EnvValue {
    param([string]$Path, [string]$Key)
    $line = Get-Content -LiteralPath $Path |
        Where-Object { $_ -match "^[ \t]*$([regex]::Escape($Key))=" } |
        Select-Object -First 1
    if (-not $line) { return '' }
    return ($line -split '=', 2)[1].Trim()
}

function Test-Url {
    param([string]$Url, [int]$TimeoutSec = 15)
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
        return [pscustomobject]@{
            Ok     = ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400)
            Status = [int]$response.StatusCode
            Error  = ''
        }
    } catch {
        $status = 0
        if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
        return [pscustomobject]@{
            Ok     = $false
            Status = $status
            Error  = $_.Exception.Message
        }
    }
}

function Wait-AppHealthy {
    param([int]$TimeoutSec)
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        $status = (& docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' webcraft_app 2>$null)
        if ($status -eq 'healthy') { return $true }
        if ($status -eq 'unhealthy') { return $false }
        Start-Sleep -Seconds 5
    }
    return $false
}

# ===========================================================================
Write-Host ""
Write-Host "  WebCraft Agency - Deploy ke https://$Domain" -ForegroundColor White
Write-Host "  ------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  Folder : $RepoRoot" -ForegroundColor DarkGray
Write-Host "  Waktu  : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor DarkGray

try {
    Assert-Administrator
    Write-Ok 'Hak Administrator tersedia.'

    # -----------------------------------------------------------------------
    Write-Step '1/7  Memeriksa prasyarat'
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw 'Docker belum terpasang. Jalankan 01-Install-Prasyarat.ps1 lebih dulu.'
    }
    & docker info *> $null
    if ($LASTEXITCODE -ne 0) {
        throw 'Docker Engine belum menyala. Buka aplikasi Docker Desktop, tunggu sampai "Engine running", lalu ulangi.'
    }
    Write-Ok 'Docker Engine menyala.'

    if (-not (Test-Path $ComposeFile)) { throw "File compose tidak ditemukan: $ComposeFile" }
    if (-not (Test-Path $EnvFile)) {
        throw "File .env.production belum ada. Jalankan 02-Siapkan-Config.ps1 dulu."
    }
    if ([string]::IsNullOrWhiteSpace((Get-EnvValue $EnvFile 'APP_KEY'))) {
        throw 'APP_KEY masih kosong di .env.production. Jalankan 02-Siapkan-Config.ps1 -Force.'
    }
    Write-Ok '.env.production valid.'

    if ($TunnelMode -eq 'compose' -and [string]::IsNullOrWhiteSpace((Get-EnvValue $EnvFile 'CLOUDFLARE_TUNNEL_TOKEN'))) {
        throw 'Token tunnel kosong. Isi CLOUDFLARE_TUNNEL_TOKEN di .env.production (lihat docs/DEPLOY-WINDOWS.md bagian 6), atau jalankan dengan -TunnelMode windows bila cloudflared dipasang sebagai service Windows.'
    }

    # -----------------------------------------------------------------------
    Write-Step '2/7  Backup database (kalau container sudah jalan)'
    if ($NoBackup) {
        Write-Warn2 'Dilewati karena -NoBackup.'
    } else {
        $dbContainer = (& docker ps --filter 'name=webcraft_db' --format '{{.Names}}' 2>$null)
        if ($dbContainer -match 'webcraft_db') {
            if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir | Out-Null }
            $dbUser = Get-EnvValue $EnvFile 'DB_USERNAME'
            $dbName = Get-EnvValue $EnvFile 'DB_DATABASE'
            if (-not $dbUser) { $dbUser = 'webcraft_user' }
            if (-not $dbName) { $dbName = 'webcraft_db' }
            $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
            $target = Join-Path $BackupDir "db-$stamp.sql"
            try {
                & docker exec webcraft_db pg_dump -U $dbUser -d $dbName -f /tmp/backup.sql
                if ($LASTEXITCODE -eq 0) {
                    & docker cp "webcraft_db:/tmp/backup.sql" $target *> $null
                    & docker exec webcraft_db rm -f /tmp/backup.sql *> $null
                    Write-Ok "Backup: $target"
                    # simpan 10 backup terbaru saja
                    Get-ChildItem $BackupDir -Filter 'db-*.sql' |
                        Sort-Object LastWriteTime -Descending |
                        Select-Object -Skip 10 |
                        Remove-Item -Force -ErrorAction SilentlyContinue
                } else {
                    Write-Warn2 'pg_dump gagal; deploy tetap dilanjutkan.'
                }
            } catch {
                Write-Warn2 "Backup gagal: $($_.Exception.Message)"
            }
        } else {
            Write-Warn2 'Database belum jalan (deploy pertama), backup dilewati.'
        }
    }

    # -----------------------------------------------------------------------
    Write-Step "3/7  Mengambil kode terbaru (branch $Branch)"
    if ($SkipGitPull) {
        Write-Warn2 'Dilewati karena -SkipGitPull.'
    } elseif (-not (Test-Path (Join-Path $RepoRoot '.git'))) {
        Write-Warn2 'Folder ini bukan repo git, git pull dilewati.'
    } else {
        $currentBranch = (& git -C $RepoRoot rev-parse --abbrev-ref HEAD).Trim()
        if ($currentBranch -ne $Branch) {
            Write-Warn2 "Branch aktif '$currentBranch' (bukan '$Branch'), git pull dilewati."
        } else {
            & git -C $RepoRoot fetch --prune origin $Branch
            if ($LASTEXITCODE -ne 0) { throw 'git fetch gagal. Periksa koneksi internet / akses repo.' }
            & git -C $RepoRoot pull --ff-only origin $Branch
            if ($LASTEXITCODE -ne 0) {
                throw "git pull gagal. Selesaikan perubahan lokal dulu (git stash / git commit), lalu ulangi."
            }
            $commit = (& git -C $RepoRoot log -1 --pretty='%h %s').Trim()
            Write-Ok "Kode terbaru: $commit"
        }
    }

    # -----------------------------------------------------------------------
    Write-Step '4/7  Menyiapkan image aplikasi'
    $needsBuild = $false
    if ($UseRegistry) {
        Write-Host '    Mengambil image dari GHCR ...' -ForegroundColor Gray
        if (-not (Compose -Arguments @('pull', 'app') -AllowFailure)) {
            Write-Warn2 'Pull image gagal (mungkin belum "docker login ghcr.io"). Lanjut build lokal.'
            $needsBuild = $true
        } else {
            Write-Ok 'Image GHCR terbaru diambil.'
        }
    }
    if ($Rebuild -or $needsBuild -or -not $UseRegistry) {
        Write-Host '    Build image lokal (sekali saja, berikutnya cepat karena cache) ...' -ForegroundColor Gray
        $buildArgs = @('build')
        if ($Rebuild) { $buildArgs += '--no-cache' }
        $buildArgs += @('app')
        Compose -Arguments $buildArgs | Out-Null
        Write-Ok 'Image siap.'
    }

    # -----------------------------------------------------------------------
    Write-Step '5/7  Menyalakan container'
    # Kalau nama service disebut, docker compose hanya mengurus service itu:
    # app + db saja, tanpa menyentuh cloudflared milik Windows.
    if ($TunnelMode -eq 'compose') {
        $upServices = @('up', '-d')
    } else {
        $upServices = @('up', '-d', 'app', 'db')
    }
    Compose -Arguments $upServices | Out-Null
    Write-Ok 'Container dinyalakan.'

    # -----------------------------------------------------------------------
    Write-Step ('6/7  Menunggu aplikasi sehat (maksimal ' + $HealthTimeoutSec + ' detik)')
    if (Wait-AppHealthy -TimeoutSec $HealthTimeoutSec) {
        Write-Ok 'Aplikasi sehat (health-check /up lulus).'
    } else {
        Write-Bad 'Aplikasi tidak sehat. Menampilkan 120 baris log terakhir:'
        Compose -Arguments @('logs', '--tail', '120', 'app') -AllowFailure | Out-Null
        throw 'Deploy gagal: container app tidak sehat. Periksa log di atas.'
    }

    $local = Test-Url -Url 'http://127.0.0.1:8080/up'
    if ($local.Ok) { Write-Ok "Lokal  : http://127.0.0.1:8080 -> $($local.Status)" }
    else { Write-Warn2 "Lokal  : gagal ($($local.Error))" }

    # -----------------------------------------------------------------------
    Write-Step "7/7  Menguji domain publik https://$Domain"
    $publicOk = $false
    for ($i = 1; $i -le 6; $i++) {
        $public = Test-Url -Url "https://$Domain/up" -TimeoutSec 20
        if ($public.Ok) {
            Write-Ok "Publik : https://$Domain/up -> $($public.Status)"
            $publicOk = $true
            break
        }
        Write-Host "    Percobaan $i/6 belum berhasil ($($public.Status) $($public.Error)) - tunggu 10 detik ..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    }
    if (-not $publicOk) {
        Write-Warn2 'Domain belum merespons. Biasanya karena tunnel belum tersambung.'
        Write-Host '    Cek: .\scripts\windows\04-Status.ps1' -ForegroundColor Gray
        Write-Host '    Log tunnel: docker logs webcraft_tunnel --tail 50' -ForegroundColor Gray
    }

    # -----------------------------------------------------------------------
    Write-Host ""
    Write-Host "  ------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  DEPLOY SELESAI" -ForegroundColor Green
    Write-Host "    Website   : https://$Domain" -ForegroundColor White
    Write-Host "    Login demo: https://$Domain/login" -ForegroundColor White
    Write-Host "    Admin     : admin@webcraft.id / admin123" -ForegroundColor Gray
    Write-Host "    Klien     : klien@webcraft.id / klien123" -ForegroundColor Gray
    Write-Host "    Status    : .\scripts\windows\04-Status.ps1" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Bad $_.Exception.Message
    Write-Host ""
    Write-Host "  Tips: buka Docker Desktop, lalu cek log dengan:" -ForegroundColor Yellow
    Write-Host "    docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail 100 app" -ForegroundColor Gray
    exit 1
}
