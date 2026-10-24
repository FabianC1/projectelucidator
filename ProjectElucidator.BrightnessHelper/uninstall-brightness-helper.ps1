$ErrorActionPreference = 'Stop'
$startupDirectory = [Environment]::GetFolderPath('Startup')
foreach ($shortcutName in @('Elucidator Windows Bridge.lnk', 'Elucidator Brightness Helper.lnk')) {
  $startupShortcut = Join-Path $startupDirectory $shortcutName
  if (Test-Path -LiteralPath $startupShortcut) { Remove-Item -LiteralPath $startupShortcut -Force }
}

$installDirectory = Join-Path $env:LOCALAPPDATA 'ProjectElucidator'
$helperPath = Join-Path $installDirectory 'brightness-helper.ps1'
$watchdogPath = Join-Path $installDirectory 'brightness-watchdog.ps1'
$tokenPath = Join-Path $installDirectory 'brightness.token'
Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -and ($_.CommandLine.Contains($helperPath) -or $_.CommandLine.Contains($watchdogPath)) } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
if (Test-Path -LiteralPath $helperPath) { Remove-Item -LiteralPath $helperPath -Force }
if (Test-Path -LiteralPath $watchdogPath) { Remove-Item -LiteralPath $watchdogPath -Force }
if (Test-Path -LiteralPath $tokenPath) { Remove-Item -LiteralPath $tokenPath -Force }
Write-Host 'Elucidator Windows helper removed. Its startup configuration files are retained under LocalAppData\ProjectElucidator\startup.' -ForegroundColor Cyan
