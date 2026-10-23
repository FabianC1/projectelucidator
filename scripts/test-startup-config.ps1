$ErrorActionPreference = 'Stop'

$helperScript = Join-Path $PSScriptRoot 'brightness-helper.ps1'
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("ElucidatorConfigTest-" + [guid]::NewGuid().ToString('N'))
$tokenPath = Join-Path $tempRoot 'brightness.token'
$portListener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$portListener.Start()
$port = ([Net.IPEndPoint]$portListener.LocalEndpoint).Port
$portListener.Stop()
$randomBytes = New-Object byte[] 32
$generator = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $generator.GetBytes($randomBytes) } finally { $generator.Dispose() }
$token = [Convert]::ToBase64String($randomBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
$process = $null
$powerShell = Join-Path $PSHOME 'powershell.exe'

function Start-TestHelper {
  $script:process = Start-Process -FilePath $script:powerShell -WindowStyle Hidden -PassThru -ArgumentList @(
    '-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden',
    '-File', "`"$script:helperScript`"", '-TokenPath', "`"$script:tokenPath`"", '-Port', $script:port.ToString()
  )
  for ($attempt = 0; $attempt -lt 40; $attempt++) {
    Start-Sleep -Milliseconds 150
    try {
      $health = Invoke-RestMethod -Uri "http://127.0.0.1:$script:port/health" -TimeoutSec 1
      if ($health.available) { return }
    } catch { }
  }
  throw 'Temporary helper did not start.'
}

function Stop-TestHelper {
  if ($script:process -and -not $script:process.HasExited) {
    Stop-Process -Id $script:process.Id -Force
    $script:process.WaitForExit()
  }
  $script:process = $null
}

try {
  New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
  [IO.File]::WriteAllText($tokenPath, $token, [Text.Encoding]::ASCII)
  Start-TestHelper

  $imageBytes = [byte[]](0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x01,0x02,0x03,0x04)
  $imageData = [Convert]::ToBase64String($imageBytes)
  $requestBody = @{ wallpaperName = 'test-import.png'; wallpaperType = 'image/png'; wallpaperData = $imageData; theme = 'tokyo-ghoul' } | ConvertTo-Json -Compress
  $save = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/startup-config" -Method Post -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json' -Body $requestBody -TimeoutSec 10
  if (-not $save.saved) { throw 'Helper did not confirm durable save.' }

  $read = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/startup-config" -TimeoutSec 10
  if ($read.configuration.theme -ne 'tokyo-ghoul' -or $read.configuration.wallpaperName -ne 'test-import.png' -or $read.configuration.wallpaperData -ne $imageData) { throw 'Saved configuration did not round-trip.' }
  if (($read | ConvertTo-Json -Depth 5 -Compress).Contains($token)) { throw 'Public configuration response exposed the helper credential.' }
  Write-Output 'PASS: authenticated configuration save and credential-free read round-trip.'

  Stop-TestHelper
  Start-TestHelper
  $afterRestart = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/startup-config" -TimeoutSec 10
  if ($afterRestart.configuration.theme -ne 'tokyo-ghoul' -or $afterRestart.configuration.wallpaperData -ne $imageData) { throw 'Configuration did not survive helper restart.' }
  Write-Output 'PASS: configuration survived a helper process restart.'

  $configFile = Join-Path (Join-Path $tempRoot 'startup') 'config.json'
  $config = Get-Content -LiteralPath $configFile -Raw | ConvertFrom-Json
  $savedImage = Join-Path (Join-Path (Join-Path $tempRoot 'startup') 'wallpapers') $config.wallpaperFile
  $savedBytes = [IO.File]::ReadAllBytes($savedImage)
  $savedBytes[0] = $savedBytes[0] -bxor 0xff
  [IO.File]::WriteAllBytes($savedImage, $savedBytes)
  $corruptRead = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/startup-config" -TimeoutSec 10
  if ($corruptRead.configuration.theme -ne 'tokyo-ghoul' -or -not $corruptRead.configuration.wallpaperError -or $corruptRead.configuration.wallpaperData) { throw 'Corrupt image was not isolated from the saved theme.' }
  $monitorResponse = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/monitors" -Headers @{ Authorization = "Bearer $token" } -TimeoutSec 10
  if ($null -eq $monitorResponse.monitors) { throw 'Brightness monitor endpoint failed after wallpaper corruption.' }
  Write-Output 'PASS: corrupt image is reported independently; authenticated brightness endpoint remains available.'
} finally {
  Stop-TestHelper
  if (Test-Path -LiteralPath $tempRoot) { Remove-Item -LiteralPath $tempRoot -Recurse -Force }
}
