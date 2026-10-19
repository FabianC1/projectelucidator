$ErrorActionPreference = 'Stop'
$startupShortcut = Join-Path ([Environment]::GetFolderPath('Startup')) 'Elucidator Brightness Helper.lnk'
if (Test-Path -LiteralPath $startupShortcut) { Remove-Item -LiteralPath $startupShortcut -Force }

$installDirectory = Join-Path $env:LOCALAPPDATA 'ProjectElucidator'
$helperPath = Join-Path $installDirectory 'brightness-helper.ps1'
$tokenPath = Join-Path $installDirectory 'brightness.token'
Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -and $_.CommandLine.Contains($helperPath) } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
if (Test-Path -LiteralPath $helperPath) { Remove-Item -LiteralPath $helperPath -Force }
if (Test-Path -LiteralPath $tokenPath) { Remove-Item -LiteralPath $tokenPath -Force }
Write-Host 'Elucidator brightness helper removed. The app pairing remains in browser storage; use sys brightness unpair to clear it.' -ForegroundColor Cyan
