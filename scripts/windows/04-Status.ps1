<#
.SYNOPSIS
    04 - Melihat kondisi website: container, kesehatan, tunnel, disk, log.

.DESCRIPTION
    Ibarat dasbor mobil: tanpa mengubah apa pun, script ini memberi tahu
    apakah mesin (container) hidup, apakah pintu (tunnel) terbuka, dan
    apakah domain merespons.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\windows\04-Status.ps1

.EXAMPLE
    .\scripts\windows\04-Status.ps1 -LogLines 200
#>
[CmdletBinding()]
param(
    [string]$Domain = 'ghani-jasa-secsion.sahir.my.id',
    [int]$LogLines = 40
)

$ErrorActionPreference = 'Continue'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$ComposeFile = Join-Path $RepoRoot 'docker-compose.prod.yml'
$EnvFile = Join-Path $RepoRoot '.env.production'
$BackupDir = Join-Path $RepoRoot 'backups'

$compose = @('compose', '--env-file', $EnvFile, '-f', $ComposeFile, '--profile', 'tunnel')

function Write-Step([string]$Text) {
    Write-Host ""
    Write-Host "==> $Text" -ForegroundColor Cyan
}

function Test-Url {
    param([string]$Url, [int]$TimeoutSec = 15)
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
        return [pscustomobject]@{ Ok = ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400); Status = [int]$r.StatusCode; Error = '' }
    } catch {
        $status = 0
        if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
        return [pscustomobject]@{ Ok = $false; Status = $status; Error = $_.Exception.Message }
    }
}

Write-Host ""
Write-Host "  WebCraft Agency - Status" -ForegroundColor White
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor DarkGray
Write-Host "  ------------------------------------------------------------" -ForegroundColor DarkGray

Write-Step 'Container'
& docker @compose ps
if ($LASTEXITCODE -ne 0) {
    Write-Host '    Docker belum menyala / compose belum pernah dijalankan.' -ForegroundColor Yellow
}

Write-Step 'Kesehatan aplikasi'
foreach ($name in @('webcraft_app', 'webcraft_db', 'webcraft_tunnel')) {
    $status = (& docker inspect --format '{{.State.Status}}' $name 2>$null)
    if (-not $status) { $status = 'tidak ada' }
    $health = (& docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}-{{end}}' $name 2>$null)
    if (-not $health) { $health = '-' }
    $color = if ($status -eq 'running') { 'Green' } else { 'Red' }
    Write-Host ("    {0,-16} status={1,-10} health={2}" -f $name, $status, $health) -ForegroundColor $color
}

Write-Step 'Akses lokal & publik'
$local = Test-Url 'http://127.0.0.1:8080/up'
Write-Host ("    Lokal  : http://127.0.0.1:8080/up -> {0} {1}" -f $local.Status, $local.Error) -ForegroundColor $(if ($local.Ok) { 'Green' } else { 'Red' })
$public = Test-Url "https://$Domain/up"
Write-Host ("    Publik : https://$Domain/up -> {0} {1}" -f $public.Status, $public.Error) -ForegroundColor $(if ($public.Ok) { 'Green' } else { 'Red' })
$home = Test-Url "https://$Domain/"
Write-Host ("    Halaman: https://$Domain/ -> {0}" -f $home.Status) -ForegroundColor $(if ($home.Ok) { 'Green' } else { 'Red' })

Write-Step 'Penggunaan disk (Docker)'
& docker system df 2>$null

Write-Step 'Backup database terakhir'
if (Test-Path $BackupDir) {
    Get-ChildItem $BackupDir -Filter 'db-*.sql' |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 5 Name, @{N = 'UkuranMB'; E = { [math]::Round($_.Length / 1MB, 2) } }, LastWriteTime |
        Format-Table -AutoSize
} else {
    Write-Host '    Belum ada folder backups.' -ForegroundColor Gray
}

Write-Step "Log aplikasi terakhir ($LogLines baris)"
& docker @compose logs --tail $LogLines app 2>$null

Write-Step 'Log tunnel terakhir (10 baris)'
& docker logs webcraft_tunnel --tail 10 2>&1 | Select-Object -Last 10

Write-Host ""
Write-Host "  Selesai. Perintah berguna:" -ForegroundColor DarkGray
Write-Host "    Restart       : .\scripts\windows\03-Deploy.ps1 -SkipGitPull" -ForegroundColor Gray
Write-Host "    Matikan       : docker compose --env-file .env.production -f docker-compose.prod.yml down" -ForegroundColor Gray
Write-Host ""
