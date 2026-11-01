$ErrorActionPreference = 'Stop'

$source = Join-Path $PSScriptRoot 'brightness-helper.ps1'
if (-not (Test-Path -LiteralPath $source)) { throw "Helper script not found: $source" }
$watchdogSource = Join-Path $PSScriptRoot 'brightness-watchdog.ps1'
if (-not (Test-Path -LiteralPath $watchdogSource)) { throw "Watchdog script not found: $watchdogSource" }

$installDirectory = Join-Path $env:LOCALAPPDATA 'ProjectElucidator'
New-Item -ItemType Directory -Path $installDirectory -Force | Out-Null
$installedHelper = Join-Path $installDirectory 'brightness-helper.ps1'
$installedWatchdog = Join-Path $installDirectory 'brightness-watchdog.ps1'
$tokenPath = Join-Path $installDirectory 'brightness.token'
Copy-Item -LiteralPath $source -Destination $installedHelper -Force
Copy-Item -LiteralPath $watchdogSource -Destination $installedWatchdog -Force

if (-not (Test-Path -LiteralPath $tokenPath)) {
  $bytes = New-Object byte[] 32
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
  $token = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
  [IO.File]::WriteAllText($tokenPath, $token, [Text.Encoding]::ASCII)
}

$taskName = 'Elucidator Windows Bridge'
$powerShellPath = Join-Path $PSHOME 'powershell.exe'

$taskArguments = "-NoLogo -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$installedWatchdog`" -HelperPath `"$installedHelper`" -TokenPath `"$tokenPath`""

$action = New-ScheduledTaskAction `
  -Execute $powerShellPath `
  -Argument $taskArguments `
  -WorkingDirectory $installDirectory

$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent().Name

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser

$settings = New-ScheduledTaskSettingsSet `
  -ExecutionTimeLimit (New-TimeSpan -Seconds 0) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew

$principal = New-ScheduledTaskPrincipal `
  -UserId $currentUser `
  -LogonType Interactive `
  -RunLevel Limited

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Description 'Starts the Project Elucidator Windows Bridge watchdog at sign-in.' `
  -Force | Out-Null

# Remove obsolete Startup shortcuts after successful registration.
$startupDirectory = [Environment]::GetFolderPath('Startup')

foreach ($shortcutName in @(
  'Elucidator Windows Bridge.lnk',
  'Elucidator Windows Bridge.lnk.disabled',
  'Elucidator Brightness Helper.lnk'
)) {
  $shortcutPath = Join-Path $startupDirectory $shortcutName

  if (Test-Path -LiteralPath $shortcutPath) {
    Remove-Item -LiteralPath $shortcutPath -Force
  }
}

$runningProcesses = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -and ($_.CommandLine.Contains($installedHelper) -or $_.CommandLine.Contains($installedWatchdog)) }
foreach ($process in $runningProcesses) {
  Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Milliseconds 300
Start-Process -FilePath $powerShellPath -WindowStyle Hidden -ArgumentList @(
  '-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden',
  '-File', "`"$installedWatchdog`"", '-HelperPath', "`"$installedHelper`"", '-TokenPath', "`"$tokenPath`""
) | Out-Null

$helperReady = $false
for ($attempt = 0; $attempt -lt 12; $attempt++) {
  Start-Sleep -Milliseconds 250
  try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:17384/health' -TimeoutSec 1
    if ($health.available) { $helperReady = $true; break }
  } catch { }
}

Write-Host ''
Write-Host 'ELUCIDATOR WINDOWS BRIDGE INSTALLED' -ForegroundColor Cyan
Write-Host "Startup watchdog: Scheduled Task ($taskName)"
if ($helperReady) { Write-Host 'DDC/CI bridge: ONLINE · WATCHDOG ACTIVE' -ForegroundColor Green }
else { Write-Warning 'DDC/CI bridge did not start. The watchdog will retry; check PowerShell or Windows security logs if it stays offline.' }
Write-Host 'The pairing credential is stored locally; it is never printed by this installer.'
Write-Host "To pair once, read $tokenPath on this PC and enter: sys brightness pair <TOKEN>" -ForegroundColor Yellow
Write-Host 'Then try: sys brightness status | sys brightness 40 | sys brightness monitor 1 60'
Write-Host 'Pairing also writes a current-user-only credential bootstrap into the active Project Elucidator wallpaper folder.'
Write-Host 'ADMIN SYS CONFIG SAVE writes the startup manifest and image under the active wallpaper and asks Lively to reload that same folder.'
Write-Host 'The private bootstrap is excluded from the generated wallpaper package and helper configuration response.'
Write-Host 'Keep DDC/CI enabled in each monitor OSD. You can remove it with uninstall-brightness-helper.ps1.'
