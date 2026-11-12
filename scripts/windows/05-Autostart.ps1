<#
.SYNOPSIS
    05 - Membuat website otomatis hidup setelah komputer dinyalakan/ restart.

.DESCRIPTION
    Script ini mendaftarkan 2 Scheduled Task di Windows:
      1. GhaniJasaSecsion-DockerDesktop : membuka Docker Desktop saat login.
      2. GhaniJasaSecsion-StartStack    : menjalankan container 60 detik
                                          setelah login (menunggu Docker siap).

    Tanpa ini, website akan mati setiap kali komputer restart. Dengan ini,
    domain tetap online selama komputernya menyala dan tersambung internet.

.PARAMETER Remove
    Menghapus kedua Scheduled Task (website tidak lagi auto-start).

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\windows\05-Autostart.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\windows\05-Autostart.ps1 -Remove
#>
[CmdletBinding()]
param(
    [switch]$Remove
)

$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$StartScript = Join-Path $PSScriptRoot '06-Start-Stack.ps1'
$TaskStartStack = 'GhaniJasaSecsion-StartStack'
$TaskDockerDesktop = 'GhaniJasaSecsion-DockerDesktop'

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

Assert-Administrator
Write-Host ""
Write-Host "  WebCraft Agency - Auto-start setelah restart" -ForegroundColor White
Write-Host "  ------------------------------------------------------------" -ForegroundColor DarkGray

if ($Remove) {
    Write-Step 'Menghapus Scheduled Task'
    foreach ($name in @($TaskStartStack, $TaskDockerDesktop)) {
        $existing = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
        if ($existing) {
            Unregister-ScheduledTask -TaskName $name -Confirm:$false
            Write-Ok "Dihapus: $name"
        } else {
            Write-Warn2 "Tidak ada: $name"
        }
    }
    Write-Host ""
    Write-Host "  Website tidak lagi otomatis menyala saat restart." -ForegroundColor Yellow
    Write-Host ""
    return
}

if (-not (Test-Path $StartScript)) { throw "File tidak ditemukan: $StartScript" }

$user = "$env:USERDOMAIN\$env:USERNAME"
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

# ---------------------------------------------------------------------------
Write-Step '1/3  Task: buka Docker Desktop saat login'
$dockerExe = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
if (Test-Path $dockerExe) {
    $actionDocker = New-ScheduledTaskAction -Execute $dockerExe
    $triggerDocker = New-ScheduledTaskTrigger -AtLogOn -User $user
    Register-ScheduledTask -TaskName $TaskDockerDesktop -Action $actionDocker -Trigger $triggerDocker `
        -Principal $principal -Settings $settings -Force | Out-Null
    Write-Ok "Terdaftar: $TaskDockerDesktop"
} else {
    Write-Warn2 "Docker Desktop.exe tidak ditemukan di $dockerExe"
    Write-Host '    Aktifkan manual: Docker Desktop > Settings > General > Start Docker Desktop when you sign in.' -ForegroundColor Gray
}

Write-Step '2/3  Task: nyalakan container 60 detik setelah login'
$arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $StartScript + '"'
$actionStack = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments -WorkingDirectory $RepoRoot
$triggerStack = New-ScheduledTaskTrigger -AtLogOn -User $user
$triggerStack.Delay = 'PT1M'
Register-ScheduledTask -TaskName $TaskStartStack -Action $actionStack -Trigger $triggerStack `
    -Principal $principal -Settings $settings -Force | Out-Null
Write-Ok "Terdaftar: $TaskStartStack"

Write-Step '3/3  Menguji task sekarang'
Start-ScheduledTask -TaskName $TaskStartStack
Start-Sleep -Seconds 5
$info = Get-ScheduledTaskInfo -TaskName $TaskStartStack
Write-Ok "Task dijalankan. Status terakhir: $($info.LastTaskResult)"

Write-Host ""
Write-Host "  ------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  Auto-start aktif." -ForegroundColor Green
Write-Host "    Cek hasil : .\scripts\windows\04-Status.ps1" -ForegroundColor Gray
Write-Host "    Log file  : $RepoRoot\storage\logs\autostart.log" -ForegroundColor Gray
Write-Host "    Matikan   : .\scripts\windows\05-Autostart.ps1 -Remove" -ForegroundColor Gray
Write-Host ""
Write-Host "  CATATAN PENTING:" -ForegroundColor Yellow
Write-Host "    Website hanya online saat komputer MENYALA, tidak sleep, dan" -ForegroundColor Gray
Write-Host "    tersambung internet. Untuk 24/7 penuh, pindahkan setup yang sama" -ForegroundColor Gray
Write-Host "    ke VPS Linux (lihat docs/DEPLOY-WINDOWS.md bagian 14)." -ForegroundColor Gray
Write-Host ""
