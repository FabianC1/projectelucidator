param(
  [string]$HelperPath = (Join-Path $env:LOCALAPPDATA 'ProjectElucidator\brightness-helper.ps1'),
  [string]$TokenPath = (Join-Path $env:LOCALAPPDATA 'ProjectElucidator\brightness.token'),
  [int]$Port = 17384
)

$ErrorActionPreference = 'SilentlyContinue'
$mutex = [System.Threading.Mutex]::new($false, 'Local\ProjectElucidatorBrightnessWatchdog')
$ownsMutex = $false
try { $ownsMutex = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $ownsMutex = $true }
if (-not $ownsMutex) { $mutex.Dispose(); exit 0 }

$powerShellPath = Join-Path $PSHOME 'powershell.exe'
$helperProcess = $null
$lastStartAttempt = [DateTime]::MinValue
$lastStart = [DateTime]::MinValue
$lastHealthCheck = [DateTime]::MinValue
$healthy = $false

try {
  while ($true) {
    $now = [DateTime]::UtcNow

    if (($now - $lastHealthCheck).TotalSeconds -ge 5) {
      $lastHealthCheck = $now
      $healthy = $false
      try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 2
        $healthy = [bool]$health.available
      } catch { }

      if ($healthy) {
        # The service may belong to a previous helper instance. Keep using the
        # healthy endpoint instead of starting a duplicate server process.
        if ($helperProcess -and $helperProcess.HasExited) { $helperProcess = $null }
      } elseif ($helperProcess -and -not $helperProcess.HasExited -and ($now - $lastStart).TotalSeconds -ge 12) {
        Stop-Process -Id $helperProcess.Id -Force -ErrorAction SilentlyContinue
        $helperProcess = $null
      }
    }

    if (-not $healthy -and (-not $helperProcess -or $helperProcess.HasExited)) {
      if (($now - $lastStartAttempt).TotalSeconds -ge 5 -and (Test-Path -LiteralPath $HelperPath) -and (Test-Path -LiteralPath $TokenPath)) {
        $lastStartAttempt = $now
        $lastStart = $now
        $helperProcess = Start-Process -FilePath $powerShellPath -WindowStyle Hidden -PassThru -ArgumentList @(
          '-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden',
          '-File', "`"$HelperPath`"", '-TokenPath', "`"$TokenPath`"", '-Port', $Port.ToString()
        )
      }
    }

    Start-Sleep -Seconds 2
  }
} finally {
  if ($helperProcess -and -not $helperProcess.HasExited) { Stop-Process -Id $helperProcess.Id -Force -ErrorAction SilentlyContinue }
  try { $mutex.ReleaseMutex() } catch { }
  $mutex.Dispose()
}
