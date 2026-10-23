$ErrorActionPreference = 'Stop'

$helperScript = Join-Path $PSScriptRoot 'brightness-helper.ps1'
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("ElucidatorConfigTest-" + [guid]::NewGuid().ToString('N'))
$tokenPath = Join-Path $tempRoot 'brightness.token'
$livelyRoot = Join-Path $tempRoot 'Lively Wallpaper'
$projectRoot = Join-Path $livelyRoot 'Library\wallpapers\test-elucidator'
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
    '-File', "`"$script:helperScript`"", '-TokenPath', "`"$script:tokenPath`"", '-Port', $script:port.ToString(),
    '-LivelyRoot', "`"$script:livelyRoot`"", '-SkipLivelyReload'
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
  New-Item -ItemType Directory -Path $projectRoot -Force | Out-Null
  [IO.File]::WriteAllText((Join-Path $projectRoot 'index.html'), '<!doctype html><title>test</title>', [Text.Encoding]::UTF8)
  [IO.File]::WriteAllText((Join-Path $projectRoot 'LivelyInfo.json'), (@{ Title = 'Project Elucidator'; Type = 1; FileName = 'index.html' } | ConvertTo-Json -Compress), [Text.Encoding]::UTF8)
  $layout = @(@{ LivelyScreen = @{ Index = 1 }; LivelyInfoPath = $projectRoot })
  [IO.File]::WriteAllText((Join-Path $livelyRoot 'WallpaperLayout.json'), ($layout | ConvertTo-Json -Depth 4 -Compress), [Text.Encoding]::UTF8)
  Start-TestHelper

  $imageBytes = [byte[]](0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x01,0x02,0x03,0x04)
  $imageData = [Convert]::ToBase64String($imageBytes)
  $settings = @{ enabledWidgets = @(1,3,5); widgetPositions = @{ '1' = @{ x = 12.5; y = 8 } }; widgetScales = @{ '1' = 1.25 }; widgetLayout = 'free'; layoutPresets = @{}; wallpaperFit = 'cover'; animationMirror = $true; visualTheme = 'off'; consoleFrame = $null }
  $requestBody = @{ wallpaperName = 'test-import.png'; wallpaperType = 'image/png'; wallpaperData = $imageData; theme = 'tokyo-ghoul'; settings = $settings; installIntoLively = $true } | ConvertTo-Json -Depth 10 -Compress
  $save = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/startup-config" -Method Post -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json' -Body $requestBody -TimeoutSec 10
  if (-not $save.saved) { throw 'Helper did not confirm durable save.' }

  $read = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/startup-config" -TimeoutSec 10
  if ($read.configuration.theme -ne 'tokyo-ghoul' -or $read.configuration.wallpaperName -ne 'test-import.png' -or $read.configuration.wallpaperData -ne $imageData -or $read.configuration.settings.widgetPositions.'1'.x -ne 12.5) { throw 'Saved configuration did not round-trip.' }
  if (($read | ConvertTo-Json -Depth 5 -Compress).Contains($token)) { throw 'Public configuration response exposed the helper credential.' }
  $manifest = Get-Content -LiteralPath (Join-Path $projectRoot 'elucidator-startup.json') -Raw | ConvertFrom-Json
  $installedImage = [IO.File]::ReadAllBytes((Join-Path $projectRoot $manifest.wallpaperFile))
  $bootstrap = Get-Content -LiteralPath (Join-Path $projectRoot 'elucidator-private-bootstrap.json') -Raw | ConvertFrom-Json
  if ($manifest.theme -ne 'tokyo-ghoul' -or $manifest.settings.enabledWidgets.Count -ne 3 -or [Convert]::ToBase64String($installedImage) -ne $imageData -or $bootstrap.token -ne $token) { throw 'Installed startup files did not round-trip.' }
  $acl = Get-Acl -LiteralPath (Join-Path $projectRoot 'elucidator-private-bootstrap.json')
  if ($acl.Access | Where-Object { $_.IdentityReference -match 'Everyone|Users|Authenticated Users' }) { throw 'Credential bootstrap ACL includes a broad user group.' }
  Write-Output 'PASS: authenticated config save updates the active project manifest, image and private bootstrap.'
  Write-Output 'PASS: public configuration response omits credentials; bootstrap ACL is restricted.'

  Stop-TestHelper
  Start-TestHelper
  $afterRestart = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/startup-config" -TimeoutSec 10
  if ($afterRestart.configuration.theme -ne 'tokyo-ghoul' -or $afterRestart.configuration.wallpaperData -ne $imageData -or $afterRestart.configuration.settings.widgetLayout -ne 'free') { throw 'Configuration did not survive helper restart.' }
  $bootstrapAfterRestart = Get-Content -LiteralPath (Join-Path $projectRoot 'elucidator-private-bootstrap.json') -Raw | ConvertFrom-Json
  if ($bootstrapAfterRestart.token -ne $token) { throw 'Private credential bootstrap did not survive helper restart.' }
  Write-Output 'PASS: configuration survived a helper process restart.'

  $packageSource = Join-Path $tempRoot 'package-source'
  New-Item -ItemType Directory -Path (Join-Path $packageSource 'assets') -Force | Out-Null
  [IO.File]::WriteAllText((Join-Path $packageSource 'index.html'), '<!doctype html><title>updated test build</title>', [Text.Encoding]::UTF8)
  [IO.File]::WriteAllText((Join-Path $packageSource 'assets\app.js'), 'window.updatedBuild = true;', [Text.Encoding]::UTF8)
  [IO.File]::WriteAllText((Join-Path $packageSource 'LivelyInfo.json'), (@{ Title = 'Project Elucidator'; Type = 1; FileName = 'index.html' } | ConvertTo-Json -Compress), [Text.Encoding]::UTF8)
  $updateArchive = Join-Path $tempRoot 'update.zip'
  Compress-Archive -Path (Join-Path $packageSource '*') -DestinationPath $updateArchive -Force
  $updateResult = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/installation-update" -Method Post -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/zip' -InFile $updateArchive -TimeoutSec 15
  if (-not $updateResult.updated -or -not $updateResult.credentialBootstrapSaved -or $updateResult.reloadRequested -or -not (Test-Path -LiteralPath (Join-Path $projectRoot 'elucidator-startup.json')) -or -not (Test-Path -LiteralPath (Join-Path $projectRoot 'elucidator-private-bootstrap.json'))) { throw 'Package update did not preserve local startup files, save the private bootstrap or honor test reload suppression.' }
  if ((Get-Content -LiteralPath (Join-Path $projectRoot 'index.html') -Raw) -notmatch 'updated test build') { throw 'Active project application files were not updated.' }
  Write-Output 'PASS: authenticated package update replaced the active project and preserved private/startup files.'

  $layoutPath = Join-Path $livelyRoot 'WallpaperLayout.json'
  $validLayout = [IO.File]::ReadAllBytes($layoutPath)
  [IO.File]::WriteAllText($layoutPath, '[]', [Text.Encoding]::UTF8)
  $failedUpdate = @{ theme = 'arise'; installIntoLively = $true } | ConvertTo-Json -Compress
  $failureObserved = $false
  try {
    Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/startup-config" -Method Post -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json' -Body $failedUpdate -TimeoutSec 10 | Out-Null
  } catch { $failureObserved = $true }
  [IO.File]::WriteAllBytes($layoutPath, $validLayout)
  if (-not $failureObserved) { throw 'Invalid active installation did not reject the update.' }
  $afterRollback = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/startup-config" -TimeoutSec 10
  if ($afterRollback.configuration.theme -ne 'tokyo-ghoul' -or $afterRollback.configuration.wallpaperData -ne $imageData) { throw 'Failed install attempt replaced the last valid configuration.' }
  Write-Output 'PASS: failed active-install validation leaves the last valid durable configuration intact.'

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
