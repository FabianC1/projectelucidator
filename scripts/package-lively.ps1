$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$distPath = Join-Path $projectRoot 'dist'
$metadataPath = Join-Path $distPath 'LivelyInfo.json'
$archivePath = Join-Path $projectRoot 'ProjectElucidator.Lively.zip'
$helperArchivePath = Join-Path $projectRoot 'ProjectElucidator.BrightnessHelper.zip'

if (-not (Test-Path -LiteralPath $metadataPath -PathType Leaf)) {
  throw 'dist/LivelyInfo.json is missing. Run npm run build first.'
}
if (Test-Path -LiteralPath (Join-Path $distPath 'elucidator-private-bootstrap.json') -PathType Leaf) {
  throw 'The private pairing bootstrap must never be included in a Lively package.'
}

$metadata = Get-Content -LiteralPath $metadataPath -Raw | ConvertFrom-Json
if ($metadata.FileName -ne 'index.html' -or $metadata.Type -ne 1 -or $metadata.Arguments -notmatch '--system-information') {
  throw 'dist/LivelyInfo.json is not configured as the Project Elucidator web wallpaper.'
}

Compress-Archive -Path (Join-Path $distPath '*') -DestinationPath $archivePath -Force
Write-Output "Created $archivePath with LivelyInfo.json at the archive root."

$helperFiles = @(
  (Join-Path $PSScriptRoot 'brightness-helper.ps1'),
  (Join-Path $PSScriptRoot 'brightness-watchdog.ps1'),
  (Join-Path $PSScriptRoot 'install-brightness-helper.ps1'),
  (Join-Path $PSScriptRoot 'update-installed-wallpaper.ps1'),
  (Join-Path $PSScriptRoot 'uninstall-brightness-helper.ps1')
)
foreach ($helperFile in $helperFiles) {
  if (-not (Test-Path -LiteralPath $helperFile -PathType Leaf)) { throw "Brightness helper package is incomplete: $helperFile" }
}
Compress-Archive -Path $helperFiles -DestinationPath $helperArchivePath -Force
Write-Output "Created $helperArchivePath as the separate Windows DDC/CI companion package."
