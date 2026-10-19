$ErrorActionPreference = 'Stop'

$source = Join-Path $PSScriptRoot 'brightness-helper.ps1'
if (-not (Test-Path -LiteralPath $source)) { throw "Helper script not found: $source" }

$installDirectory = Join-Path $env:LOCALAPPDATA 'ProjectElucidator'
New-Item -ItemType Directory -Path $installDirectory -Force | Out-Null
$installedHelper = Join-Path $installDirectory 'brightness-helper.ps1'
$tokenPath = Join-Path $installDirectory 'brightness.token'
Copy-Item -LiteralPath $source -Destination $installedHelper -Force

if (-not (Test-Path -LiteralPath $tokenPath)) {
  $bytes = New-Object byte[] 32
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
  $token = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
  [IO.File]::WriteAllText($tokenPath, $token, [Text.Encoding]::ASCII)
} else {
  $token = [IO.File]::ReadAllText($tokenPath).Trim()
}

$startupDirectory = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupDirectory 'Elucidator Brightness Helper.lnk'
$powerShellPath = Join-Path $PSHOME 'powershell.exe'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $powerShellPath
$shortcut.Arguments = "-NoLogo -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$installedHelper`" -TokenPath `"$tokenPath`""
$shortcut.WorkingDirectory = $installDirectory
$shortcut.WindowStyle = 7
$shortcut.Description = 'Local DDC/CI brightness bridge for Project Elucidator'
$shortcut.Save()

$runningHelpers = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -and $_.CommandLine.Contains($installedHelper) }
foreach ($process in $runningHelpers) {
  Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Milliseconds 300
Start-Process -FilePath $powerShellPath -WindowStyle Hidden -ArgumentList @(
  '-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden',
  '-File', "`"$installedHelper`"", '-TokenPath', "`"$tokenPath`""
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
Write-Host 'ELUCIDATOR DDC/CI HELPER INSTALLED' -ForegroundColor Cyan
Write-Host "Startup: $shortcutPath"
if ($helperReady) { Write-Host 'Helper service: ONLINE' -ForegroundColor Green }
else { Write-Warning 'Helper service did not start. Check PowerShell or Windows security logs before pairing.' }
Write-Host 'Pair this Elucidator app once with:'
Write-Host "sys brightness pair $token" -ForegroundColor Yellow
Write-Host 'Then try: sys brightness status | sys brightness 40 | sys brightness monitor 1 60'
Write-Host 'Keep DDC/CI enabled in each monitor OSD. You can remove it with uninstall-brightness-helper.ps1.'
